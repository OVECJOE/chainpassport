import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "ChainPassport — On-chain Web3 identity",
  description: "Verify your DeFi activity across every protocol in one soulbound NFT.",
  openGraph: {
    title: "ChainPassport",
    description: "Your verified on-chain identity.",
    siteName: "ChainPassport",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-[#080d0c] text-white antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}