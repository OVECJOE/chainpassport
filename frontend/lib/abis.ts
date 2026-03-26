export const PASSPORT_REGISTRY_ABI = [
    // Write
    { name: "mint", type: "function", stateMutability: "payable", inputs: [], outputs: [{ name: "tokenId", type: "uint256" }] },
    { name: "renewSubscription", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
    { name: "cancelSubscription", type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
    // Read
    { name: "passportOf", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
    { name: "isSubscriptionActive", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "bool" }] },
    { name: "subscriptionExpiresAt", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint48" }] },
    { name: "minFeeWei", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    { name: "monthlyFeeWei", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    {
        name: "passportData", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{
            name: "", type: "tuple",
            components: [
                { name: "tokenId", type: "uint256" },
                { name: "mintedAt", type: "uint48" },
                { name: "lastPayment", type: "uint48" },
                { name: "expiresAt", type: "uint48" },
                { name: "active", type: "bool" },
            ]
        }]
    },
    // Events
    { name: "PassportMinted", type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "fee", type: "uint256", indexed: false }] },
    { name: "SubscriptionRenewed", type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "expiresAt", type: "uint48", indexed: false }] },
] as const

export const SCORE_ENGINE_ABI = [
    { name: "currentScore", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
    { name: "currentTier", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "uint8" }] },
    { name: "previewDecay", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }, { name: "monthsLapsed", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
    { name: "activityCount", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
    { name: "decayRateBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    { name: "floorBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    {
        name: "scoreRecord", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{
            name: "", type: "tuple",
            components: [
                { name: "storedScore", type: "uint256" },
                { name: "peakScore", type: "uint256" },
                { name: "lastPayment", type: "uint48" },
                { name: "lastUpdated", type: "uint48" },
                { name: "activityCount", type: "uint256" },
                { name: "decayRateOverride", type: "uint256" },
            ]
        }]
    },
] as const

export const VERIFIER_ABI = [
    {
        name: "verify", type: "function", stateMutability: "view",
        inputs: [{ name: "user", type: "address" }],
        outputs: [{
            name: "", type: "tuple",
            components: [
                { name: "exists", type: "bool" },
                { name: "subscriptionActive", type: "bool" },
                { name: "tokenId", type: "uint256" },
                { name: "score", type: "uint256" },
                { name: "tier", type: "uint8" },
                { name: "activityCount", type: "uint256" },
                { name: "mintedAt", type: "uint48" },
                { name: "expiresAt", type: "uint48" },
            ]
        }]
    },
    {
        name: "meetsScoreRequirement", type: "function", stateMutability: "view",
        inputs: [{ name: "user", type: "address" }, { name: "minScore", type: "uint256" }],
        outputs: [{ name: "", type: "bool" }]
    },
    {
        name: "meetsTierRequirement", type: "function", stateMutability: "view",
        inputs: [{ name: "user", type: "address" }, { name: "requiredTier", type: "uint8" }],
        outputs: [{ name: "", type: "bool" }]
    },
    {
        name: "verifyAndAttest", type: "function", stateMutability: "nonpayable",
        inputs: [{ name: "subject", type: "address" }],
        outputs: []
    },
] as const

export const PASSPORT_NFT_ABI = [
    { name: "tokenURI", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }] },
    { name: "ownerOf", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
    { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    { name: "burn", type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
] as const

export const FEE_VAULT_ABI = [
    { name: "balance", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    { name: "sweep", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
    { name: "totalDeposited", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
] as const

// LOG4 topic layout for eth_getLogs off-chain indexing
// topic[0] = activityType (0x01–0x05)
// topic[1] = user address
// topic[2] = tokenId
// topic[3] = partnerId
export const ACTIVITY_EMITTER_TOPICS = {
    TRADE: "0x0000000000000000000000000000000000000000000000000000000000000001",
    LEND: "0x0000000000000000000000000000000000000000000000000000000000000002",
    NFT: "0x0000000000000000000000000000000000000000000000000000000000000003",
    VOTE: "0x0000000000000000000000000000000000000000000000000000000000000004",
    CUSTOM: "0x0000000000000000000000000000000000000000000000000000000000000005",
} as const