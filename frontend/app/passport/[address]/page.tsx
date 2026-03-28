"use client"
// src/app/passport/[address]/page.tsx
import { use, useState, useEffect }     from "react"
import Link                  from "next/link"
import { usePublicPassport } from "@/hooks/use-passport"
import { useActivity }       from "@/hooks/use-activity"
import { tierColor, tierFromNumber } from "@/types"
import { ActivityFeed }      from "@/components/passport/activity-feed"

export default function PublicPassportPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params)
  const { result, isLoading } = usePublicPassport(address)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const { events, isLoading: loadingEvents } = useActivity(
    result?.exists ? address : undefined,
    result?.tokenId
  )

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (isLoading) return <LoadingScreen />

  if (!result?.exists) return <NotFound address={address} />

  const score  = Number(result.score)
  const tier   = tierFromNumber(result.tier)
  const colors = tierColor(tier)
  const pct    = Math.min(score / 1000, 1)

  const expiresAt = result.expiresAt ? new Date(Number(result.expiresAt) * 1000) : null
  const mintedAt  = result.mintedAt  ? new Date(Number(result.mintedAt)  * 1000) : null

  return (
    <div className="min-h-screen bg-[#080d0c] relative overflow-hidden">
      {/* Orbs */}
      <div className="orb w-[450px] h-[450px] -top-40 left-1/2 -translate-x-1/2" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.13) 0%, transparent 65%)" }} />
      <div className="orb w-[250px] h-[250px] bottom-10 -right-16" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.06) 0%, transparent 65%)" }} />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 relative z-20">
        <Link href="/" className="text-[15px] font-semibold text-[#9FE1CB] tracking-tight">
          chain<span className="text-[rgba(93,202,165,0.35)] font-light">passport</span>
        </Link>
        <Link href="/mint" className="text-[12px] text-[#9FE1CB] bg-[rgba(93,202,165,0.08)] border border-[rgba(93,202,165,0.2)] rounded-full px-4 py-1.5 hover:bg-[rgba(93,202,165,0.14)] transition-all">
          Mint yours →
        </Link>
      </nav>

      <div className="max-w-md mx-auto px-5 py-4 relative z-10">

        {/* Hero */}
        <div className="text-center mb-5">
          {/* NFT display */}
          <div className="w-28 h-28 rounded-2xl mx-auto mb-4 flex flex-col items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.18), rgba(93,202,165,0.06))", border: "1px solid rgba(93,202,165,0.25)" }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="4" width="28" height="28" rx="8" stroke="#5DCAA5" strokeWidth="1"/>
              <path d="M11 18l5 5L25 13" stroke="#5DCAA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="text-[9px] font-bold tracking-wide" style={{ color: colors.text }}>{tier}</div>
          </div>

          <div className="text-[12px] text-[rgba(93,202,165,0.4)] font-mono mb-1">
            {address.slice(0,6)}…{address.slice(-4)}
          </div>
          <div className="text-[22px] font-medium text-[#9FE1CB] tracking-tight mb-1">Web3 Passport</div>
          {mintedAt && (
            <div className="text-[11px] text-[rgba(93,202,165,0.22)]">
              member since {mintedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="glass p-5 mb-3">
          <div className="flex items-end gap-2 justify-center mb-2">
            <span className="text-[64px] font-light text-[#9FE1CB] tracking-[-4px] leading-none">{score}</span>
            <span className="text-[16px] text-[rgba(93,202,165,0.25)] mb-2">/ 1000</span>
          </div>
          <div className="score-bar-track mb-3">
            <div className="score-bar-fill" style={{ width: `${pct * 100}%` }} />
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="tier-pill" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
              {tier}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-[rgba(93,202,165,0.35)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5]" />
              on-chain verified
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "activities", value: result.activityCount.toString() },
            // eslint-disable-next-line react-hooks/purity
            { label: "on-chain",   value: mintedAt ? `${Math.floor(((mounted ? Date.now() : mintedAt.getTime()) - mintedAt.getTime()) / 2592000000)}mo` : "—" },
            { label: "passport #", value: result.tokenId.toString() },
          ].map(s => (
            <div key={s.label} className="glass-sm p-3 text-center">
              <div className="text-[18px] font-medium text-[#9FE1CB]">{s.value}</div>
              <div className="section-label mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Activity */}
        <div className="glass p-4 mb-3">
          <div className="section-label mb-3">recent verified activity</div>
          <ActivityFeed events={events.slice(0, 5)} isLoading={loadingEvents} compact />
        </div>

        {/* Subscription status */}
        <div className="glass-sm px-4 py-3 flex items-center justify-between mb-3">
          <span className="text-[12px] text-[rgba(93,202,165,0.4)]">Subscription</span>
          <span className={`text-[12px] font-medium ${result.subscriptionActive ? "text-[#5DCAA5]" : "text-[rgba(216,90,48,0.6)]"}`}>
            {result.subscriptionActive ? "active — score live" : "lapsed — score decaying"}
          </span>
        </div>

        {/* Share CTA */}
        <div className="glass p-4">
          <div className="section-label mb-3">share this passport</div>
          <div className="text-[11px] text-[rgba(93,202,165,0.3)] font-mono bg-black/30 rounded-lg px-3 py-2 border border-[rgba(93,202,165,0.08)] mb-3 truncate">
            chainpassport.xyz/{address.slice(0,6)}…{address.slice(-4)}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost flex-1 text-[12px] py-2.5" onClick={copyLink}>
              {copied ? "Copied!" : "Copy link"}
            </button>
            <Link href="/mint" className="btn-mint flex-1 text-center text-[12px] py-2.5">
              Mint yours
            </Link>
          </div>
        </div>

        <div className="text-center text-[10px] text-[rgba(93,202,165,0.18)] mt-4 tracking-wide">
          read-only · powered by chainpassport.xyz · on-chain SVG · ERC-721
        </div>
      </div>
    </div>
  )
}

function NotFound({ address }: { address: string }) {
  return (
    <div className="min-h-screen bg-[#080d0c] flex flex-col items-center justify-center gap-4">
      <div className="text-[15px] text-[rgba(93,202,165,0.4)]">No passport found for {address.slice(0,10)}…</div>
      <Link href="/mint" className="btn-mint">Mint one →</Link>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#080d0c] flex items-center justify-center">
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-[#5DCAA5]"
            style={{ animation: `pulse-anim 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  )
}