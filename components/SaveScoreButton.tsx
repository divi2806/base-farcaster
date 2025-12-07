'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useSaveScore } from '@/smartcontracthooks'

interface SaveScoreButtonProps {
  score: number
  kills: number
  wave: number
  onSaveComplete?: () => void
}

export default function SaveScoreButton({ score, kills, wave, onSaveComplete }: SaveScoreButtonProps) {
  const { isConnected } = useAccount()
  const { saveScore, isPending, isConfirming, isConfirmed, error } = useSaveScore()
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSaveScore = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    try {
      saveScore(score, kills, wave)
    } catch (err) {
      console.error('Error saving score:', err)
    }
  }

  // Show success message when confirmed
  if (isConfirmed && !showSuccess) {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onSaveComplete?.()
    }, 3000)
  }

  if (showSuccess) {
    return (
      <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold">
        ✅ Score Saved On-Chain!
      </button>
    )
  }

  return (
    <button
      onClick={handleSaveScore}
      disabled={isPending || isConfirming || !isConnected}
      className={`px-6 py-3 rounded-lg font-bold transition-all ${
        isPending || isConfirming
          ? 'bg-yellow-500 text-white cursor-not-allowed'
          : isConnected
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-gray-500 text-gray-300 cursor-not-allowed'
      }`}
    >
      {isPending || isConfirming ? (
        <span className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {isPending ? 'Confirming...' : 'Saving...'}
        </span>
      ) : (
        'Save Score On-Chain'
      )}
    </button>
  )
}