export type Tier = "Unranked" | "Bronze" | "Silver" | "Gold"

export interface PassportData {
  tokenId:     bigint
  mintedAt:    bigint
  lastPayment: bigint
  expiresAt:   bigint
  active:      boolean
}

export interface VerificationResult {
  exists:             boolean
  subscriptionActive: boolean
  tokenId:            bigint
  score:              bigint
  tier:               number   // 0=Unranked 1=Bronze 2=Silver 3=Gold
  activityCount:      bigint
  mintedAt:           bigint
  expiresAt:          bigint
}

export interface ScoreRecord {
  storedScore:       bigint
  peakScore:         bigint
  lastPayment:       bigint
  lastUpdated:       bigint
  activityCount:     bigint
  decayRateOverride: bigint
}

export interface ActivityEvent {
  txHash:       string
  blockNumber:  number
  timestamp:    number
  activityType: number   // 0x01–0x05
  user:         string
  tokenId:      bigint
  partnerId:    number
  value:        bigint
  extra:        string
}

export interface PassportState {
  tokenId:            bigint | null
  score:              number
  tier:               Tier
  activityCount:      number
  subscriptionActive: boolean
  expiresAt:          Date | null
  mintedAt:           Date | null
}

export function tierFromNumber(n: number): Tier {
  return (["Unranked", "Bronze", "Silver", "Gold"] as Tier[])[n] ?? "Unranked"
}

export function tierColor(tier: Tier) {
  switch (tier) {
    case "Gold":     return { text: "#EF9F27", bg: "rgba(186,117,23,0.12)", border: "rgba(186,117,23,0.3)" }
    case "Silver":   return { text: "#5DCAA5", bg: "rgba(93,202,165,0.12)", border: "rgba(93,202,165,0.25)" }
    case "Bronze":   return { text: "#F0997B", bg: "rgba(240,153,123,0.12)", border: "rgba(240,153,123,0.25)" }
    default:         return { text: "#888780", bg: "rgba(136,135,128,0.12)", border: "rgba(136,135,128,0.2)" }
  }
}

export function activityTypeLabel(t: number): string {
  return ({ 1: "trade", 2: "lend", 3: "nft", 4: "vote", 5: "custom" } as Record<number, string>)[t] ?? "unknown"
}

export function activityTypeDotColor(t: number): string {
  return ({ 1: "#5DCAA5", 2: "rgba(93,202,165,0.5)", 3: "rgba(93,202,165,0.3)", 4: "rgba(93,202,165,0.18)", 5: "rgba(93,202,165,0.1)" } as Record<number, string>)[t] ?? "#5DCAA5"
}