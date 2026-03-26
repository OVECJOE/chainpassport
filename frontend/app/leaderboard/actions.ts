"use server"

import { createPublicClient, http, type Address } from "viem"
import { base, baseSepolia } from "wagmi/chains"
import { ADDRESSES } from "@/lib/contracts"
import { PASSPORT_NFT_ABI, VERIFIER_ABI } from "@/lib/abis"
import { type Tier, tierFromNumber } from "@/types"

export interface LeaderboardEntry {
    rank: number
    address: string
    score: number
    tier: Tier
    activities: number
    subscribed: boolean
    mintedAt: number
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    const chain = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? base : baseSepolia
    const client = createPublicClient({ chain, transport: http() })

    try {
        const totalSupply = await client.readContract({
            address: ADDRESSES.passportNFT as Address,
            abi: PASSPORT_NFT_ABI,
            functionName: "totalSupply",
        })

        if (totalSupply === 0n) return []

        const promises = []
        // Loop through all minted tokens
        for (let i = 1n; i <= totalSupply; i++) {
            promises.push((async () => {
                try {
                    const owner = await client.readContract({
                        address: ADDRESSES.passportNFT as Address,
                        abi: PASSPORT_NFT_ABI,
                        functionName: "ownerOf",
                        args: [i],
                    })
                    
                    const verifyResult = await client.readContract({
                        address: ADDRESSES.verifier as Address,
                        abi: VERIFIER_ABI,
                        functionName: "verify",
                        args: [owner],
                    })
                    
                    if (!verifyResult.exists) return null

                    return {
                        address: owner,
                        score: Number(verifyResult.score),
                        tier: tierFromNumber(verifyResult.tier),
                        activities: Number(verifyResult.activityCount),
                        subscribed: verifyResult.subscriptionActive,
                        mintedAt: Number(verifyResult.mintedAt),
                    }
                } catch (e) {
                    return null
                }
            })())
        }

        const results = await Promise.all(promises)
        const valid = results.filter((r): r is NonNullable<typeof r> => r !== null)

        // Sort descending by score
        valid.sort((a, b) => b.score - a.score)

        return valid.map((l, i) => ({
            ...l,
            rank: i + 1
        }))
    } catch (error) {
        console.error("Failed to fetch leaderboard from chain:", error)
        return []
    }
}
