'use client'

export default function MlbError({ reset }: { reset: () => void }) {
  return <main style={{ maxWidth: 1160, margin: '40px auto', padding: 20 }}>
    <h1>MLB results temporarily unavailable</h1>
    <p>The latest snapshot could not be loaded.</p>
    <button onClick={reset}>Try again</button>
  </main>
}
