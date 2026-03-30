import type { Metadata } from 'next'
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'AI-TenderAnalyse',
    template: '%s | AI-TenderAnalyse',
  },
  description:
    'Analyseer tenders van TenderNed met AI — bid/no-bid beslissingen op basis van data',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai-tenderanalyse.vercel.app'
  ),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="nl"
      className="dark"
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} font-grotesk antialiased bg-deep-black text-off-white`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
