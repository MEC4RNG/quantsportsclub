'use client'

import React from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [styledComponentsStyleSheet] = React.useState(() => new ServerStyleSheet())

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleElement()
    return <>{styles}</>
  })

  if (typeof window !== 'undefined') {
    return <>{children}</>
  }

  // styled-components v6 doesn't export a StyleSheet type; this cast is the standard workaround.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance as unknown as any}>
      {children}
    </StyleSheetManager>
  )
}
