"use client"

import { useState } from "react"
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useConnections, useChainId } from "wagmi"
import { getContractAddresses, ACTIVITY_TYPE } from "@/lib/contracts"
import { PASSPORT_REGISTRY_ABI } from "@/lib/abis"
import { fetchUserActivity, computeScore } from "@/lib/indexer"
import type { ActivityEvent } from "@/types"

export type MintStep = "idle" | "scanning" | "previewing" | "confirming" | "pending" | "success" | "error"

export function useMint() {
    const connections = useConnections()
    const address = connections[0]?.accounts[0]

    const chainId = useChainId()
    const ADDRESSES = getContractAddresses(chainId)

    const [step, setStep] = useState<MintStep>("idle")
    const [scannedEvents, setScannedEvents] = useState<ActivityEvent[]>([])
    const [previewScore, setPreviewScore] = useState(0)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const { data: mintFee } = useReadContract({
        chainId,
        address: ADDRESSES.passportRegistry as `0x${string}`,
        abi: PASSPORT_REGISTRY_ABI,
        functionName: "minFeeWei",
    })

    const { data: monthlyFee } = useReadContract({
        chainId,
        address: ADDRESSES.passportRegistry as `0x${string}`,
        abi: PASSPORT_REGISTRY_ABI,
        functionName: "monthlyFeeWei",
    })

    const { writeContractAsync, data: txHash, isPending } = useWriteContract()

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash: txHash,
    })

    // Step 1: scan wallet activity via eth_getLogs
    async function scan() {
        if (!address) return
        setStep("scanning")
        setErrorMsg(null)
        try {
            const events = await fetchUserActivity(address, undefined, chainId)
            setScannedEvents(events)
            setPreviewScore(computeScore(events))
            setStep("previewing")
        } catch (e: unknown) {
            setErrorMsg(e instanceof Error ? e.message : "Scan failed")
            setStep("error")
        }
    }

    // Step 2: submit mint tx
    async function mint() {
        if (!address) {
            setErrorMsg("Wallet disconnected during minting.")
            setStep("error")
            return
        }
        if (mintFee === undefined) {
            setErrorMsg("Could not fetch the mint fee. Please ensure your wallet is on a supported network.")
            setStep("error")
            return
        }
        setStep("confirming")
        try {
            await writeContractAsync({
                chainId,
                address: ADDRESSES.passportRegistry as `0x${string}`,
                abi: PASSPORT_REGISTRY_ABI,
                functionName: "mint",
                value: mintFee as bigint,
            })
            setStep("pending")
        } catch (e: unknown) {
            setErrorMsg(e instanceof Error ? e.message : "Mint failed")
            setStep("error")
        }
    }

    function reset() {
        setStep("idle")
        setScannedEvents([])
        setPreviewScore(0)
        setErrorMsg(null)
    }

    // Count events per protocol/type for the scan UI
    const scanBreakdown = {
        trades: scannedEvents.filter(e => e.activityType === ACTIVITY_TYPE.TRADE).length,
        lends: scannedEvents.filter(e => e.activityType === ACTIVITY_TYPE.LEND).length,
        nfts: scannedEvents.filter(e => e.activityType === ACTIVITY_TYPE.NFT).length,
        votes: scannedEvents.filter(e => e.activityType === ACTIVITY_TYPE.VOTE).length,
    }

    return {
        step: isSuccess ? "success" as MintStep : step,
        scan,
        mint,
        reset,
        skipScan: () => setStep("confirming"),
        scannedEvents,
        previewScore,
        scanBreakdown,
        txHash,
        isPending: isPending || isConfirming,
        isSuccess,
        errorMsg,
        mintFee,
        monthlyFee
    }
}

// ── Renew subscription ────────────────────────────────────────────────────────

export function useRenewSubscription() {
    const chainId = useChainId()
    const ADDRESSES = getContractAddresses(chainId)

    const { writeContractAsync, data: txHash, isPending } = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

    const { data: monthlyFee } = useReadContract({
        chainId,
        address: ADDRESSES.passportRegistry as `0x${string}`,
        abi: PASSPORT_REGISTRY_ABI,
        functionName: "monthlyFeeWei",
    })

    async function renew() {
        if (monthlyFee === undefined) return
        try {
            await writeContractAsync({
                chainId,
                address: ADDRESSES.passportRegistry as `0x${string}`,
                abi: PASSPORT_REGISTRY_ABI,
                functionName: "renewSubscription",
                value: monthlyFee as bigint,
            })
        } catch(e) {
            console.error("Renew failed", e)
        }
    }

    return { renew, txHash, isPending: isPending || isConfirming, isSuccess, monthlyFee }
}