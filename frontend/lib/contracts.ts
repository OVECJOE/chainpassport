export const CHAIN_ID = 84532 // Base mainnet (84532 for Base Sepolia)
export const START_BLOCK = process.env.NEXT_PUBLIC_CHAIN_ID === "8453" ? 22000000n : 39389000n

export const ADDRESSES = {
  passportNFT: "0x4063779E35521196b400a363e370695bC7516017",
  feeVault: "0x61Bd0DCFb450962C6c4fbaB44383f1CEc7FA499E",
  passportRegistry: "0x4AeEAea1389A4CF720296B1507AA9ac48A25f72d",
  partnerRegistry: "0xda449d0c463fef720Bd5E965e56DE4d6B547A464",
  activityEmitter: "0x1B056e2553615A8d53ae3442a4912542ccF05113",
  activityRouter: "0xed9426339077a183CE1c3F5fD19dc4129e9871F3",
  scoreEngine: "0x94B3bD720800F9134FD1eb59008B9F91168b3B05",
  verifier: "0x00a1DdbF4E1f19DD4a8252719f63eAfe1a0C6F78",
} as const

// Activity type constants — mirror ActivityEmitter.sol
export const ACTIVITY_TYPE = {
  TRADE: 0x01,
  LEND: 0x02,
  NFT: 0x03,
  VOTE: 0x04,
  CUSTOM: 0x05,
} as const

export const ACTIVITY_LABEL: Record<number, string> = {
  [ACTIVITY_TYPE.TRADE]: "trade",
  [ACTIVITY_TYPE.LEND]: "lend",
  [ACTIVITY_TYPE.NFT]: "nft",
  [ACTIVITY_TYPE.VOTE]: "vote",
  [ACTIVITY_TYPE.CUSTOM]: "custom",
}

export const TIER_LABEL = ["Unranked", "Bronze", "Silver", "Gold"] as const
export const TIER_THRESHOLD = { Gold: 850, Silver: 550, Bronze: 250 } as const

export const MINT_FEE_ETH = "0.002"
export const MONTHLY_FEE_ETH = "0.001"