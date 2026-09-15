import type { Metadata } from 'next'
import ThemeClient from '@/components/ThemeClient'
import Providers from '@/components/Providers'
import Header from '@/components/Header'

export const metadata: Metadata = {
  title: 'QuantSportsClub',
  description: 'Sports analytics & betting education',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeClient>
          <Providers>
            <a className="skip-link" href="#main-content">
              Skip to main content
            </a>
            <Header />
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
          </Providers>
        </ThemeClient>
      </body>
    </html>
  )
}
