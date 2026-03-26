// Reads LOG4 events from ActivityEmitter using our proprietary topic schema.
// topic[0] = activityType (not a keccak256 sig — our enum)
// topic[1] = user address
// topic[2] = tokenId
// topic[3] = partnerId

import { createPublicClient, http, decodeAbiParameters, type Hex } from "viem"
import { base, baseSepolia } from "wagmi/chains"
import { ADDRESSES, ACTIVITY_TYPE, START_BLOCK } from "./contracts"
import type { ActivityEvent } from "@/types"

const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia
const client = createPublicClient({ chain, transport: http() })

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
    fromBlock = START_BLOCK
): Promise<ActivityEvent[]> {
    const logs = await client.getLogs({
        address: ADDRESSES.activityEmitter as `0x${string}`,
        fromBlock,
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
    fromBlock = START_BLOCK
): Promise<ActivityEvent[]> {
    const logs = await client.getLogs({
        address: ADDRESSES.activityEmitter as `0x${string}`,
        fromBlock,
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
    fromBlock = START_BLOCK
): Promise<ActivityEvent[]> {
    const logs = await client.getLogs({
        address: ADDRESSES.activityEmitter as `0x${string}`,
        fromBlock,
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