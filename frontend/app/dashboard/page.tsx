"use client"

import { useState, useEffect } from "react"
import { useRouter }    from "next/navigation"
import { useAccount }   from "wagmi"
import { Navbar }       from "@/components/shared/navbar"
import { PassportCard } from "@/components/passport/passport-card"
import { ActivityFeed } from "@/components/passport/activity-feed"
import { usePassport }  from "@/hooks/use-passport"
import { useActivity }  from "@/hooks/use-activity"
import { useRenewSubscription } from "@/hooks/use-mint"
import { useWriteContract } from "wagmi"
import { ADDRESSES } from "@/lib/contracts"
import { PASSPORT_REGISTRY_ABI, PASSPORT_NFT_ABI } from "@/lib/abis"
import { formatEther }  from "viem"

type Tab = "overview" | "activity" | "subscription"

export default function DashboardPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { state, hasPassport, isLoading } = usePassport()
  const [tab, setTab] = useState<Tab>("overview")

  useEffect(() => {
    if (!isConnected) {
      router.replace("/")
    } else if (!isLoading && !hasPassport) {
      router.replace("/mint")
    }
  }, [isConnected, isLoading, hasPassport, router])

  if (!isConnected || isLoading || !hasPassport) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-[#080d0c] relative overflow-hidden">
      <div className="orb w-[400px] h-[400px] -top-32 -left-24" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.14) 0%, transparent 65%)" }} />
      <div className="orb w-[280px] h-[280px] bottom-0 -right-16" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.07) 0%, transparent 65%)" }} />

      <Navbar />

      {/* Tab bar */}
      <div className="flex border-b border-[rgba(93,202,165,0.06)] px-5 relative z-10 overflow-x-auto no-scrollbar">
        {(["overview", "activity", "subscription"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[12px] px-4 py-3 border-b-2 transition-all ${
              tab === t
                ? "text-[#9FE1CB] border-[#5DCAA5]"
                : "text-[rgba(93,202,165,0.3)] border-transparent hover:text-[rgba(93,202,165,0.5)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 relative z-10">
        {tab === "overview" && <OverviewTab state={state} address={address!} />}
        {tab === "activity" && <ActivityTab address={address!} tokenId={state.tokenId ?? undefined} />}
        {tab === "subscription" && <SubscriptionTab state={state} />}
      </div>
    </div>
  )
}

// ── Overview ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OverviewTab({ state, address }: { state: any; address: string }) {
  const { events, isLoading } = useActivity(address, state.tokenId ?? undefined)
  const [copiedLink, setCopiedLink] = useState(false)

  return (
    <div className="space-y-3">
      {state.tokenId && (
        <PassportCard
          tokenId={state.tokenId}
          score={state.score}
          tier={state.tier}
          activityCount={state.activityCount}
          subscriptionActive={state.subscriptionActive}
          mintedAt={state.mintedAt}
        />
      )}

      {/* Live feed */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 section-label">
            <span className="pulse-dot" />
            live feed
          </div>
          <div className="text-[10px] text-[rgba(93,202,165,0.18)]">polls every 30s</div>
        </div>
        <ActivityFeed events={events.slice(0, 5)} isLoading={isLoading} compact />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="btn-mint flex-1 text-[12px] py-2.5"
          onClick={() => {
            const url = `${window.location.origin}/passport/${address}`
            navigator.clipboard.writeText(url)
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2000)
          }}
        >
          {copiedLink ? "Copied!" : "Share passport"}
        </button>
        <button
          className="btn-ghost flex-1 text-[12px] py-2.5"
          onClick={() => window.open(`/passport/${address}`, "_blank")}
        >
          Public view
        </button>
      </div>
    </div>
  )
}

// ── Activity ──────────────────────────────────────────────────────────────────

function ActivityTab({ address, tokenId }: { address: string; tokenId?: bigint }) {
  const { events, summary, isLoading, filter, setFilter, sort, setSort, page, setPage, totalPages } = useActivity(address, tokenId)

  const FILTERS = ["all", "trade", "lend", "nft", "vote"] as const
  const SORTS   = ["newest", "oldest", "highest_pts"] as const

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "trades", value: summary.trades },
          { label: "lends",  value: summary.lends  },
          { label: "nfts",   value: summary.nfts   },
          { label: "votes",  value: summary.votes  },
        ].map(s => (
          <div key={s.label} className="glass-sm p-3 text-center">
            <div className="text-[16px] font-medium text-[#9FE1CB]">{s.value}</div>
            <div className="section-label mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
              filter === f
                ? "bg-[rgba(93,202,165,0.1)] text-[#9FE1CB] border-[rgba(93,202,165,0.3)]"
                : "bg-transparent text-[rgba(93,202,165,0.3)] border-[rgba(93,202,165,0.1)] hover:border-[rgba(93,202,165,0.2)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2">
        <span className="section-label">sort</span>
        {SORTS.map(s => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${
              sort === s
                ? "bg-[rgba(93,202,165,0.07)] text-[rgba(93,202,165,0.6)] border-[rgba(93,202,165,0.18)]"
                : "bg-transparent text-[rgba(93,202,165,0.25)] border-[rgba(93,202,165,0.08)]"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Log note */}
      <div className="text-[10px] text-[rgba(93,202,165,0.18)] font-mono p-2 bg-black/25 rounded-md border border-[rgba(93,202,165,0.06)]">
        eth_getLogs · topic[0]=activityType · topic[2]=tokenId · paginated 20/page
      </div>

      {/* Feed */}
      <div className="glass p-4">
        <ActivityFeed events={events} isLoading={isLoading} showHash />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-[11px] px-3 py-1.5 disabled:opacity-30">← prev</button>
          <span className="text-[11px] text-[rgba(93,202,165,0.3)]">page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost text-[11px] px-3 py-1.5 disabled:opacity-30">next →</button>
        </div>
      )}
    </div>
  )
}

// ── Subscription ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SubscriptionTab({ state }: { state: any }) {
  const { renew, isPending, isSuccess, monthlyFee } = useRenewSubscription()
  const { writeContract, isPending: isActionPending } = useWriteContract()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const now = mounted ? Date.now() : state.expiresAt?.getTime() ?? 0

  // eslint-disable-next-line react-hooks/purity
  const daysLeft = state.expiresAt
    ? Math.max(0, Math.ceil((state.expiresAt.getTime() - now) / 86400000))
    : 0

  const progressPct = state.expiresAt && state.mintedAt
    ? Math.min(100, Math.max(0, 100 - (daysLeft / 30) * 100))
    : 40

  return (
    <div className="space-y-3">
      {/* Current plan */}
      <div className="glass p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[15px] font-medium text-[#9FE1CB]">Monthly plan</div>
          <div className={`flex items-center gap-2 text-[10px] font-semibold px-3 py-1 rounded-full border ${
            state.subscriptionActive
              ? "bg-[rgba(93,202,165,0.1)] text-[#5DCAA5] border-[rgba(93,202,165,0.22)]"
              : "bg-[rgba(216,90,48,0.08)] text-[rgba(216,90,48,0.6)] border-[rgba(216,90,48,0.18)]"
          }`}>
            {state.subscriptionActive && <span className="pulse-dot w-1.5 h-1.5" />}
            {state.subscriptionActive ? "active" : "lapsed"}
          </div>
        </div>

        {[
          { label: "Monthly fee",    value: monthlyFee ? `${formatEther(monthlyFee as bigint)} ETH` : "0.001 ETH" },
          { label: "Expires",        value: state.expiresAt ? state.expiresAt.toLocaleDateString() : "—" },
          { label: "Days remaining", value: daysLeft > 0 ? `${daysLeft} days` : "Expired" },
        ].map(r => (
          <div key={r.label} className="flex justify-between text-[13px] py-2 border-b border-[rgba(93,202,165,0.05)] last:border-none">
            <span className="text-[rgba(93,202,165,0.4)]">{r.label}</span>
            <span className="text-[#9FE1CB]">{r.value}</span>
          </div>
        ))}

        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-[rgba(93,202,165,0.25)] mb-1.5">
            <span>period start</span>
            <span>{daysLeft} days left</span>
            <span>renewal</span>
          </div>
          <div className="score-bar-track">
            <div className="score-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="text-[10px] text-[rgba(93,202,165,0.15)] font-mono p-2 bg-black/25 rounded-md border border-[rgba(93,202,165,0.06)] mt-3">
          Treasury.subscriptionStatus(wallet) · lastPayment + 30 days
        </div>

        <button
          className="btn-mint w-full mt-4 text-[13px]"
          onClick={renew}
          disabled={isPending}
        >
          {isPending ? "Confirming…" : isSuccess ? "Renewed!" : "Renew subscription →"}
        </button>
      </div>

      {/* Score decay preview */}
      <div className="glass-sm p-4">
        <div className="section-label mb-3">score if subscription lapses</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: "1 month",  score: Math.round(state.score * 0.98),   delta: -Math.round(state.score * 0.02),  color: "#9FE1CB"              },
            { label: "3 months", score: Math.round(state.score * 0.941),  delta: -Math.round(state.score * 0.059), color: "#EF9F27"              },
            { label: "6 months", score: Math.round(state.score * 0.886),  delta: -Math.round(state.score * 0.114), color: "rgba(216,90,48,0.7)" },
          ].map(s => (
            <div key={s.label} className="text-center p-2.5 rounded-lg border border-[rgba(93,202,165,0.07)] bg-[rgba(93,202,165,0.02)]">
              <div className="text-[10px] text-[rgba(93,202,165,0.3)] mb-1">{s.label}</div>
              <div className="text-[14px] font-medium" style={{ color: s.color }}>{s.score}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(93,202,165,0.4)" }}>{s.delta} pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="p-4 rounded-2xl bg-[rgba(216,90,48,0.04)] border border-[rgba(216,90,48,0.12)] mt-4">
        <div className="text-[10px] text-[rgba(216,90,48,0.4)] letter-spacing-[1px] uppercase tracking-widest mb-3">danger zone</div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[rgba(216,90,48,0.4)]">Cancel subscription</span>
          <button 
            disabled={isActionPending}
            onClick={() => writeContract({
              address: ADDRESSES.passportRegistry as `0x${string}`,
              abi: PASSPORT_REGISTRY_ABI,
              functionName: "cancelSubscription",
              args: [BigInt(state.tokenId)]
            })}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-[rgba(216,90,48,0.18)] text-[rgba(216,90,48,0.45)] hover:border-[rgba(216,90,48,0.35)] transition-colors disabled:opacity-50"
          >
            Cancel plan
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-[rgba(216,90,48,0.4)]">Burn passport NFT</span>
          <button 
            disabled={isActionPending}
            onClick={() => writeContract({
              address: ADDRESSES.passportNFT as `0x${string}`,
              abi: PASSPORT_NFT_ABI,
              functionName: "burn",
              args: [BigInt(state.tokenId)]
            })}
            className="text-[11px] px-3 py-1.5 rounded-lg border border-[rgba(216,90,48,0.18)] text-[rgba(216,90,48,0.45)] hover:border-[rgba(216,90,48,0.35)] transition-colors disabled:opacity-50"
          >
            Burn NFT
          </button>
        </div>
      </div>
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