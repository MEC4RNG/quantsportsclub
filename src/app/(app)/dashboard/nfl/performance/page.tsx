import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { gradeNflForecasts, selectNflForecasts } from '@/lib/nflPerformance'
import { loadNflResults } from '@/lib/nflOfficialResults'
import PerformanceRefresh from '@/components/PerformanceRefresh'
import styles from '../../mlb/performance/performance.module.css'

export const dynamic = 'force-dynamic'

export default async function NflPerformancePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/dashboard/nfl/performance')

  const latest = await prisma.nflGsimResult.findFirst({
    orderBy: [{ season: 'desc' }, { week: 'desc' }, { generatedAt: 'desc' }],
    select: { season: true },
  })
  const results = latest
    ? await prisma.nflGsimResult.findMany({
        where: { season: latest.season },
        select: {
          id: true,
          payloadHash: true,
          generatedAt: true,
          createdAt: true,
          season: true,
          week: true,
          trialsPerGame: true,
          marketIndependent: true,
          decisionUse: true,
          games: {
            select: {
              gameId: true,
              awayTeam: true,
              homeTeam: true,
              awayWinProbability: true,
              homeWinProbability: true,
              tieProbability: true,
              projectedMarginHome: true,
              projectedTotalCalibrated: true,
              validTrials: true,
              invalidTrials: true,
              provisional: true,
              decisionUse: true,
            },
          },
        },
      })
    : []
  const cohort = selectNflForecasts(results)
  const weeks = [...new Set(results.map((result) => result.week))].sort((a, b) => a - b)
  const official = latest
    ? await loadNflResults(latest.season, weeks)
    : { games: new Map(), scheduledGames: 0, sourceUrl: '', sourceHash: null, unavailable: false }
  const report = gradeNflForecasts(cohort.forecasts, official.games, official.scheduledGames)
  const metric = (value: number | null, digits = 3) =>
    value === null ? '—' : value.toFixed(digits)
  const pct = (value: number | null) => (value === null ? '—' : `${(value * 100).toFixed(1)}%`)
  const weekLabel = weeks.length ? `Weeks ${weeks[0]}–${weeks.at(-1)}` : 'No received weeks'

  return (
    <main className={styles.main}>
      <PerformanceRefresh />
      <Link href="/dashboard/nfl">← NFL models</Link>
      <h1>NFL model performance</h1>
      <p>
        {latest?.season ?? 'Current season'} · {weekLabel} · Private QSC research
      </p>
      <p className={styles.notice}>
        First eligible pregame forecasts compared with verified final scores. Accuracy and delivery
        coverage are reported separately; these are not betting returns.
      </p>
      <div className={styles.metrics}>
        <article>
          <h2>Schedule coverage</h2>
          <strong>{pct(report.coverage)}</strong>
          <p>
            {report.eligible} eligible forecasts across {report.scheduled} scheduled games
          </p>
        </article>
        <article>
          <h2>Games graded</h2>
          <strong>{report.graded}</strong>
          <p>{report.pending} pending or awaiting verified results</p>
        </article>
        <article>
          <h2>Multiclass Brier</h2>
          <strong>{metric(report.brier)}</strong>
          <p>Away, home and tie · lower is better · 0–2 scale</p>
        </article>
        <article>
          <h2>Total-points MAE</h2>
          <strong>{metric(report.totalMae, 2)}</strong>
          <p>Average absolute error in points</p>
        </article>
        <article>
          <h2>Home-margin MAE</h2>
          <strong>{metric(report.marginMae, 2)}</strong>
          <p>Average absolute home-margin error</p>
        </article>
        <article>
          <h2>Winner accuracy</h2>
          <strong>{pct(report.winnerAccuracy)}</strong>
          <p>Largest-probability outcome, including ties</p>
        </article>
      </div>
      <p>
        {cohort.excluded + report.excluded} observed games excluded from scoring. Graded schedule
        coverage: {pct(report.gradedCoverage)}. Total bias: {metric(report.totalBias, 2)} points;
        positive means totals were overpredicted.
      </p>
      {official.unavailable && (
        <p role="status">
          The final-score source is temporarily unavailable. Forecasts remain intact and no games
          are graded until verified results return.
        </p>
      )}
      <h2>Forecast ledger</h2>
      <div className={styles.scroll}>
        <table>
          <caption>One first eligible QSC pregame receipt per game. Scores list away–home.</caption>
          <thead>
            <tr>
              <th>Week / game</th>
              <th>Home / away / tie</th>
              <th>Projected total</th>
              <th>Final</th>
              <th>Status</th>
              <th>Audit</th>
            </tr>
          </thead>
          <tbody>
            {report.rows
              .sort((a, b) => b.week - a.week || a.game.gameId.localeCompare(b.game.gameId))
              .map((row) => (
                <tr key={row.game.gameId}>
                  <td>
                    Week {row.week}
                    <br />
                    {row.game.awayTeam} at {row.game.homeTeam}
                  </td>
                  <td>
                    {pct(row.game.homeWinProbability)} / {pct(row.game.awayWinProbability)} /{' '}
                    {pct(row.game.tieProbability)}
                  </td>
                  <td>{row.game.projectedTotalCalibrated.toFixed(1)}</td>
                  <td>{row.awayScore === null ? '—' : `${row.awayScore}–${row.homeScore}`}</td>
                  <td>{row.status}</td>
                  <td>
                    <details>
                      <summary>{row.game.gameId}</summary>
                      <p>
                        Received: {row.receivedAt}
                        <br />
                        Generated: {row.generatedAt}
                        <br />
                        Receipt: {row.resultId}
                        <br />
                        Payload SHA-256: {row.hash}
                      </p>
                    </details>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!report.rows.length && <p>No eligible NFL pregame receipts yet.</p>}
      <details className={styles.method}>
        <summary>Method, source and limitations</summary>
        <p>
          Selection rule v1: earliest website receipt per game with declared game-level readiness,
          exactly 1,000 valid and zero invalid trials, market-independent execution, and receipt no
          more than 90 minutes after generation. Selection occurs before final scores are loaded, so
          outcomes cannot change the cohort.
        </p>
        <p>
          Exact nflverse game ID, season, week and team identities must match. The receipt must
          precede the scheduled kickoff. Missing scores remain pending; NFL ties are graded as a
          third outcome. Source corrections update these descriptive metrics.
        </p>
        <p>
          Multiclass Brier is the sum of squared errors across away-win, home-win and tie
          probabilities. Total and margin metrics use the calibrated mean total and projected home
          margin. Small samples do not establish calibration or profitability.
        </p>
        <p>
          Coverage denominator is every regular-season game in the received weeks, including games
          with no eligible forecast. Source:{' '}
          <a href={official.sourceUrl}>nflverse schedule release</a>. Source SHA-256:{' '}
          {official.sourceHash ?? 'unavailable'}. Results are cached for up to 15 minutes.
        </p>
      </details>
    </main>
  )
}
