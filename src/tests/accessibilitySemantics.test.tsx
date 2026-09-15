import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { theme } from '@/styles/theme'

vi.mock('@/components/ThemeClient', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/components/Providers', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/components/Header', () => ({ default: () => null }))

import RootLayout from '@/app/layout'
import BetslipPage from '@/app/(app)/betslip/page'

vi.stubGlobal('React', React)

describe('shared accessibility semantics', () => {
  it('provides a keyboard skip link with a focus target', () => {
    const html = renderToStaticMarkup(
      RootLayout({ children: <main>Workspace</main> }),
    )

    expect(html).toContain('href="#main-content"')
    expect(html).toContain('id="main-content"')
    expect(html).toContain('tabindex="-1"')
  })

  it('associates betslip labels, help, and live results with their controls', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider theme={theme}>
        <BetslipPage />
      </ThemeProvider>,
    )

    expect(html).toContain('<h1>Betslip</h1>')
    expect(html).toContain('for="bet-sport"')
    expect(html).toContain('for="bet-market"')
    expect(html).toContain('for="bet-pick"')
    expect(html).toContain('aria-labelledby="odds-label"')
    expect(html).toContain('aria-describedby="odds-help"')
    expect(html).toContain('aria-describedby="stake-help"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('id="recent-bets-heading"')
    expect(html).toContain('View exposure and PnL')
  })
})
