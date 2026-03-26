"use client"

import { type Tier, tierColor } from "@/types"

interface Props {
    tokenId: bigint
    score: number
    tier: Tier
    activityCount: number
    subscriptionActive?: boolean
    mintedAt?: Date | null
    compact?: boolean
}

export function PassportCard({ tokenId, score, tier, activityCount, subscriptionActive, mintedAt, compact }: Props) {
    const pct = Math.min(score / 1000, 1)
    const colors = tierColor(tier)
    const nextTierPts = tier === "Gold" ? 0 : tier === "Silver" ? 850 - score : tier === "Bronze" ? 550 - score : 250 - score

    return (
        <div className="glass p-5">
            {/* Header row */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <div className="section-label mb-1">passport #{tokenId.toString()}</div>
                    <div className="text-[22px] font-medium text-[#9FE1CB] tracking-tight leading-none">
                        Web3 Passport
                    </div>
                </div>
                {/* NFT miniature */}
                <div className="w-12 h-12 rounded-xl bg-[rgba(93,202,165,0.08)] border border-[rgba(93,202,165,0.2)] flex flex-col items-center justify-center gap-1">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="3" y="3" width="14" height="14" rx="4" stroke="#5DCAA5" strokeWidth="1" />
                        <path d="M6 10l3 3 5-5" stroke="#5DCAA5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div style={{ color: colors.text }} className="text-[8px] font-bold tracking-wide">{tier}</div>
                </div>
            </div>

            {/* Score */}
            <div className="flex items-end gap-2 mb-2">
                <span className="text-[52px] font-light text-[#9FE1CB] tracking-[-3px] leading-none">{score}</span>
                <span className="text-sm text-[rgba(93,202,165,0.3)] mb-1">/ 1000</span>
            </div>

            {/* Bar */}
            <div className="score-bar-track mb-1.5">
                <div className="score-bar-fill" style={{ width: `${pct * 100}%` }} />
            </div>

            {/* Tier + next */}
            <div className="flex items-center justify-between mb-5">
                <span
                    className="tier-pill"
                    style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                >
                    {tier}
                </span>
                {tier !== "Gold" && nextTierPts > 0 && (
                    <span className="text-[10px] text-[rgba(93,202,165,0.25)]">{nextTierPts} pts to next tier</span>
                )}
            </div>

            {!compact && (
                <>
                    <div className="border-t border-[rgba(93,202,165,0.07)] pt-4">
                        <div className="grid grid-cols-3 gap-2">
                            <StatPill label="activities" value={activityCount.toString()} />
                            <StatPill label="subscription" value={subscriptionActive ? "active" : "lapsed"}
                                valueClass={subscriptionActive ? "text-[#5DCAA5]" : "text-[rgba(216,90,48,0.7)]"} />
                            {mintedAt && (
                                <StatPill label="member since" value={mintedAt.toLocaleDateString("en-US", { month: "short", year: "numeric" })} />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function StatPill({ label, value, valueClass = "text-[#9FE1CB]" }: { label: string; value: string; valueClass?: string }) {
    return (
        <div className="glass-sm p-3 text-center">
            <div className={`text-[15px] font-medium ${valueClass}`}>{value}</div>
            <div className="text-[10px] text-[rgba(93,202,165,0.3)] mt-0.5 tracking-[0.5px]">{label}</div>
        </div>
    )
}
