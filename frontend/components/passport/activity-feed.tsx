"use client"

import { activityTypeLabel, activityTypeDotColor, type ActivityEvent } from "@/types"

const POINTS: Record<number, number> = { 1: 18, 2: 12, 3: 8, 4: 6, 5: 4 }

interface Props {
    events: ActivityEvent[]
    isLoading: boolean
    showHash?: boolean
    compact?: boolean
}

export function ActivityFeed({ events, isLoading, showHash, compact }: Props) {
    if (isLoading) return <LoadingSkeleton />

    if (events.length === 0) {
        return (
            <div className="py-8 text-center text-[12px] text-[rgba(93,202,165,0.2)]">
                No activity found
            </div>
        )
    }

    return (
        <div className="divide-y divide-[rgba(93,202,165,0.05)]">
            {events.map((e, i) => (
                <ActivityRow key={`${e.txHash}-${i}`} event={e} showHash={showHash} compact={compact} />
            ))}
        </div>
    )
}

function ActivityRow({ event, showHash, compact }: { event: ActivityEvent; showHash?: boolean; compact?: boolean }) {
    const label = activityTypeLabel(event.activityType)
    const dot = activityTypeDotColor(event.activityType)
    const points = POINTS[event.activityType] ?? 4

    return (
        <div className="flex items-center gap-3 py-[10px] group hover:bg-[rgba(93,202,165,0.02)] transition-colors rounded-lg px-2 -mx-2">
            {/* Dot */}
            <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: dot }} />

            {/* Tag */}
            <span className="act-tag flex-shrink-0">{label}</span>

            {/* Description */}
            <div className="flex-1 min-w-0">
                <div className="text-[12px] text-[rgba(255,255,255,0.45)] truncate">
                    {describeEvent(event)}
                </div>
                {showHash && (
                    <div className="text-[9px] text-[rgba(93,202,165,0.18)] font-mono mt-0.5">
                        {event.txHash.slice(0, 10)}…{event.txHash.slice(-6)}
                    </div>
                )}
            </div>

            {/* Points */}
            <div className="text-[12px] font-medium text-[#5DCAA5] flex-shrink-0">+{points}</div>

            {/* Topic label — shows the LOG4 topic[0] value */}
            {!compact && (
                <div className="hidden group-hover:block text-[9px] text-[rgba(93,202,165,0.18)] font-mono flex-shrink-0">
                    topic[0]: {`0x0${event.activityType}`}
                </div>
            )}
        </div>
    )
}

function describeEvent(e: ActivityEvent): string {
    const partner = partnerName(e.partnerId)
    switch (e.activityType) {
        case 1: return `${partner} — swap`
        case 2: return `${partner} — supply/borrow`
        case 3: return `${partner} — NFT purchase`
        case 4: return `${partner} — governance vote`
        default: return `${partner} — activity`
    }
}

function partnerName(id: number): string {
    return ({ 1: "Uniswap", 2: "Aave", 3: "Arbitrum Gov", 4: "OpenSea" } as Record<number, string>)[id] ?? `Protocol #${id}`
}

function LoadingSkeleton() {
    return (
        <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[rgba(93,202,165,0.1)] flex-shrink-0" />
                    <div className="h-3 w-16 rounded bg-[rgba(93,202,165,0.06)]" />
                    <div className="flex-1 h-3 rounded bg-[rgba(93,202,165,0.04)]" />
                    <div className="h-3 w-8 rounded bg-[rgba(93,202,165,0.06)]" />
                </div>
            ))}
        </div>
    )
}
