import type { Metadata } from 'next'
import StyledComponentsRegistry from './registry'
import Header from '@/components/Header'
import Providers from '@/components/Providers'
import ThemeClient from '@/components/ThemeClient'

export const metadata: Metadata = {
  title: 'QuantSportsClub',
  description: 'Sports analytics & betting education',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <ThemeClient>
            <Providers>
              <Header />
              {children}
            </Providers>
          </ThemeClient>
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}
