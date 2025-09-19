export const dynamic = 'force-dynamic'

import {
  getExposureOverview,
  getExposureAnalytics,
  type ExposureOverview,
  type ExposureAnalytics,
  type BySportRow,
  type ByMarketRow,
} from '@/lib/exposure'
import { ExposureCharts } from '@/components/charts/ExposureCharts'

function fmt(n: number) {
  const s = n.toFixed(2)
  return n > 0 ? `+${s}` : s
}

export default async function ExposurePage({
  searchParams,
}: {
  // Next.js 15: searchParams comes in as a Promise
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const daysParam = typeof sp?.days === 'string' ? Number(sp.days) : undefined
  const days =
    Number.isFinite(daysParam) && (daysParam as number) > 0
      ? (daysParam as number)
      : undefined

  const [overview, analytics]: [ExposureOverview, ExposureAnalytics] = await Promise.all([
    getExposureOverview(days),
    getExposureAnalytics(days),
  ])

  return (
    <main style={{ maxWidth: 1024, margin: '40px auto', padding: 16 }}>
      <h1>Exposure</h1>
      <p style={{ opacity: 0.8 }}>
        Snapshot of pending risk and realized PnL{days ? ` for the last ${days} days` : ''}.{' '}
        Use <code>?days=30</code> to filter.
      </p>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginTop: 16,
        }}
      >
        <div
          style={{
            padding: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Pending Exposure</h3>
          <div style={{ fontSize: 28, fontWeight: 800 }}>
            {overview.pendingTotal.toFixed(2)} units
          </div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Unsettled stake currently at risk
          </div>
        </div>

        <div
          style={{
            padding: 16,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Realized PnL</h3>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: overview.pnlTotal >= 0 ? '#7ee787' : '#ff7b72',
            }}
          >
            {fmt(overview.pnlTotal)} units
          </div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Settled profit & loss</div>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>By Sport</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">Sport</th>
              <th align="right">Pending</th>
              <th align="right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {overview.bySport.map((row: BySportRow) => (
              <tr key={row.sport}>
                <td>{row.sport}</td>
                <td align="right">{row.pending.toFixed(2)}</td>
                <td
                  align="right"
                  style={{ color: row.pnl >= 0 ? '#7ee787' : '#ff7b72' }}
                >
                  {fmt(row.pnl)}
                </td>
              </tr>
            ))}
            {overview.bySport.length === 0 && (
              <tr>
                <td colSpan={3} style={{ opacity: 0.7 }}>
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>By Market</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th align="left">Market</th>
              <th align="right">Pending</th>
              <th align="right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {overview.byMarket.map((row: ByMarketRow) => (
              <tr key={row.market}>
                <td>{row.market}</td>
                <td align="right">{row.pending.toFixed(2)}</td>
                <td
                  align="right"
                  style={{ color: row.pnl >= 0 ? '#7ee787' : '#ff7b72' }}
                >
                  {fmt(row.pnl)}
                </td>
              </tr>
            ))}
            {overview.byMarket.length === 0 && (
              <tr>
                <td colSpan={3} style={{ opacity: 0.7 }}>
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Trends</h2>
        <ExposureCharts
          daily={analytics.daily}
          pendingBySport={analytics.pendingBySport}
        />
      </section>
    </main>
  )
}
