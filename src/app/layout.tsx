import type { Metadata } from 'next'
import StyledComponentsRegistry from './registry'
import GlobalStyle from '@/styles/GlobalStyle'
import { ThemeProvider } from 'styled-components'
import { theme } from '@/styles/theme'
import Header from '@/components/Header'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'QuantSportsClub',
  description: 'Sports analytics & betting education',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <ThemeProvider theme={theme}>
            <GlobalStyle />
            <Providers>
              <Header />
              {children}
            </Providers>
          </ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}
