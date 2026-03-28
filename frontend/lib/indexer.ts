// Reads LOG4 events from ActivityEmitter using our proprietary topic schema.
// topic[0] = activityType (not a keccak256 sig — our enum)
// topic[1] = user address
// topic[2] = tokenId
// topic[3] = partnerId

import { createPublicClient, http, decodeAbiParameters, type Hex } from "viem"
import { base, baseSepolia, liskSepolia } from "wagmi/chains"
import { getContractAddresses, ACTIVITY_TYPE, DEFAULT_CHAIN_ID } from "./contracts"
import type { ActivityEvent } from "@/types"

function getClientAndAddresses(chainId: number) {
    const isLisk = chainId === 4202
    const chain = isLisk ? liskSepolia : (process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia)
    const rpcUrl = isLisk
        ? "https://rpc.sepolia-api.lisk.com"
        : (process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? "https://sepolia.base.org")
    
    const client = createPublicClient({ chain, transport: http(rpcUrl) })
    const ADDRESSES = getContractAddresses(chainId)
    return { client, ADDRESSES }
}

const deploymentBlockCache = new Map<string, bigint>()

// Find the block a contract was deployed using binary search (so we don't need a hardcoded startBlock config)
async function getDeploymentBlock(client: any, address: `0x${string}`): Promise<bigint> {
    const key = `${client.chain?.id}-${address}`
    if (deploymentBlockCache.has(key)) return deploymentBlockCache.get(key)!

    let low = 0n
    let high = await client.getBlockNumber()
    let deployed = high

    // Some chains might fail getting code at block 0, so start low at 1M or let binary search handle it
    while (low <= high) {
        const mid = (low + high) / 2n
        try {
            const code = await client.getBytecode({ address, blockNumber: mid })
            if (code && code !== "0x") {
                deployed = mid
                high = mid - 1n
            } else {
                low = mid + 1n
            }
        } catch {
            low = mid + 1n
        }
    }
    
    deploymentBlockCache.set(key, deployed)
    return deployed
}

// Fetch logs in 10,000 block chunks to avoid public RPC limits ("query exceeds max block range 10000")
async function fetchLogsInChunks(client: any, address: `0x${string}`) {
    const deployedAt = await getDeploymentBlock(client, address)
    const latest = await client.getBlockNumber()
    
    const chunkSize = 10000n
    const chunks = []
    
    for (let from = deployedAt; from <= latest; from += chunkSize) {
        const to = from + chunkSize - 1n
        chunks.push({ fromBlock: from, toBlock: to > latest ? latest : to })
    }

    const allLogs = []
    // Fetch in batches of 5 to not hit rate limits
    for (let i = 0; i < chunks.length; i += 5) {
        const batch = chunks.slice(i, i + 5)
        const results = await Promise.all(batch.map(c => 
            client.getLogs({ address, fromBlock: c.fromBlock, toBlock: c.toBlock })
        ))
        allLogs.push(...results.flat())
    }
    
    return allLogs
}

function padAddress(addr: string): Hex {
    return `0x${addr.replace("0x", "").padStart(64, "0")}` as Hex
}

function padUint256(n: bigint | number): Hex {
    return `0x${BigInt(n).toString(16).padStart(64, "0")}` as Hex
}

// ── Fetch all activity for a wallet (filter by topic[1] = user) ──────────────

export async function fetchUserActivity(
    userAddress: string,
    tokenId?: bigint,
    chainId: number = DEFAULT_CHAIN_ID
): Promise<ActivityEvent[]> {
    const { client, ADDRESSES } = getClientAndAddresses(chainId)
    const logs = await client.getLogs({
        address: ADDRESSES.activityEmitter as `0x${string}`,
        fromBlock: 0n,
        toBlock: "latest",
    })

    return logs
        .filter(log => {
            if (log.topics[1] !== padAddress(userAddress)) return false
            if (tokenId && log.topics[2] !== padUint256(tokenId)) return false
            return true
        })
        .map(parseLog)
}

// ── Fetch activity filtered by type (e.g. only trades) ───────────────────────

export async function fetchActivityByType(
    userAddress: string,
    activityType: "TRADE" | "LEND" | "NFT" | "VOTE" | "CUSTOM",
    chainId: number = DEFAULT_CHAIN_ID
): Promise<ActivityEvent[]> {
    const { client, ADDRESSES } = getClientAndAddresses(chainId)
    const logs = await client.getLogs({
        address: ADDRESSES.activityEmitter as `0x${string}`,
        fromBlock: 0n,
        toBlock: "latest",
    })

    return logs
        .filter(log => {
            if (log.topics[0] !== padUint256(ACTIVITY_TYPE[activityType])) return false
            if (log.topics[1] !== padAddress(userAddress)) return false
            return true
        })
        .map(parseLog)
}

// ── Fetch all activity for a tokenId ─────────────────────────────────────────

export async function fetchTokenActivity(
    tokenId: bigint,
    chainId: number = DEFAULT_CHAIN_ID
): Promise<ActivityEvent[]> {
    const { client, ADDRESSES } = getClientAndAddresses(chainId)
    const logs = await client.getLogs({
        address: ADDRESSES.activityEmitter as `0x${string}`,
        fromBlock: 0n,
        toBlock: "latest",
    })

    return logs
        .filter(log => log.topics[2] === padUint256(tokenId))
        .map(parseLog)
}

// ── Parse raw log into ActivityEvent ─────────────────────────────────────────

function parseLog(log: { transactionHash: Hex | null; blockNumber: bigint | null; topics: readonly Hex[]; data: Hex }): ActivityEvent {
    // topic[0] = activityType (low byte of 32-byte word)
    const activityType = log.topics[0]
        ? parseInt(log.topics[0].slice(-2), 16)
        : 0

    // topic[1] = user address (last 20 bytes)
    const user = log.topics[1]
        ? `0x${log.topics[1].slice(-40)}`
        : "0x"

    // topic[2] = tokenId
    const tokenId = log.topics[2]
        ? BigInt(log.topics[2])
        : 0n

    // topic[3] = partnerId
    const partnerId = log.topics[3]
        ? parseInt(log.topics[3], 16)
        : 0

    // data = abi.encode(value, extra)
    let value = 0n
    let extra = "0x"
    try {
        const [v, e] = decodeAbiParameters(
            [{ type: "uint256" }, { type: "bytes" }],
            log.data
        )
        value = v as bigint
        extra = e as string
    } catch { }

    return {
        txHash: log.transactionHash ?? "0x",
        blockNumber: Number(log.blockNumber ?? 0n),
        timestamp: 0, // enriched by caller via block.timestamp if needed
        activityType,
        user,
        tokenId,
        partnerId,
        value,
        extra,
    }
}

// ── Compute cumulative score from events (mirrors ScoreLib.pointsFor) ────────

const POINTS: Record<number, number> = { 1: 18, 2: 12, 3: 8, 4: 6, 5: 4 }

export function computeScore(events: ActivityEvent[]): number {
    const total = events.reduce((acc, e) => acc + (POINTS[e.activityType] ?? 4), 0)
    return Math.min(total, 1000)
}