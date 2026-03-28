"use client"
import { useState, useEffect } from "react"

import { useRouter }   from "next/navigation"
import { useConnections, useConnect } from "wagmi"
import { injected }    from "wagmi/connectors"
import { usePassport } from "@/hooks/use-passport"

export function ConnectAndMintButton() {
  const router = useRouter()
  const connections = useConnections()
  const isConnected = connections.length > 0
  const { connect }     = useConnect()
  const { hasPassport } = usePassport()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleClick() {
    if (!isConnected) {
      connect({ connector: injected() })
      return
    }
    if (hasPassport) {
      router.push("/dashboard")
    } else {
      router.push("/mint")
    }
  }

  const label = !isConnected
    ? "Connect wallet"
    : hasPassport
    ? "Open dashboard"
    : "Mint your passport"

  if (!mounted) return <button className="btn-mint opacity-50">Loading...</button>

  return (
    <button className="btn-mint" onClick={handleClick}>
      {label}
    </button>
  )
}