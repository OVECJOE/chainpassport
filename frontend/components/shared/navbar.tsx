"use client"
import { useState, useEffect } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { injected } from "wagmi/connectors"
import { Menu, Wallet, LogOut, User, Activity, Trophy, LayoutDashboard } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function Navbar() {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const { connect }    = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navLinks = [
    { name: "Leaderboard", href: "/leaderboard", icon: <Trophy className="w-4 h-4 mr-2" /> },
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4 mr-2" /> },
  ]

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-[rgba(93,202,165,0.06)] bg-[#080d0c]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-[17px] font-semibold text-[#9FE1CB] tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#5DCAA5]" />
          <span>chain<span className="text-[rgba(93,202,165,0.4)] font-light">passport</span></span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-[rgba(93,202,165,0.1)] text-[#5DCAA5]"
                    : "text-[rgba(93,202,165,0.4)] hover:text-[#9FE1CB] hover:bg-[rgba(93,202,165,0.05)]"
                }`}
              >
                {link.icon}
                {link.name}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!mounted ? (
           <div className="w-[124px] h-9 bg-[rgba(93,202,165,0.06)] border border-[rgba(93,202,165,0.12)] rounded-full animate-pulse hidden md:block" />
        ) : isConnected && address ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none">
              <div className="flex items-center gap-2 bg-[rgba(93,202,165,0.04)] hover:bg-[rgba(93,202,165,0.08)] border border-[rgba(93,202,165,0.12)] rounded-full pl-1 pr-3 py-1 transition-all cursor-pointer">
                 <Avatar className="w-6 h-6 border border-[rgba(93,202,165,0.2)] bg-transparent">
                   <AvatarFallback className="bg-[rgba(93,202,165,0.2)] text-[10px] text-[#5DCAA5]">
                     {address.slice(2, 4).toUpperCase()}
                   </AvatarFallback>
                 </Avatar>
                 <span className="text-[12px] font-mono text-[rgba(93,202,165,0.8)]">
                   {shortAddress(address)}
                 </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0a100f] border-[rgba(93,202,165,0.1)] text-[#9FE1CB] shadow-2xl p-1 rounded-xl">
              <div className="px-3 py-3 mb-1 bg-black/40 rounded-t-lg">
                <p className="text-[10px] uppercase tracking-widest text-[rgba(93,202,165,0.4)] mb-1">Connected Wallet</p>
                <p className="text-[13px] font-mono truncate text-[rgba(93,202,165,0.9)]">{address}</p>
              </div>
              <DropdownMenuSeparator className="bg-[rgba(93,202,165,0.1)] mb-1" />
              <DropdownMenuItem asChild className="cursor-pointer focus:bg-[rgba(93,202,165,0.1)] focus:text-[#5DCAA5] rounded-md px-3 py-2.5">
                <Link href="/dashboard" className="flex items-center w-full">
                  <User className="w-4 h-4 mr-2 opacity-70" /> My Passport
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[rgba(93,202,165,0.1)] my-1" />
              <DropdownMenuItem onClick={() => disconnect()} className="cursor-pointer text-red-400 focus:bg-[rgba(239,68,68,0.1)] focus:text-red-400 rounded-md px-3 py-2.5">
                <LogOut className="w-4 h-4 mr-2" /> Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            className="hidden md:flex items-center text-[13px] font-medium text-[#080d0c] bg-[#5DCAA5] hover:bg-[#4eb391] rounded-full px-5 py-2.5 transition-all shadow-[0_0_15px_rgba(93,202,165,0.25)] hover:shadow-[0_0_20px_rgba(93,202,165,0.4)]"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </button>
        )}

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger className="md:hidden p-2 text-[rgba(93,202,165,0.6)] hover:bg-[rgba(93,202,165,0.1)] rounded-md transition-colors">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="right" className="bg-[#080d0c] border-l-[rgba(93,202,165,0.1)] p-6 pt-12">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Link href="/" className="text-[17px] font-semibold text-[#9FE1CB] tracking-tight flex items-center gap-2 mb-8 px-2">
              <Activity className="w-5 h-5 text-[#5DCAA5]" />
              <span>chain<span className="text-[rgba(93,202,165,0.4)] font-light">passport</span></span>
            </Link>
            
            <div className="flex flex-col gap-2 mb-8">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all ${
                      isActive
                        ? "bg-[rgba(93,202,165,0.1)] text-[#5DCAA5]"
                        : "text-[rgba(93,202,165,0.6)] hover:bg-[rgba(93,202,165,0.05)]"
                    }`}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                )
              })}
            </div>

            {!mounted ? (
                <div className="w-full h-[46px] bg-[rgba(93,202,165,0.08)] rounded-full animate-pulse" />
            ) : !isConnected && (
              <button
                onClick={() => connect({ connector: injected() })}
                className="w-full flex justify-center items-center text-[15px] font-medium text-[#080d0c] bg-[#5DCAA5] hover:bg-[#4eb391] rounded-full px-5 py-3.5 transition-all shadow-[0_0_15px_rgba(93,202,165,0.25)]"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </button>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}