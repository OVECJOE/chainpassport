import Link from "next/link"
import { Navbar } from "@/components/shared/navbar"
import { ConnectAndMintButton } from "@/components/shared/connect-and-mint-button"
import { getLeaderboard } from "@/app/leaderboard/actions"

export const dynamic = "force-dynamic"

const FEATURES = [
    {
        title: "Verified on-chain",
        body: "Every activity logged via raw LOG4 assembly — your proprietary topic schema, unreadable by generic block explorers.",
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" rx="3" stroke="#5DCAA5" strokeWidth="1" />
                <path d="M5 8l2 2 4-4" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        title: "Score decay",
        body: "Active wallets stay ranked. Scores decay exponentially on lapse — keeping the leaderboard honest.",
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="5" stroke="#5DCAA5" strokeWidth="1" />
                <path d="M8 5v3l2 1" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        title: "Shareable proof",
        body: "One link. DAOs, employers, and protocols can verify your history without trusting a centralised database.",
        icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M8 3l5 5-5 5" stroke="#5DCAA5" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
]

export default async function LandingPage() {
    const leaders = await getLeaderboard()
    
    // Derived real stats from on-chain state
    const totalPassports = leaders.length
    const totalActivities = leaders.reduce((acc, l) => acc + l.activities, 0)
    
    const STATS = [
        { n: totalPassports.toLocaleString(), label: "passports minted" },
        { n: totalActivities.toLocaleString(), label: "activities indexed" },
        { n: "4", label: "protocols tracked" },
        { n: "~$0.02", label: "avg gas cost" },
    ]

    // Sort descending by mint date for chronological newest
    const recentMints = [...leaders].sort((a,b) => b.mintedAt - a.mintedAt).slice(0, 10)
    
    const exampleAddress = recentMints.length > 0 ? recentMints[0].address : "0x3f4ac81b00000000000000000000000000000000"

    return (
        <div className="min-h-screen bg-[#080d0c] relative overflow-hidden">
            {/* Orbs */}
            <div className="orb w-[500px] h-[500px] -top-48 -left-36 hidden md:block" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.13) 0%, transparent 65%)" }} />
            <div className="orb w-[350px] h-[350px] top-24 -right-28 hidden md:block" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.07) 0%, transparent 65%)" }} />
            <div className="orb w-[250px] h-[250px] bottom-0 left-1/3" style={{ background: "radial-gradient(circle, rgba(29,158,117,0.06) 0%, transparent 65%)" }} />

            <Navbar />

            {/* Hero */}
            <section className="text-center px-6 pt-16 pb-12 relative z-10 w-full">
                <div className="section-label mb-5 inline-block mx-auto">on-chain identity · base network</div>
                <h1 className="text-[38px] md:text-[44px] font-light text-[#9FE1CB] tracking-[-2px] leading-[1.12] mb-2 max-w-[90vw] mx-auto">
                    Your Web3 history,<br />
                    <strong className="font-semibold text-white">verified forever.</strong>
                </h1>
                <p className="text-[14px] text-[rgba(93,202,165,0.4)] leading-[1.7] max-w-[420px] mx-auto mt-4 mb-9">
                    One soulbound NFT that proves your DeFi activity across every protocol —
                    trades, loans, votes, and NFTs — normalized and scored on-chain.
                </p>

                <div className="flex items-center justify-center gap-3">
                    <ConnectAndMintButton />
                    {recentMints.length > 0 && (
                        <Link
                            href={`/passport/${exampleAddress}`}
                            className="btn-ghost text-[13px]"
                        >
                            view example
                        </Link>
                    )}
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-7 px-4">
                    {["soulbound · non-transferable", "on-chain SVG", "UUPS upgradeable", "~$0.02 on Base"].map(t => (
                        <div key={t} className="flex items-center gap-2 text-[11px] text-[rgba(93,202,165,0.28)]">
                            <div className="w-1 h-1 rounded-full bg-[rgba(93,202,165,0.2)]" />
                            {t}
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats */}
            <section className="flex flex-wrap md:flex-nowrap justify-center gap-8 md:gap-0 px-6 pb-12 md:pb-8 relative z-10">
                {STATS.map((s, i) => (
                    <div key={s.label} className={`text-center px-8 w-1/2 md:w-auto ${i < STATS.length - 1 ? "md:border-r border-[rgba(93,202,165,0.08)]" : ""}`}>
                        <div className="text-[24px] md:text-[28px] font-light text-[#9FE1CB] tracking-[-1px]">{s.n}</div>
                        <div className="section-label mt-1">{s.label}</div>
                    </div>
                ))}
            </section>

            {/* Feature cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-3 px-6 pb-8 max-w-4xl mx-auto relative z-10 w-full">
                {FEATURES.map(f => (
                    <div key={f.title} className="glass-sm p-6 rounded-xl hover:bg-[rgba(93,202,165,0.04)] transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(93,202,165,0.08)] border border-[rgba(93,202,165,0.14)] flex items-center justify-center mb-5">
                            {f.icon}
                        </div>
                        <div className="text-[14px] font-medium text-[#9FE1CB] mb-2">{f.title}</div>
                        <div className="text-[12px] text-[rgba(93,202,165,0.35)] leading-[1.6]">{f.body}</div>
                    </div>
                ))}
            </section>

            {/* Recent mints ticker */}
            <section className="px-6 pb-12 relative z-10 max-w-3xl mx-auto w-full">
                <div className="section-label text-center mb-4">recent connected wallets</div>
                <div className="flex gap-2 overflow-hidden flex-wrap justify-center">
                    {recentMints.map(r => (
                        <Link href={`/passport/${r.address}`} key={r.address} className="text-[11px] text-[rgba(93,202,165,0.4)] hover:text-[#5DCAA5] bg-[rgba(93,202,165,0.04)] hover:bg-[rgba(93,202,165,0.08)] border border-[rgba(93,202,165,0.08)] rounded-full px-3 py-1.5 font-mono transition-colors">
                            {r.address.slice(0,6)}…{r.address.slice(-4)} · {r.tier} · {r.score} pts
                        </Link>
                    ))}
                    {recentMints.length === 0 && (
                        <div className="text-[11px] text-[rgba(93,202,165,0.3)]">No passports minted yet on this network.</div>
                    )}
                </div>
            </section>
        </div>
    )
}