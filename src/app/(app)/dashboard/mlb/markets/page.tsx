import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { selectMarketForecasts, gradeMarketForecasts } from '@/lib/mlbMarket'
import { loadOfficialResults } from '@/lib/mlbOfficialResults'
import MlbRefresh from '@/components/MlbRefresh'
import styles from '../performance/performance.module.css'

export const dynamic = 'force-dynamic'

export default async function MlbMarketsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/dashboard/mlb/markets')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const from = new Date(`${today}T12:00:00Z`)
  from.setUTCDate(from.getUTCDate() - 29)
  const start = from.toISOString().slice(0, 10)
  const snapshots = await prisma.mlbMarketSnapshot.findMany({ where: { slateDate: { gte: start, lte: today } },
    select: { id: true, payloadHash: true, modelPayloadHash: true, receivedAt: true, payload: true, modelResult: { select: { payload: true } } } })
  const cohort = selectMarketForecasts(snapshots)
  const official = await loadOfficialResults(cohort.forecasts.map(row => row.date))
  const report = gradeMarketForecasts(cohort.forecasts, official.games)
  const latest = snapshots.reduce<Date | null>((value, row) => !value || row.receivedAt > value ? row.receivedAt : value, null)
  const metric = (value: number | null) => value === null ? '—' : value.toFixed(3)
  return <main className={styles.main}>
    <MlbRefresh />
    <Link href="/dashboard/mlb">← MLB models</Link>
    <h1>MLB market research</h1>
    <p>{start} through {today} · Private QSC research</p>
    <p className={styles.notice}>Model probabilities compared with observed moneyline prices. These are probability benchmarks, not betting returns. Sportsbook settlement terms remain unverified.</p>
    <p>{report.uniqueGames} distinct games · {report.rows.length} game/sportsbook pairs. Each sportsbook is scored separately.</p>
    <p>Latest website receipt: {latest ? latest.toISOString() : 'Waiting for the first delivery'}.</p>
    <div className={styles.scroll}><table>
      <caption>First eligible website receipt per game and sportsbook. Lower Brier scores are better.</caption>
      <thead><tr><th>Sportsbook</th><th>Observed games</th><th>Graded games</th><th>Model Brier</th><th>Normalized market Brier</th></tr></thead>
      <tbody>{report.books.map(book => <tr key={book.bookmaker}><td>{book.bookmaker}</td><td>{book.observed}</td><td>{book.graded}</td>
        <td>{metric(book.modelBrier)}</td><td>{metric(book.marketBrier)}</td></tr>)}</tbody>
    </table></div>
    {!report.rows.length && <p className={styles.notice}>No eligible market observations have reached this website before game start yet. Older local research is not backfilled into this cohort.</p>}
    {official.unavailable.length > 0 && <p role="status">Official results unavailable for {official.unavailable.join(', ')}. Affected games are not graded.</p>}
    <p>{cohort.excluded} observed pairs excluded at receipt · {cohort.invalidSnapshots} invalid snapshots omitted.</p>
    <h2>Observation ledger</h2>
    <div className={styles.scroll}><table>
      <caption>Historical observations, not current offers. Times and hashes remain attached to each pair.</caption>
      <thead><tr><th>Date / game</th><th>Sportsbook</th><th>Home model</th><th>Home market</th><th>Status</th><th>Evidence</th></tr></thead>
      <tbody>{report.rows.map(row => <tr key={`${row.game.game_id}:${row.quote.bookmaker}`}>
        <td>{row.date}<br />{row.game.away_team} at {row.game.home_team}</td><td>{row.quote.bookmaker}</td>
        <td>{(row.game.projection!.home_win_probability * 100).toFixed(1)}%</td><td>{(row.marketProbability * 100).toFixed(1)}%</td><td>{row.status}</td>
        <td><details><summary>Receipt and prices</summary><p>Received: {row.receivedAt}<br />Collected: {row.fetchedAt}<br />Book updated: {row.quote.book_updated_at}<br />
          Decimal prices: away {row.quote.away_decimal}, home {row.quote.home_decimal}<br />Receipt: {row.snapshotId}<br />Market SHA-256: {row.hash}<br />Model SHA-256: {row.modelHash}<br />Odds source SHA-256: {row.oddsHash}</p></details></td>
      </tr>)}</tbody>
    </table></div>
    <details className={styles.method}><summary>Method and limitations</summary>
      <p>Selection uses the first eligible website receipt for each game and sportsbook, strictly before both scheduled starts. Each observation must match an existing model payload, with a model no older than 90 minutes and prices no older than 30 minutes at receipt. Later prices or forecasts do not replace the selection.</p>
      <p>Market probability divides the inverse home decimal price by the sum of both inverse prices. This proportional normalization is a descriptive convention, not a validated fair-price estimate. Scores use verified official MLB finals with matching identities and start times. Each sportsbook row contains one observation per game; different sportsbooks are not independent games.</p>
      <p>The three daily collection windows sample prices rather than provide continuous coverage. Missing quotes and unavailable models are excluded. There is no wager ledger, profit, ROI, closing-line value or automated betting. A small sample does not establish an edge.</p>
      <p>Sources: <a href="https://the-odds-api.com/sports-odds-data/betting-markets.html">The Odds API market definitions</a> and <a href="https://statsapi.mlb.com/api/v1/schedule?sportId=1">official MLB scores</a>. Finals refresh on access with up to 15 minutes of caching.</p>
    </details>
  </main>
}
