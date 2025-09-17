'use client'

import React from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { ServerStyleSheet, StyleSheetManager } from 'styled-components'

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = React.useState(() => new ServerStyleSheet())

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement()
    sheet.seal()
    return <>{styles}</>
  })

  if (typeof window !== 'undefined') return <>{children}</>

  // styled-components v6 doesn't export a StyleSheet type; this cast is safe.
  return <StyleSheetManager sheet={sheet.instance as unknown as never}>{children}</StyleSheetManager>
}
