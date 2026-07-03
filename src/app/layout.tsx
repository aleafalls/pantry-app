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
  title: 'Pantry',
  description: 'Shared household pantry tracker',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Pantry',
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
      </head>
      <body>
        <div className="mx-auto max-w-[390px] min-h-screen relative overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  )
}
