'use client'

import type { DefaultTheme } from 'styled-components'

export const theme: DefaultTheme = {
  colors: {
    bg: '#0b1220',
    text: '#e6edf7',
    primary: '#85bb65',
    muted: '#8aa0b6',
    card: '#111a2e',
    accent: '#4ea0ff',
  },
}

declare module 'styled-components' {
  // extend DefaultTheme typing
  export interface DefaultTheme {
    colors: {
      bg: string
      text: string
      primary: string
      muted: string
      card: string
      accent: string
    }
  }
}
