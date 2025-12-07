'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState, useEffect } from 'react'
import LoadingSpinner from './LoadingSpinner'
import styles from './WalletConnection.module.css'

interface WalletConnectionProps {
  showFullAddress?: boolean
  className?: string
  size?: 'small' | 'medium' | 'large'
}

export default function WalletConnection({ 
  showFullAddress = false, 
  className = '',
  size = 'medium' 
}: WalletConnectionProps) {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showDisconnectMenu, setShowDisconnectMenu] = useState(false)

  // Close disconnect menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDisconnectMenu(false)
    if (showDisconnectMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDisconnectMenu])

  const formatAddress = (addr: string) => {
    if (showFullAddress) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleConnect = () => {
    const connector = connectors[0] // Use the first available connector (Farcaster)
    if (connector) {
      connect({ connector })
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setShowDisconnectMenu(false)
  }

  if (isConnecting || isPending) {
    return (
      <div className={`${styles.walletConnection} ${styles[size]} ${className}`}>
        <div className={styles.connectingState}>
          <LoadingSpinner size="small" color="#00ffff" />
          <span>Connecting...</span>
        </div>
      </div>
    )
  }

  if (isConnected && address) {
    return (
      <div className={`${styles.walletConnection} ${styles[size]} ${className}`}>
        <div className={styles.connectedState}>
          <div className={styles.walletInfo}>
            <div className={styles.statusIndicator}>
              <div className={styles.connectedDot}></div>
              {size !== 'small' && <span className={`${styles.statusText} teko-font`}>Connected</span>}
            </div>
            <div className={styles.addressContainer}>
              <span className={styles.address} title={address}>
                {formatAddress(address)}
              </span>
            </div>
          </div>
          <div className={styles.walletActions}>
            <button
              className={styles.menuButton}
              onClick={(e) => {
                e.stopPropagation()
                setShowDisconnectMenu(!showDisconnectMenu)
              }}
              title="Wallet options"
            >
              ⋮
            </button>
            {showDisconnectMenu && (
              <div className={styles.dropdownMenu}>
                <button
                  className={styles.copyButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(address)
                    setShowDisconnectMenu(false)
                  }}
                >
                  📋 Copy Address
                </button>
                <button
                  className={styles.disconnectButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDisconnect()
                  }}
                >
                  🔌 Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.walletConnection} ${styles[size]} ${className}`}>
      <div className={styles.disconnectedState}>
        <div className={styles.statusIndicator}>
          <div className={styles.disconnectedDot}></div>
          <span className={`${styles.statusText} teko-font`}>Not Connected</span>
        </div>
        <button
          className={styles.connectButton}
          onClick={handleConnect}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <LoadingSpinner size="small" color="#fff" />
              Connecting...
            </>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    </div>
  )
}
