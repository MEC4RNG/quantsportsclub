import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { selectForecasts, gradeForecasts } from '@/lib/mlbPerformance'
import { loadOfficialResults } from '@/lib/mlbOfficialResults'
import MlbRefresh from '@/components/MlbRefresh'
import styles from './performance.module.css'

export const dynamic = 'force-dynamic'

export default async function MlbPerformancePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/dashboard/mlb/performance')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const from = new Date(`${today}T12:00:00Z`)
  from.setUTCDate(from.getUTCDate() - 29)
  const start = from.toISOString().slice(0, 10)
  const snapshots = await prisma.mlbGsimResult.findMany({
    where: { slateDate: { gte: start, lte: today } },
    select: { id: true, payloadHash: true, receivedAt: true, payload: true },
  })
  const cohort = selectForecasts(snapshots)
  const official = await loadOfficialResults(cohort.forecasts.map(f => f.date))
  const report = gradeForecasts(cohort.forecasts, official.games)
  const metric = (value: number | null, digits = 3) => value === null ? '—' : value.toFixed(digits)
  return <main className={styles.main}>
    <MlbRefresh />
    <Link href="/dashboard/mlb">← MLB models</Link>
    <h1>MLB model performance</h1>
    <p>{start} through {today} · Last 30 slate dates · Private QSC research</p>
    <p className={styles.notice}>Pregame forecasts compared with official final scores. These are model accuracy measures, not betting returns.</p>
    <div className={styles.metrics}>
      <article><h2>Games graded</h2><strong>{report.graded}</strong><p>{report.pending} pending or awaiting verified results</p></article>
      <article><h2>Home-win Brier score</h2><strong>{metric(report.brier)}</strong><p>Lower is better · 0–1 scale</p></article>
      <article><h2>Total-runs MAE</h2><strong>{metric(report.totalMae, 2)}</strong><p>Average absolute error in runs</p></article>
      <article><h2>Total-runs bias</h2><strong>{metric(report.totalBias, 2)}</strong><p>Positive means totals were overpredicted</p></article>
    </div>
    <p>{cohort.excluded + report.excluded} observed games excluded from scoring. {cohort.invalidSnapshots} invalid snapshots omitted.</p>
    {official.unavailable.length > 0 && <p role="status">Official results could not be retrieved for {official.unavailable.join(', ')}. Affected games are not scored; other verified results remain visible.</p>}
    {report.graded === 0 && <p className={styles.notice}>No verified final results in this cohort yet. Metrics will populate when eligible games finish and official results are available.</p>}
    <h2>Forecast ledger</h2>
    <div className={styles.scroll}><table>
      <caption>One first eligible QSC pregame receipt per game. Scores list away–home.</caption>
      <thead><tr><th>Date / game</th><th>Home win</th><th>Mean total</th><th>Final</th><th>Status</th><th>Audit</th></tr></thead>
      <tbody>{report.rows.sort((a, b) => b.date.localeCompare(a.date) || a.game.game_id.localeCompare(b.game.game_id)).map(row =>
        <tr key={row.game.game_id}><td>{row.date}<br />{row.game.away_team} at {row.game.home_team}</td>
          <td>{(row.game.projection!.home_win_probability * 100).toFixed(1)}%</td>
          <td>{row.game.projection!.game_total_mean.toFixed(2)}</td>
          <td>{row.homeRuns === null ? '—' : `${row.awayRuns}–${row.homeRuns}`}</td><td>{row.status}</td>
          <td><details><summary>{row.game.run_id}</summary><p>Received: {row.receivedAt}<br />Snapshot: {row.generatedAt}<br />Receipt: {row.snapshotId}<br />SHA-256: {row.hash}</p></details></td></tr>)}</tbody>
    </table></div>
    {!report.rows.length && <p>No eligible pregame receipts yet. Historical outputs first received after game start are excluded.</p>}
    <details className={styles.method}><summary>Method and limitations</summary>
      <p>Selection rule v1: earliest QSC receipt per game in this window with an eligible pregame projection, received strictly before its scheduled start and no more than 90 minutes after source generation. Reference-only outputs are excluded. Later updates do not replace the selected forecast.</p>
      <p>Each game counts once. Final scores must match team identities and the official scheduled start must remain later than receipt. Missing, tied, suspended, postponed, or otherwise unverified finals are not graded. Official score corrections update these descriptive metrics.</p>
      <p>Brier score is the mean squared difference between home-win probability and the home-win outcome. MAE is the mean absolute difference between projected and actual total runs. All graded games in the cohort contribute, including incorrect predictions. A small sample does not establish calibration or profitability.</p>
      <p>Coverage is limited to predictions received by this website before start; it is not the entire private simulator history. Games absent from all received snapshots are outside this coverage. Source: <a href="https://statsapi.mlb.com/api/v1/schedule?sportId=1">MLB official schedule and scores</a>. Results are cached for up to 15 minutes and refreshed on access; this page checks each minute while visible.</p>
    </details>
  </main>
}
