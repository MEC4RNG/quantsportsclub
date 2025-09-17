'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    // You could send to Sentry/Log service here
    console.error(error)
  }, [error])

  return (
    <html>
      <body style={{maxWidth: 720, margin: '60px auto', padding: 16}}>
        <h2>Something went wrong</h2>
        <p>We hit an unexpected error. Try again or go back.</p>
        <pre style={{whiteSpace:'pre-wrap', opacity: 0.7, fontSize: 12}}>{error.message}</pre>
        <button onClick={() => reset()} style={{padding:'8px 12px', borderRadius: 10, marginTop: 12}}>Try again</button>
      </body>
    </html>
  )
}
