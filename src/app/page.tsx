export const dynamic = 'force-dynamic'

import Link from 'next/link'

export default function Page() {
  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: 24 }}>
      <h1
        style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          lineHeight: 1.05,
          margin: '0 0 12px',
        }}
      >
        Bet smarter. Build edge.
      </h1>

      <p style={{ maxWidth: 720, fontSize: 18, opacity: 0.9 }}>
        QuantSportsClub is a hub for data-driven sports analysis. Track models, publish picks,
        and learn Billy-Walters-style bankroll discipline. This is a starter skeleton—plug in your
        APIs, sheets, and dashboards next.
      </p>

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Link
          href="/dashboard"
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'var(--color-primary, #7ee787)',
            color: '#0b1220',
            fontWeight: 700,
          }}
        >
          Open Dashboard
        </Link>
        <Link
          href="/about"
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'var(--color-primary, #7ee787)',
            color: '#0b1220',
            fontWeight: 700,
          }}
        >
          Learn more
        </Link>
      </div>
    </main>
  )
}
