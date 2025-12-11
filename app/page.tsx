import App from '@/components/pages/app'
import { APP_URL } from '@/lib/constants'
import type { Metadata } from 'next'

const frame = {
  version: 'next',
  imageUrl: `${APP_URL}/images/icon.png`,
  button: {
    title: 'Play KILLZ',
    action: {
      type: 'launch_frame',
      name: 'KILLZ',
      url: APP_URL,
      splashImageUrl: `${APP_URL}/images/splash.png`,
      splashBackgroundColor: '#111111',
    },
  },
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Survivor: Zombies',
    openGraph: {
      title: 'Survivor: Zombies',
      description: 'Fight zombies and survive the night',
    },
    other: {
      // Farcaster Frame
      'fc:frame': JSON.stringify(frame),

      // Base App metadata (THIS is what you needed to add)
      'base:app_id': '693ab67b8a7c4e55fec73e12',
    },
  }
}

export default function Home() {
  return <App />
}
