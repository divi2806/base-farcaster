'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getTopPlayers, getPlayerScore, getTotalPlayers, type PlayerScore } from '@/lib/firebase'
import styles from './Leaderboard.module.css'

interface LeaderboardProps {
  isVisible: boolean
  onClose: () => void
  isUpdating?: boolean
  leaderboardData?: any[]
  isLoading?: boolean
  totalUsers?: number
  myRank?: number
  myScore?: number
}

export default function Leaderboard({ 
  isVisible, 
  onClose, 
  isUpdating = false,
  leaderboardData,
  isLoading,
  totalUsers,
  myRank,
  myScore
}: LeaderboardProps) {
  const [limit, setLimit] = useState(20)
  const { address } = useAccount()
  
  // Firebase state
  const [firebaseLeaderboard, setFirebaseLeaderboard] = useState<PlayerScore[]>([])
  const [firebaseLoading, setFirebaseLoading] = useState(false)
  const [firebaseError, setFirebaseError] = useState<string | null>(null)
  const [myFirebaseScore, setMyFirebaseScore] = useState<PlayerScore | null>(null)
  const [totalFirebasePlayers, setTotalFirebasePlayers] = useState(0)

  // Fetch leaderboard from Firebase
  const fetchLeaderboard = async () => {
    setFirebaseLoading(true)
    setFirebaseError(null)
    try {
      const players = await getTopPlayers(limit)
      setFirebaseLeaderboard(players)
      
      // Get total players
      const total = await getTotalPlayers()
      setTotalFirebasePlayers(total)
      
      // Get my score if address is available
      if (address) {
        const myScore = await getPlayerScore(address)
        setMyFirebaseScore(myScore)
      }
    } catch (error: any) {
      console.error('Error fetching leaderboard:', error)
      setFirebaseError(error.message || 'Failed to load leaderboard')
    } finally {
      setFirebaseLoading(false)
    }
  }

  // Transform Firebase data to match expected format
  const leaderboard = firebaseLeaderboard.map(player => ({
    user: player.address,
    score: player.totalScore,
    username: player.username,
    fid: player.fid,
    pfp: player.pfp,
    gamesPlayed: player.gamesPlayed,
    highestScore: player.highestScore
  }))

  // Use passed data if available, otherwise use Firebase data
  const displayLeaderboard = leaderboardData || leaderboard
  const displayLoading = isLoading || firebaseLoading
  const displayMyScore = myScore || myFirebaseScore?.totalScore || 0
  const displayTotalUsers = totalUsers || totalFirebasePlayers

  // Fetch leaderboard when visible or limit changes
  useEffect(() => {
    if (isVisible) {
      fetchLeaderboard()
    }
  }, [isVisible, limit, address])

  if (!isVisible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.leaderboard}>
        <div className={styles.header}>
          <h2 className="jersey25-font">Leaderboard</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        {address && (
          <div className={styles.myStats}>
            <h3>Your Stats</h3>
            <div className={styles.userProfile}>
              <div className={styles.userInfo}>
                <div className={styles.walletAddress}>
                  {myFirebaseScore?.username || `${address.slice(0, 6)}...${address.slice(-4)}`}
                </div>
                {myFirebaseScore && (
                  <div style={{fontSize: '12px', color: '#aaa', marginTop: '5px'}}>
                    Score: {myFirebaseScore.totalScore.toLocaleString()} | Games: {myFirebaseScore.gamesPlayed}
                  </div>
                )}
              </div>
            </div>
           
            {displayTotalUsers > 0 && (
              <div className={styles.totalPlayers}>
                Total Players: {displayTotalUsers}
              </div>
            )}
            {firebaseError && (
              <div style={{color: '#ff6b6b', fontSize: '12px', marginTop: '5px'}}>
                {firebaseError}
              </div>
            )}
          </div>
        )}

        <div className={styles.controls}>
          <label>
            Show top:
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className={styles.limitSelect}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button 
            onClick={(e) => {
              e.preventDefault()
              fetchLeaderboard()
            }} 
            className={styles.refreshBtn}
            disabled={firebaseLoading}
          >
            {firebaseLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className={styles.scoresContainer}>
          {firebaseError ? (
            <div className={styles.error}>
              <p>Error loading scores: {firebaseError}</p>
              <button 
                onClick={(e) => {
                  e.preventDefault()
                  fetchLeaderboard()
                }} 
                className={styles.retryBtn}
              >
                Retry
              </button>
            </div>
          ) : displayLoading || isUpdating ? (
            <div className={styles.loading}>
              {isUpdating ? 'Updating scores...' : 'Loading scores...'}
            </div>
          ) : displayLeaderboard && displayLeaderboard.length > 0 ? (
            <div className={styles.scoresList}>
              {displayLeaderboard.map((entry: any, index: number) => (
                <div 
                  key={entry.user} 
                  className={`${styles.scoreRow} ${entry.user === address ? styles.myScore : ''}`}
                >
                  <div className={styles.rank}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerDetails}>
                      <div className={styles.playerAddress}>
                        {entry.user === address ? 'You' : (entry.username || `${entry.user.slice(0, 6)}...${entry.user.slice(-4)}`)}
                      </div>
                      {entry.gamesPlayed && (
                        <div style={{fontSize: '10px', color: '#888'}}>
                          {entry.gamesPlayed} games
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.score}>{Number(entry.score).toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noScores}>
              No scores yet. Be the first to submit your score!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
