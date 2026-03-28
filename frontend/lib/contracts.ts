export const DEFAULT_CHAIN_ID = 84532

export const CONTRACTS: Record<number, {
  name: string
  passportNFT: string
  feeVault: string
  passportRegistry: string
  partnerRegistry: string
  activityEmitter: string
  activityRouter: string
  scoreEngine: string
  verifier: string
}> = {
  84532: {
    name: "Base Sepolia",
    passportNFT: "0x4063779E35521196b400a363e370695bC7516017",
    feeVault: "0x61Bd0DCFb450962C6c4fbaB44383f1CEc7FA499E",
    passportRegistry: "0x4AeEAea1389A4CF720296B1507AA9ac48A25f72d",
    partnerRegistry: "0xda449d0c463fef720Bd5E965e56DE4d6B547A464",
    activityEmitter: "0x1B056e2553615A8d53ae3442a4912542ccF05113",
    activityRouter: "0xed9426339077a183CE1c3F5fD19dc4129e9871F3",
    scoreEngine: "0x94B3bD720800F9134FD1eb59008B9F91168b3B05",
    verifier: "0x00a1DdbF4E1f19DD4a8252719f63eAfe1a0C6F78",
  },
  4202: {
    name: "Lisk Sepolia",
    passportNFT: "0x6992CFD8ac95166545BfDeA363F6B7C298A67426",
    feeVault: "0xbAC50d6B238e5072449c4B4D7a2F5bE5877dda40",
    passportRegistry: "0xC8929F5ca0CA8e6327Ba857478040d1535f95dBA",
    partnerRegistry: "0x88D2dE977a19CFB3A37094C1AEFd5f1317126175",
    activityEmitter: "0x9B3DB2Caff740B14380aD7E6d00D83A8c19919aa",
    activityRouter: "0xDEd335dDb6282681f523Fd314C8653DD1945da22",
    scoreEngine: "0x9DFa4c995251431dD5A19D79d0e54EAFc7B25e7D",
    verifier: "0x51a4B94da680866908c743aEc0997C5Cd3508928",
  }
}

export function getContractAddresses(chainId?: number) {
  return CONTRACTS[chainId || DEFAULT_CHAIN_ID] || CONTRACTS[DEFAULT_CHAIN_ID]
}

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