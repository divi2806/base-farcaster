import type { Metadata } from 'next'
import { Inter, Jersey_25, Teko } from 'next/font/google'

import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const jersey25 = Jersey_25({ subsets: ['latin'], weight: '400' })
const teko = Teko({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Survivor: Zombies',
  description: 'Fight zombies and survive the night in this intense survival game',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ '--jersey25-font': jersey25.style.fontFamily, '--teko-font': teko.style.fontFamily } as React.CSSProperties}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}