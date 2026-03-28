"use client"

import { config } from "@/lib/wagmi"
type ChainId = typeof config.chains[number]["id"]

import { useReadContract, useReadContracts, useConnections, useChainId } from "wagmi"
import { getContractAddresses, DEFAULT_CHAIN_ID } from "@/lib/contracts"
import { PASSPORT_REGISTRY_ABI, SCORE_ENGINE_ABI, VERIFIER_ABI } from "@/lib/abis"
import { tierFromNumber, type PassportState, type Tier } from "@/types"

export function usePassport(overrideAddress?: string) {
    const connections = useConnections()
    const connectedAddress = connections[0]?.accounts[0]
    const walletChainId = useChainId()
    const address = overrideAddress ?? connectedAddress
    // useChainId() provides the current chain
    const chainId = (walletChainId ?? DEFAULT_CHAIN_ID) as ChainId
    const ADDRESSES = getContractAddresses(chainId)

    // 1. Get tokenId
    const { data: tokenId, isLoading: loadingTokenId } = useReadContract({
        chainId,
        address: ADDRESSES.passportRegistry as `0x${string}`,
        abi: PASSPORT_REGISTRY_ABI,
        functionName: "passportOf",
        args: [address as `0x${string}`],
        query: { enabled: !!address },
    })

    const hasPassport = tokenId != null && tokenId > 0n

    // 2. Once we have tokenId, fetch score + activity count
    const { data: scoreData, isLoading: loadingScore } = useReadContracts({
        contracts: [
            {
                chainId,
                address: ADDRESSES.scoreEngine as `0x${string}`,
                abi: SCORE_ENGINE_ABI,
                functionName: "currentScore",
                args: [tokenId!],
            },
            {
                chainId,
                address: ADDRESSES.scoreEngine as `0x${string}`,
                abi: SCORE_ENGINE_ABI,
                functionName: "currentTier",
                args: [tokenId!],
            },
            {
                chainId,
                address: ADDRESSES.scoreEngine as `0x${string}`,
                abi: SCORE_ENGINE_ABI,
                functionName: "activityCount",
                args: [tokenId!],
            },
        ],
        query: { enabled: hasPassport },
    })

    // 3. Subscription state from registry
    const { data: passportData, isLoading: loadingPassportData } = useReadContract({
        chainId,
        address: ADDRESSES.passportRegistry as `0x${string}`,
        abi: PASSPORT_REGISTRY_ABI,
        functionName: "passportData",
        args: [address as `0x${string}`],
        query: { enabled: !!address && hasPassport },
    })

    // 4. Subscription active flag
    const { data: subscriptionActive } = useReadContract({
        chainId,
        address: ADDRESSES.passportRegistry as `0x${string}`,
        abi: PASSPORT_REGISTRY_ABI,
        functionName: "isSubscriptionActive",
        args: [address as `0x${string}`],
        query: { enabled: !!address && hasPassport },
    })

    const score = scoreData?.[0]?.result != null ? Number(scoreData[0].result) : 0
    const tierNum = scoreData?.[1]?.result != null ? Number(scoreData[1].result) : 0
    const activityCount = scoreData?.[2]?.result != null ? Number(scoreData[2].result) : 0
    const tier: Tier = tierFromNumber(tierNum)

    const expiresAt = passportData?.expiresAt
        ? new Date(Number(passportData.expiresAt) * 1000)
        : null

    const mintedAt = passportData?.mintedAt
        ? new Date(Number(passportData.mintedAt) * 1000)
        : null

    const state: PassportState = {
        tokenId: tokenId ?? null,
        score,
        tier,
        activityCount,
        subscriptionActive: subscriptionActive ?? false,
        expiresAt,
        mintedAt,
    }

    return {
        state,
        hasPassport,
        isLoading: loadingTokenId || loadingScore || loadingPassportData,
        passportData,
    }
}

// ── Hook for public passport page (any wallet address) ───────────────────────

export function usePublicPassport(address: string) {
    const walletChainId = useChainId()
    const chainId = (walletChainId ?? DEFAULT_CHAIN_ID) as ChainId
    const ADDRESSES = getContractAddresses(chainId)

    const { data: result, isLoading } = useReadContract({
        chainId,
        address: ADDRESSES.verifier as `0x${string}`,
        abi: VERIFIER_ABI,
        functionName: "verify",
        args: [address as `0x${string}`],
        query: { enabled: !!address && address.startsWith("0x") },
    })

    return { result, isLoading }
}