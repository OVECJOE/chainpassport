"use client"

import { useChainId, useSwitchChain, useConnections } from "wagmi"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { base, baseSepolia, liskSepolia } from "wagmi/chains"
import { useState, useEffect } from "react"
import { Hexagon, Zap } from "lucide-react"

export function NetworkSwitcher() {
  const connections = useConnections()
  const isConnected = connections.length > 0
  const chainId = useChainId()
  const { chains, switchChain, isPending } = useSwitchChain()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !isConnected) return null

  // Map chains to beautiful icons
  const getChainIcon = (id: number) => {
    switch(id) {
      case base.id:
      case baseSepolia.id: return <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center mr-2"><div className="w-1.5 h-1.5 bg-white rounded-full" /></div>
      case liskSepolia.id: return <Hexagon className="w-4 h-4 text-emerald-400 mr-2" />
      default: return <Zap className="w-4 h-4 text-yellow-500 mr-2" />
    }
  }

  const activeChain = chains.find(c => c.id === chainId)
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(93,202,165,0.06)] border border-[rgba(93,202,165,0.12)] hover:bg-[rgba(93,202,165,0.1)] transition-colors outline-none focus:outline-none">
        {activeChain ? getChainIcon(activeChain.id) : <Zap className="w-3.5 h-3.5 text-yellow-500" />}
        <span className="text-[12px] font-medium text-[rgba(255,255,255,0.8)]">
          {activeChain?.name ?? "Unsupported"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px] bg-[#0c1210] border border-[rgba(93,202,165,0.15)] rounded-xl p-1.5 shadow-2xl z-50">
        <div className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-2 px-2 pt-1 border-b border-[rgba(255,255,255,0.05)] pb-2 flex items-center gap-1.5">
          Select Network
        </div>
        {chains.map((chain) => (
          <DropdownMenuItem 
            key={chain.id}
            onClick={() => switchChain({ chainId: chain.id })}
            disabled={isPending}
            className={`flex items-center px-3 py-2.5 rounded-lg text-[12px] outline-none cursor-pointer mb-0.5 last:mb-0 transition-colors ${
              chain.id === chainId 
                ? "bg-[rgba(93,202,165,0.12)] text-[#9FE1CB]" 
                : "text-[rgba(255,255,255,0.6)] focus:bg-[rgba(93,202,165,0.06)] focus:text-white"
            }`}
          >
            {getChainIcon(chain.id)}
            <span className="font-medium">{chain.name}</span>
            {chain.id === chainId && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#5DCAA5] shadow-[0_0_8px_rgba(93,202,165,0.8)]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
