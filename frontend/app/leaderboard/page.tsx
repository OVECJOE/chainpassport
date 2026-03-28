"use client"
import { useState, useEffect } from "react"
import Link            from "next/link"
import { Navbar }      from "@/components/shared/navbar"
import { useConnections, useChainId }  from "wagmi"
import { tierColor, type Tier } from "@/types"
import { cn }          from "@/lib/utils"
import { getLeaderboard, type LeaderboardEntry } from "./actions"

type Filter = "all" | "Gold" | "Silver" | "Bronze"

export default function LeaderboardPage() {
    const connections = useConnections()
    const address = connections[0]?.accounts[0]
    const chainId = useChainId()
    const [filter, setFilter] = useState<Filter>("all")
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        setIsLoading(true)
        getLeaderboard(chainId).then(data => {
            setLeaders(data)
            setIsLoading(false)
        })
    }, [chainId])

    const shown = filter === "all"
        ? leaders
        : leaders.filter(l => l.tier === filter)

    const myEntry = address
        ? leaders.find(l => l.address.toLowerCase() === address.toLowerCase())
        : null

    if (!mounted) return null

    return (
        <div className="min-h-screen bg-[#080d0c] relative overflow-hidden">
            <div className="orb w-[400px] h-[400px] -top-32 left-1/2 -translate-x-1/2"
                style={{ background: "radial-gradient(circle, rgba(29,158,117,0.11) 0%, transparent 65%)" }} />
            <div className="orb w-[260px] h-[260px] bottom-10 -right-16"
                style={{ background: "radial-gradient(circle, rgba(29,158,117,0.06) 0%, transparent 65%)" }} />

            <Navbar />

            <div className="max-w-2xl mx-auto px-5 py-8 relative z-10">

                {/* Header */}
                <div className="mb-6">
                    <div className="section-label mb-2">all-time rankings</div>
                    <h1 className="text-[26px] font-light text-[#9FE1CB] tracking-tight">Leaderboard</h1>
                    <p className="text-[12px] text-[rgba(93,202,165,0.35)] mt-1 leading-relaxed">
                        Ranked by live passport score. Scores decay without an active subscription — only active wallets stay ranked.
                    </p>
                </div>

                {/* Top 3 podium */}
                {isLoading ? (
                    <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-[#5DCAA5] border-t-transparent animate-spin" /></div>
                ) : (
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {leaders.slice(0, 3).map((l, i) => {
                            const c = tierColor(l.tier)
                            const sizes = ["order-2 scale-100", "order-1 scale-[1.06]", "order-3 scale-100"]
                            const medals = ["🥇", "🥈", "🥉"]
                            return (
                                <Link
                                    key={l.address}
                                    href={`/passport/${l.address}`}
                                    className={cn("glass p-4 text-center transition-opacity hover:opacity-80", sizes[i])}
                                >
                                    <div className="text-lg mb-1">{medals[i]}</div>
                                    <div className="text-[11px] font-mono text-[rgba(93,202,165,0.45)] mb-1">{l.address.slice(0, 6)}…{l.address.slice(-4)}</div>
                                    <div className="text-[28px] font-light text-[#9FE1CB] tracking-tight leading-none mb-1">{l.score}</div>
                                    <div
                                        className="tier-pill mx-auto"
                                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                                    >
                                        {l.tier}
                                    </div>
                                    <div className="text-[10px] text-[rgba(93,202,165,0.22)] mt-2">{l.activities} activities</div>
                                </Link>
                            )
                        })}
                    </div>
                )}

                {/* Filter row */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                        {(["all", "Gold", "Silver", "Bronze"] as Filter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn("filter-pill", filter === f && "active")}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="text-[10px] text-[rgba(93,202,165,0.22)]">
                        {shown.length} wallets
                    </div>
                </div>

                {/* My rank banner */}
                {address && !myEntry && (
                    <div className="glass-sm px-4 py-3 flex items-center justify-between mb-4">
                        <span className="text-[12px] text-[rgba(93,202,165,0.4)]">You&apos;re not on the leaderboard yet</span>
                        <Link href="/mint" className="btn-mint text-[11px] px-4 py-2">Mint passport →</Link>
                    </div>
                )}

                {/* Table */}
                <div className="glass overflow-hidden">
                    {/* Header row */}
                    <div className="grid grid-cols-[40px_1fr_80px_60px_80px] gap-3 px-4 py-3 border-b border-[rgba(93,202,165,0.07)]">
                        {["#", "wallet", "score", "tier", "status"].map(h => (
                            <div key={h} className="section-label">{h}</div>
                        ))}
                    </div>

                    {/* Rows */}
                    {shown.map((l, i) => {
                        const c = tierColor(l.tier)
                        const isMe = address && l.address.toLowerCase() === address.toLowerCase()
                        return (
                            <Link
                                key={l.rank}
                                href={`/passport/${l.address}`}
                                className={cn(
                                    "grid grid-cols-[40px_1fr_80px_60px_80px] gap-3 px-4 py-3 items-center",
                                    "border-b border-[rgba(93,202,165,0.05)] last:border-none",
                                    "hover:bg-[rgba(93,202,165,0.03)] transition-colors",
                                    isMe && "bg-[rgba(93,202,165,0.06)]"
                                )}
                            >
                                {/* Rank */}
                                <div className={cn(
                                    "text-[13px] font-medium",
                                    l.rank <= 3 ? "text-[#9FE1CB]" : "text-[rgba(93,202,165,0.35)]"
                                )}>
                                    {l.rank}
                                </div>

                                {/* Address */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="text-[12px] font-mono text-[rgba(255,255,255,0.5)] truncate">
                                        {l.address.slice(0, 6)}…{l.address.slice(-4)}
                                    </div>
                                    {isMe && (
                                        <span className="text-[9px] bg-[rgba(93,202,165,0.1)] text-[#5DCAA5] border border-[rgba(93,202,165,0.2)] rounded-full px-1.5 py-0.5 shrink-0">
                                            you
                                        </span>
                                    )}
                                </div>

                                {/* Score */}
                                <div className="text-[14px] font-medium text-[#9FE1CB]">{l.score}</div>

                                {/* Tier */}
                                <div>
                                    <span
                                        className="tier-pill"
                                        style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                                    >
                                        {l.tier}
                                    </span>
                                </div>

                                {/* Sub status */}
                                <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        l.subscribed ? "bg-[#5DCAA5]" : "bg-[rgba(216,90,48,0.5)]"
                                    )} />
                                    <span className={cn(
                                        "text-[10px]",
                                        l.subscribed ? "text-[rgba(93,202,165,0.4)]" : "text-[rgba(216,90,48,0.4)]"
                                    )}>
                                        {l.subscribed ? "active" : "lapsed"}
                                    </span>
                                </div>
                            </Link>
                        )
                    })}
                </div>

                <div className="mt-4 code-note">
                    live on-chain leaderboard · reads PassportMinted events & verifiable state
                </div>
            </div>
        </div>
    )
}