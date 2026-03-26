import { createConfig, http } from "wagmi"
import { base, baseSepolia }  from "wagmi/chains"
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors"

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? ""

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "ChainPassport" }),
    walletConnect({ projectId }),
  ],
  transports: {
    [base.id]:        http(process.env.NEXT_PUBLIC_RPC_BASE        ?? "https://mainnet.base.org"),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? "https://sepolia.base.org"),
  },
})

declare module "wagmi" {
  interface Register {
    config: typeof config
  }
}