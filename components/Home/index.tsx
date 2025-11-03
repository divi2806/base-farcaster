'use client'

import { FarcasterActions } from '@/components/Home/FarcasterActions'
import { User } from '@/components/Home/User'
import { WalletActions } from '@/components/Home/WalletActions'
import { NotificationActions } from './NotificationActions'

export function Demo() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 space-y-8 bg-[#000814]">
      <div className="w-full max-w-4xl space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">WalletConnect Base Starter</h1>
          <p className="text-sm text-[#A3B3C2]">Connect your wallet and interact on Base</p>
        </div>
        <WalletActions />
        <User />
        <FarcasterActions />
        <NotificationActions />
      </div>
    </div>
  )
}
