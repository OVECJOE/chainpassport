# ChainPassport

On-chain Web3 identity passport. Every activity logged via raw `LOG4` assembly — your proprietary topic schema, scored and displayed on a soulbound NFT.

---

## Project structure

```
chainpassport/
├── contracts/          Foundry project
│   ├── src/passport/
│   │   ├── PassportNFT.sol          Soulbound ERC-721, on-chain SVG
│   │   ├── FeeVault.sol             Collects mint + subscription fees
│   │   ├── PassportRegistry.sol     Mint, subscription state
│   │   ├── PartnerRegistry.sol      Protocol → point multiplier map
│   │   ├── ActivityEmitter.sol      LOG4 assembly — the core
│   │   ├── ActivityRouter.sol       Middleware: adapter → emitter
│   │   ├── ScoreEngine.sol          Score storage + decay (V2)
│   │   ├── Verifier.sol             Public read / gating helpers
│   │   ├── adapters/
│   │   │   ├── MockActivityAdapter.sol
│   │   │   ├── UniswapV3Adapter.sol
│   │   │   └── AaveAdapter.sol
│   │   └── libraries/
│   │       ├── ScoreLib.sol         Pure score math + decay
│   │       └── SVGLib.sol           On-chain SVG renderer
│   ├── test/Passport.t.sol          Full Foundry test suite
│   └── script/DeployPassport.s.sol  Deploy script (provided)
│
└── frontend/           Next.js 14 + shadcn/ui + wagmi v2
    └── src/
        ├── app/
        │   ├── page.tsx             Landing
        │   ├── mint/page.tsx        4-step mint wizard
        │   ├── dashboard/page.tsx   Overview / Activity / Subscription tabs
        │   ├── passport/[address]/  Public shareable passport
        │   └── leaderboard/page.tsx Top wallets
        ├── components/
        │   ├── shared/              Navbar, Providers, ConnectButton
        │   └── passport/            PassportCard, ActivityFeed
        ├── hooks/
        │   ├── usePassport.ts       Core data hook (score, tier, sub)
        │   ├── useMint.ts           Mint flow + renewal
        │   └── useActivity.ts       LOG4 event fetching + pagination
        └── lib/
            ├── contracts.ts         Addresses + constants
            ├── abis.ts              All contract ABIs
            ├── indexer.ts           eth_getLogs reader (topic[0–3])
            └── wagmi.ts             wagmi config for Base
```

---

## LOG4 topic schema

The `ActivityEmitter` contract emits raw `LOG4` — `topic[0]` is **not** a keccak256 signature hash. It's your own enum:

| Topic    | Value                    | Used for                          |
|----------|--------------------------|-----------------------------------|
| topic[0] | `0x01–0x05` activity type | Filter by action type             |
| topic[1] | user address             | Filter all activity by wallet     |
| topic[2] | passport tokenId         | Filter by specific NFT            |
| topic[3] | partnerId                | Filter by protocol                |

One `eth_getLogs` call returns all of a user's history across every integrated protocol.

---

## Contracts setup

```bash
cd contracts

# Install deps
forge install foundry-rs/forge-std --no-commit
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install OpenZeppelin/openzeppelin-contracts-upgradeable --no-commit

# Run tests
forge test -vv

# Deploy to Base Sepolia
cp .env.example .env
# fill in PRIVATE_KEY and TREASURY
source .env
forge script script/DeployPassport.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify
```

After deployment, copy the printed addresses into `frontend/.env.local`.

---

## Frontend setup

```bash
cd frontend

# Install (already have shadcn init done)
pnpm install

# Add shadcn components used
npx shadcn@latest add button badge tabs card

# Copy env
cp .env.local.example .env.local
# fill in your WalletConnect project ID and contract addresses

pnpm dev
```

---

## V2 features (ScoreEngine)

- Per-user decay rate override
- Monthly score snapshots
- Batch `writeScore` for indexer efficiency
- Configurable global decay rate + floor BPS
- `previewDecay(tokenId, months)` — used by the subscription UI

---

## Score decay formula

```
score(t) = max(storedScore × (1 - rate)^months, peakScore × floor%)
```

- Grace period: 7 days after subscription lapses — no decay
- Default rate: 2% per month
- Default floor: 20% of peak score
- Resubscribing stops decay instantly (computed on-the-fly in `currentScore()`)

---

## Adding a new protocol adapter

1. Create `contracts/src/passport/adapters/YourAdapter.sol` implementing `IActivityAdapter`
2. Register the partner: `partnerRegistry.setPartner(id, "Name", 10_000, true)`
3. Set the adapter: `router.setAdapter(id, address(yourAdapter))`
4. Add the partnerId to `partnerName()` in `frontend/src/components/passport/ActivityFeed.tsx`