"use client"
// src/app/mint/page.tsx
import { useRouter } from "next/navigation"
import { useConnections, useChainId, useChains } from "wagmi"
import { formatEther } from "viem"
import { Navbar } from "@/components/shared/navbar"
import { useMint } from "@/hooks/use-mint"

const STEPS = ["Connect", "Scan", "Preview", "Mint"]

function stepIndex(step: string): number {
  return { idle: 0, scanning: 1, previewing: 2, confirming: 3, pending: 3, success: 4, error: 1 }[step] ?? 0
}

export default function MintPage() {
  const router = useRouter()
  const connections = useConnections()
  const address = connections[0]?.accounts[0]
  const isConnected = connections.length > 0
  
  const chainId = useChainId()
  const chains = useChains()
  const chain = chains.find(c => c.id === chainId)

  const { step, scan, mint, skipScan, previewScore, scanBreakdown, isPending, isSuccess, errorMsg, mintFee } = useMint()

  const si = stepIndex(step)

  if (isSuccess) {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="min-h-screen bg-[#080d0c] relative overflow-hidden">
      <div className="orb w-[400px] h-[400px] -top-36 -right-24" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.12) 0%, transparent 65%)" }} />
      <div className="orb w-[300px] h-[300px] bottom-[-80px] -left-14" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.07) 0%, transparent 65%)" }} />

      <Navbar />

      <div className="max-w-md mx-auto px-5 py-8 relative z-10">
        {/* Step track */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${i < si ? "bg-[rgba(93,202,165,0.2)] text-[#5DCAA5] border border-[rgba(93,202,165,0.4)]"
                  : i === si ? "bg-[rgba(93,202,165,0.15)] text-[#9FE1CB] border border-[rgba(93,202,165,0.5)]"
                    : "bg-[rgba(93,202,165,0.04)] text-[rgba(93,202,165,0.25)] border border-[rgba(93,202,165,0.1)]"
                  }`}>
                  {i < si ? "✓" : i + 1}
                </div>
                <span className={`text-[11px] whitespace-nowrap ${i < si ? "text-[rgba(93,202,165,0.5)]"
                  : i === si ? "text-[#9FE1CB]"
                    : "text-[rgba(93,202,165,0.2)]"
                  }`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px bg-[rgba(93,202,165,0.1)] mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Not connected */}
        {!isConnected && (
          <div className="glass p-6 text-center">
            <div className="text-[15px] font-medium text-[#9FE1CB] mb-2">Connect your wallet</div>
            <div className="text-[13px] text-[rgba(93,202,165,0.4)] mb-6">Connect to scan your on-chain activity and mint your passport.</div>
            <button className="btn-mint w-full">Connect wallet</button>
          </div>
        )}

        {/* Step 1: Scan */}
        {isConnected && (step === "idle" || step === "scanning") && (
          <div className="glass p-6">
            <div className="section-label mb-4">scanning your wallet</div>

            <div className="glass-sm px-4 py-3 flex items-center justify-between mb-5">
              <div className="text-[13px] text-[#9FE1CB] font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</div>
              <div className="text-[10px] text-[rgba(93,202,165,0.4)] bg-[rgba(93,202,165,0.07)] border border-[rgba(93,202,165,0.14)] rounded-full px-2.5 py-0.5">{chain?.name?.split(" ")?.[0] ?? "Unknown"}</div>
            </div>

            {step === "scanning" ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#5DCAA5]"
                      style={{ animation: `pulse-anim 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                  <span className="text-[12px] text-[rgba(93,202,165,0.4)]">reading LOG4 events…</span>
                </div>
                <div className="text-[10px] text-[rgba(93,202,165,0.18)] font-mono p-2 bg-black/30 rounded-md border border-[rgba(93,202,165,0.06)]">
                  eth_getLogs · topic[1] = {address?.slice(0, 10)}… · blocks 0 → latest
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[13px] text-[rgba(93,202,165,0.4)] mb-5 leading-relaxed">
                  We&apos;ll scan your wallet&apos;s on-chain history across Uniswap, Aave, OpenSea, and governance contracts to build your score.
                </div>
                <button className="btn-mint w-full" onClick={scan}>
                  Scan my wallet
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "previewing" && (
          <div className="glass p-6">
            <div className="section-label mb-4">your passport preview</div>

            <div className="text-center py-4 mb-4">
              <div className="text-[56px] font-light text-[#9FE1CB] tracking-[-3px] leading-none">{previewScore}</div>
              <div className="text-[12px] text-[rgba(93,202,165,0.3)] mt-1 tracking-wider">PASSPORT SCORE</div>
            </div>

            {/* Tier pills */}
            <div className="flex justify-center gap-2 mb-5">
              {[
                { label: "Bronze", min: 250 },
                { label: "Silver", min: 550 },
                { label: "Gold", min: 850 },
              ].map(t => {
                const active = (t.label === "Gold" && previewScore >= 850)
                  || (t.label === "Silver" && previewScore >= 550 && previewScore < 850)
                  || (t.label === "Bronze" && previewScore >= 250 && previewScore < 550)
                return (
                  <div key={t.label} className={`px-4 py-1.5 rounded-full text-[11px] font-semibold transition-all ${active ? "bg-[rgba(93,202,165,0.12)] text-[#5DCAA5] border border-[rgba(93,202,165,0.3)]"
                    : "bg-[rgba(93,202,165,0.03)] text-[rgba(93,202,165,0.2)] border border-[rgba(93,202,165,0.07)]"
                    }`}>{t.label}</div>
                )
              })}
            </div>

            {/* Breakdown */}
            <div className="glass-sm p-4 mb-5 space-y-3">
              {[
                { label: "Trades", count: scanBreakdown.trades, color: "#5DCAA5", pts: scanBreakdown.trades * 18 },
                { label: "Lends", count: scanBreakdown.lends, color: "rgba(93,202,165,0.5)", pts: scanBreakdown.lends * 12 },
                { label: "NFT buys", count: scanBreakdown.nfts, color: "rgba(93,202,165,0.3)", pts: scanBreakdown.nfts * 8 },
                { label: "DAO votes", count: scanBreakdown.votes, color: "rgba(93,202,165,0.18)", pts: scanBreakdown.votes * 6 },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                    <span className="text-[rgba(255,255,255,0.5)]">{r.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[rgba(93,202,165,0.5)]">{r.count} found</span>
                    <span className="text-[#5DCAA5] font-medium">+{r.pts}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-[rgba(93,202,165,0.18)] font-mono p-2 bg-black/30 rounded-md border border-[rgba(93,202,165,0.06)] mb-4">
              ScoreEngine.previewScore({address?.slice(0, 10)}…) · view call · no gas
            </div>

            <button className="btn-mint w-full" onClick={mint}>Mint this passport →</button>
          </div>
        )}

        {/* Step 3: Confirm */}
        {(step === "confirming" || step === "pending") && (
          <div className="glass p-6">
            <div className="section-label mb-4">confirm mint</div>

            <div className="space-y-2 mb-5">
              {[
                { label: "Passport NFT", value: "Free (beta)" },
                { label: "Live feed subscription", value: "First 30 days free" },
                { label: "Monthly after trial", value: `${mintFee !== undefined ? formatEther(mintFee as bigint) : "0.001"} ETH` },
                { label: "Gas estimate", value: "~$0.04" },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-[13px] py-1.5 border-b border-[rgba(93,202,165,0.05)] last:border-none">
                  <span className="text-[rgba(93,202,165,0.4)]">{r.label}</span>
                  <span className="text-[#9FE1CB]">{r.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-[14px] pt-2 border-t border-[rgba(93,202,165,0.1)]">
                <span className="text-[rgba(93,202,165,0.6)]">Due today</span>
                <span className="text-[#9FE1CB] font-medium">{mintFee !== undefined ? formatEther(mintFee as bigint) : "0.002"} ETH</span>
              </div>
            </div>

            <div className="text-[10px] text-[rgba(93,202,165,0.18)] font-mono p-2 bg-black/30 rounded-md border border-[rgba(93,202,165,0.06)] mb-4">
              PassportRegistry.mint() · soulbound ERC-721
            </div>

            <button
              className="btn-mint w-full disabled:opacity-40"
              disabled={isPending}
              onClick={mint}
            >
              {isPending ? "Confirming…" : "Confirm in wallet →"}
            </button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="glass p-6 border border-[rgba(216,90,48,0.2)] bg-[rgba(216,90,48,0.02)]">
            <div className="w-12 h-12 rounded-full bg-[rgba(216,90,48,0.1)] flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D85A30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                <path d="M10.5 7.5v6" />
                <path d="M10.5 16.5h.008v.008H10.5v-.008Z" />
              </svg>
            </div>
            <div className="text-[15px] font-medium text-[#D85A30] text-center mb-2">Scan Failed</div>
            <div className="text-[12px] text-[rgba(216,90,48,0.7)] text-center mb-6 leading-relaxed bg-[rgba(216,90,48,0.05)] p-3 rounded-md font-mono break-words overflow-y-auto max-h-32 custom-scrollbar border border-[rgba(216,90,48,0.1)]">
              {errorMsg?.includes("10,000 range") || errorMsg?.includes("limit") 
                ? "RPC node rate limit exceeded. Please try again later."
                : errorMsg?.slice(0, 150) + (errorMsg && errorMsg.length > 150 ? "..." : "")}
            </div>
            <div className="flex gap-2 w-full">
              <button className="flex-1 text-[13px] font-medium px-4 py-3 rounded-full border border-[rgba(216,90,48,0.3)] text-[#D85A30] hover:bg-[rgba(216,90,48,0.08)] transition-all" onClick={scan}>Retry scan</button>
              <button className="flex-1 text-[13px] font-medium px-4 py-3 rounded-full bg-[rgba(93,202,165,0.08)] text-[#9FE1CB] hover:bg-[rgba(93,202,165,0.15)] transition-all" onClick={skipScan}>Skip scan</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}