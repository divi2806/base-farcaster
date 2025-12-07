'use client'

import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  color?: string
}

export default function LoadingSpinner({ size = 'medium', color = '#00d4ff' }: LoadingSpinnerProps) {
  return (
    <div className={`${styles.spinner} ${styles[size]}`} style={{ borderTopColor: color }}>
    </div>
  )
}
