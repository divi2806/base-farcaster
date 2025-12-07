import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { SURVIVOR_ZOMBIES_CONTRACT_ADDRESS, SURVIVOR_ZOMBIES_ABI } from './read'

export function useSaveScore() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const saveScore = (score: number, kills: number, wave: number) => {
    writeContract({
      address: SURVIVOR_ZOMBIES_CONTRACT_ADDRESS,
      abi: SURVIVOR_ZOMBIES_ABI,
      functionName: 'saveScore',
      args: [BigInt(score), BigInt(kills), BigInt(wave)],
    })
  }

  return {
    saveScore,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}

export function useClaimReward() {
  const { data: hash, writeContract, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const claimReward = () => {
    writeContract({
      address: SURVIVOR_ZOMBIES_CONTRACT_ADDRESS,
      abi: SURVIVOR_ZOMBIES_ABI,
      functionName: 'claimReward',
    })
  }

  return {
    claimReward,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  }
}