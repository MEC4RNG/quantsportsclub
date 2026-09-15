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
import { getSessionUserId } from '@/lib/sessionUser'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import styles from './exposure.module.css'

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
  const userId = await getSessionUserId()
  if (!userId) redirect('/auth/signin?callbackUrl=/exposure')
  const sp = await searchParams
  const daysParam = typeof sp?.days === 'string' ? Number(sp.days) : undefined
  const days =
    Number.isFinite(daysParam) && (daysParam as number) > 0
      ? (daysParam as number)
      : undefined

  const [overview, analytics]: [ExposureOverview, ExposureAnalytics] = await Promise.all([
    getExposureOverview(userId, days),
    getExposureAnalytics(userId, days),
  ])

  return (
    <main className={styles.main}>
      <h1>Exposure</h1>
      <p className={styles.intro}>
        Pending risk and realized PnL{days ? ` for the last ${days} days` : ' across all recorded bets'}.
      </p>
      <nav className={styles.windows} aria-label="Performance window">
        {[7, 30, 90].map((window) => (
          <Link
            key={window}
            href={`/exposure?days=${window}`}
            className={days === window ? styles.active : undefined}
            aria-current={days === window ? 'page' : undefined}
          >
            {window} days
          </Link>
        ))}
        <Link
          href="/exposure"
          className={!days ? styles.active : undefined}
          aria-current={!days ? 'page' : undefined}
        >
          All time
        </Link>
      </nav>

      <section className={styles.summary} aria-label="Exposure summary">
        <article className={styles.card}>
          <h2>Pending exposure</h2>
          <div className={styles.value}>
            {overview.pendingTotal.toFixed(2)} units
          </div>
          <p className={styles.help}>Unsettled stake currently at risk</p>
        </article>

        <article className={styles.card}>
          <h2>Realized PnL</h2>
          <div
            className={styles.value}
            style={{
              color: overview.pnlTotal >= 0 ? '#7ee787' : '#ff7b72',
            }}
          >
            {fmt(overview.pnlTotal)} units
          </div>
          <p className={styles.help}>Settled profit and loss</p>
        </article>
      </section>

      <section className={styles.section}>
        <h2>By sport</h2>
        <div className={styles.tableWrap}><table className={styles.table}>
          <caption className="sr-only">Exposure and realized PnL by sport</caption>
          <thead>
            <tr>
              <th scope="col" align="left">Sport</th>
              <th scope="col" align="right">Pending</th>
              <th scope="col" align="right">PnL</th>
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
                <td colSpan={3} className={styles.empty}>
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table></div>
      </section>

      <section className={styles.section}>
        <h2>By market</h2>
        <div className={styles.tableWrap}><table className={styles.table}>
          <caption className="sr-only">Exposure and realized PnL by market</caption>
          <thead>
            <tr>
              <th scope="col" align="left">Market</th>
              <th scope="col" align="right">Pending</th>
              <th scope="col" align="right">PnL</th>
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
                <td colSpan={3} className={styles.empty}>
                  No data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table></div>
      </section>

      <section className={styles.section}>
        <h2>Trends</h2>
        <ExposureCharts
          daily={analytics.daily}
          pendingBySport={analytics.pendingBySport}
        />
      </section>
    </main>
  )
}
