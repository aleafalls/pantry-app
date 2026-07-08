import type { Metadata, Viewport } from 'next'
import { Figtree } from 'next/font/google'
import './globals.css'

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lemmy',
  description: 'Shared household pantry tracker',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lemmy',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#FFD333',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={figtree.variable}>
      <head>
        <link rel="stylesheet" href="/fonts/uicons/uicons-regular-rounded.css" />
        <link rel="stylesheet" href="/fonts/uicons/uicons-solid-rounded.css" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body>
        <div style={{ maxWidth: 660, margin: '0 auto', minHeight: '100vh', position: 'relative' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
