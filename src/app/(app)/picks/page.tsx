// src/app/(app)/picks/page.tsx
export const dynamic = 'force-dynamic'

import {
  getPendingBets,
  getCurrentBankrollUnits,
  type PendingBetRow,
} from '@/lib/picks'
import {
  impliedFromAmerican,
  americanToDecimal,
  kellyFraction,
} from '@/lib/odds'

function fmtUnits(n: number) {
  const s = n.toFixed(2)
  return n >= 0 ? `+${s}` : s
}

export default async function PicksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  // kellyMult=0.5 by default, allow override via ?kelly=0.25|0.5|1
  const kmRaw = typeof sp?.kelly === 'string' ? Number(sp.kelly) : 0.5
  const kellyMult = Number.isFinite(kmRaw) && kmRaw > 0 && kmRaw <= 1 ? kmRaw : 0.5

  const [bankroll, bets] = await Promise.all([
    getCurrentBankrollUnits(),
    getPendingBets(100),
  ])

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: 16 }}>
      <h1>Picks (Pending)</h1>
      <p style={{ opacity: 0.8 }}>
        Bankroll: <strong>{bankroll.toFixed(2)}u</strong> · Kelly Mult:{' '}
        <strong>{(kellyMult * 100).toFixed(0)}%</strong>{' '}
        <span style={{ opacity: 0.8 }}>
          (use <code>?kelly=0.25</code> or <code>?kelly=1</code>)
        </span>
      </p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead>
          <tr>
            <th align="left">When</th>
            <th align="left">Sport</th>
            <th align="left">Market</th>
            <th align="left">Pick</th>
            <th align="right">Book</th>
            <th align="right">Fair</th>
            <th align="right">Imp. Win</th>
            <th align="right">Kelly f</th>
            <th align="right">Recommend</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((b: PendingBetRow) => {
            const p =
              typeof b.fairOdds === 'number'
                ? impliedFromAmerican(b.fairOdds)
                : typeof b.bookOdds === 'number'
                ? impliedFromAmerican(b.bookOdds)
                : NaN

            const d =
              typeof b.bookOdds === 'number'
                ? americanToDecimal(b.bookOdds)
                : NaN

            const fKelly = Number.isFinite(p) && Number.isFinite(d) ? kellyFraction(p, d) : 0
            const recUnits = bankroll * fKelly * kellyMult

            return (
              <tr key={b.id}>
                <td>{new Date(b.createdAt).toLocaleString()}</td>
                <td>{b.sport}</td>
                <td>{b.market ?? '—'}</td>
                <td>{b.pick ?? '—'}</td>
                <td align="right">{b.bookOdds ?? '—'}</td>
                <td align="right">{b.fairOdds ?? '—'}</td>
                <td align="right">{Number.isFinite(p) ? (p * 100).toFixed(1) + '%' : '—'}</td>
                <td align="right">{fKelly > 0 ? (fKelly * 100).toFixed(1) + '%' : '—'}</td>
                <td align="right" style={{ fontWeight: 700 }}>
                  {Number.isFinite(recUnits) && recUnits > 0 ? fmtUnits(recUnits) + 'u' : '—'}
                </td>
              </tr>
            )
          })}
          {bets.length === 0 && (
            <tr>
              <td colSpan={9} style={{ opacity: 0.7 }}>
                No pending picks.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
