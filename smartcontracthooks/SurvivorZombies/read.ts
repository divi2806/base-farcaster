import { useReadContract } from 'wagmi'

// Replace with your actual contract address and ABI
const SURVIVOR_ZOMBIES_CONTRACT_ADDRESS = '0x...' // Add your contract address here

const SURVIVOR_ZOMBIES_ABI = [
  // Add your contract ABI here
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayerStats',
    outputs: [
      { internalType: 'uint256', name: 'highScore', type: 'uint256' },
      { internalType: 'uint256', name: 'totalKills', type: 'uint256' },
      { internalType: 'uint256', name: 'gamesPlayed', type: 'uint256' },
      { internalType: 'uint256', name: 'bestWave', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getLeaderboard',
    outputs: [
      { internalType: 'address[]', name: 'players', type: 'address[]' },
      { internalType: 'uint256[]', name: 'scores', type: 'uint256[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const

export function useGetPlayerStats(playerAddress?: `0x${string}`) {
  return useReadContract({
    address: SURVIVOR_ZOMBIES_CONTRACT_ADDRESS,
    abi: SURVIVOR_ZOMBIES_ABI,
    functionName: 'getPlayerStats',
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: !!playerAddress,
    },
  })
}

export function useGetLeaderboard() {
  return useReadContract({
    address: SURVIVOR_ZOMBIES_CONTRACT_ADDRESS,
    abi: SURVIVOR_ZOMBIES_ABI,
    functionName: 'getLeaderboard',
  })
}

export { SURVIVOR_ZOMBIES_CONTRACT_ADDRESS, SURVIVOR_ZOMBIES_ABI }