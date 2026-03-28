"use client"

import { useState, useEffect, useCallback } from "react"
import { useChainId } from "wagmi"
import { fetchUserActivity } from "@/lib/indexer"
import type { ActivityEvent } from "@/types"

const PAGE_SIZE = 20

type ActivityFilter = "all" | "trade" | "lend" | "nft" | "vote"
type SortOrder = "newest" | "oldest" | "highest_pts"

const POINTS: Record<number, number> = { 1: 18, 2: 12, 3: 8, 4: 6, 5: 4 }
const TYPE_MAP: Record<ActivityFilter, number | null> = {
  all: null, trade: 1, lend: 2, nft: 3, vote: 4
}

export function useActivity(userAddress?: string, tokenId?: bigint) {
  const [allEvents, setAllEvents] = useState<ActivityEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ActivityFilter>("all")
  const [sort, setSort] = useState<SortOrder>("newest")
  const [page, setPage] = useState(1)
  const chainId = useChainId()

  const load = useCallback(async () => {
    if (!userAddress) return
    setIsLoading(true)
    setError(null)
    try {
      const events = await fetchUserActivity(userAddress, tokenId, chainId)
      setAllEvents(events)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load activity")
    } finally {
      setIsLoading(false)
    }
  }, [userAddress, tokenId, chainId])

  useEffect(() => { load() }, [load])

  // Filter
  const filtered = filter === "all"
    ? allEvents
    : allEvents.filter(e => e.activityType === TYPE_MAP[filter])

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "newest") return b.blockNumber - a.blockNumber
    if (sort === "oldest") return a.blockNumber - b.blockNumber
    if (sort === "highest_pts") return (POINTS[b.activityType] ?? 0) - (POINTS[a.activityType] ?? 0)
    return 0
  })

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Summary counts
  const summary = {
    total: allEvents.length,
    trades: allEvents.filter(e => e.activityType === 1).length,
    lends: allEvents.filter(e => e.activityType === 2).length,
    nfts: allEvents.filter(e => e.activityType === 3).length,
    votes: allEvents.filter(e => e.activityType === 4).length,
  }

  function setFilterAndReset(f: ActivityFilter) {
    setFilter(f)
    setPage(1)
  }

  function setSortAndReset(s: SortOrder) {
    setSort(s)
    setPage(1)
  }

  return {
    events: paginated,
    summary,
    isLoading,
    error,
    filter, setFilter: setFilterAndReset,
    sort, setSort: setSortAndReset,
    page, setPage,
    totalPages,
    reload: load,
  }
}