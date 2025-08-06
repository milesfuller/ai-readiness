import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth/context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Readiness Assessment',
  description: 'Comprehensive AI readiness assessment platform',
  other: {
    'permissions-policy': 'microphone=*, camera=*'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="permissions-policy" content="microphone=*" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}