import App from '@/components/pages/app'
import { APP_URL } from '@/lib/constants'
import type { Metadata } from 'next'

const frame = {
  version: 'next',
  imageUrl: `${APP_URL}/images/icon.png`,
  button: {
    title: 'Play Survivor: Zombies',
    action: {
      type: 'launch_frame',
      name: 'survivor-zombies',
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
      'fc:frame': JSON.stringify(frame),
    },
  }
}

export default function Home() {
  return <App />
}
