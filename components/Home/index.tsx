'use client'

import SurvivorZombiesGame from '@/components/SurvivorZombiesGame'
import WalletConnection from '@/components/WalletConnection'

export function Demo() {
  return (
    <div className="h-screen w-full relative">
      {/* Wallet Connection at top-right - circular compact */}
      <div className="fixed top-2 right-2 z-50">
        <WalletConnection size="small" />
      </div>
      
      {/* Game content - full screen */}
      <div className="w-full h-full">
        <SurvivorZombiesGame />
      </div>
    </div>
  )
}
