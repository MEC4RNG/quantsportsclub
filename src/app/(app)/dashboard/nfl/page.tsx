export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'

const cellStyle = { padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,.1)' }

function pct(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(
    value,
  )
}

const statisticLabels: Record<string, string> = {
  passing_yards: 'Passing yards',
  rushing_yards: 'Rushing yards',
  receiving_yards: 'Receiving yards',
  receptions: 'Receptions',
  total_touchdowns: 'Touchdowns',
}

function signed(value: number) {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
}

export default async function NflResultsPage() {
  // The contract declares PRIVATE_QSC visibility, so this page never relies on
  // the deployment's optional middleware flag for access control.
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/dashboard/nfl')

  const latestResult = await prisma.nflGsimResult.findFirst({
    orderBy: { generatedAt: 'desc' },
    select: { season: true, week: true },
  })
  const results = latestResult
    ? await prisma.nflGsimResult.findMany({
        where: { season: latestResult.season, week: latestResult.week },
        orderBy: { generatedAt: 'desc' },
        include: {
          games: {
            orderBy: { scheduledStartDate: 'asc' },
            include: {
              totalLines: { orderBy: { threshold: 'asc' } },
              spreadLines: { orderBy: { homeHandicap: 'asc' } },
            },
          },
          blockedGames: { orderBy: { sourceGameId: 'asc' } },
          playerProjections: {
            orderBy: [
              { sourceGameId: 'asc' },
              { team: 'asc' },
              { position: 'asc' },
              { playerName: 'asc' },
            ],
            include: { thresholds: { orderBy: [{ statistic: 'asc' }, { threshold: 'asc' }] } },
          },
        },
      })
    : []

  // Each accepted result is immutable. A game-window delivery updates only the
  // games it contains, while older accepted games remain the current version.
  const currentGames = new Map<
    string,
    {
      game: (typeof results)[number]['games'][number]
      result: (typeof results)[number]
      players: (typeof results)[number]['playerProjections']
    }
  >()
  const blockedGames = new Map<string, (typeof results)[number]['blockedGames'][number]>()
  const resolvedGameIds = new Set<string>()
  for (const result of results) {
    for (const game of result.games) {
      if (resolvedGameIds.has(game.gameId)) continue
      resolvedGameIds.add(game.gameId)
      currentGames.set(game.gameId, {
        game,
        result,
        players: result.playerProjections.filter((player) => player.sourceGameId === game.gameId),
      })
    }
    for (const blocked of result.blockedGames) {
      if (resolvedGameIds.has(blocked.sourceGameId)) continue
      resolvedGameIds.add(blocked.sourceGameId)
      blockedGames.set(blocked.sourceGameId, blocked)
    }
  }
  const entries = [...currentGames.values()].sort(
    (a, b) => a.game.scheduledStartDate.getTime() - b.game.scheduledStartDate.getTime(),
  )
  const games = entries.map((entry) => entry.game)
  const playerProjections = entries.flatMap((entry) => entry.players)
  const newest = results[0]
  const readyCount = entries.filter(
    ({ game, result }) =>
      !game.provisional &&
      (game.decisionUse ?? result.decisionUse) === 'PRODUCTION_READY_NOT_FINAL_GAME_DAY',
  ).length

  return (
    <main style={{ maxWidth: 1120, margin: '40px auto', padding: 16 }}>
      <h1>NFL simulation results</h1>
      {!newest ? (
        <p style={{ opacity: 0.75 }}>No validated NFL GSIM result has been ingested.</p>
      ) : (
        <>
          <section
            style={{
              background: '#111a2e',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {newest.season} Week {newest.week}
            </h2>
            <p>
              <strong>Per-game readiness:</strong> {readyCount} ready ·{' '}
              {entries.length - readyCount} provisional
            </p>
            <p style={{ color: '#f6c85f' }}>
              These are Latest accepted projection per game, not picks or evidence of betting edge.
              Each game retains the readiness state from its own delivery.
            </p>
            <p style={{ marginBottom: 0, opacity: 0.8 }}>
              Combined from {results.length} accepted deliver{results.length === 1 ? 'y' : 'ies'} ·
              Latest update: {newest.generatedAt.toLocaleString()}
            </p>
            <nav
              style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}
              aria-label="NFL result sections"
            >
              <a href="#games" style={{ color: '#8fc7ff' }}>
                Games
              </a>
              <a href="#model-lines" style={{ color: '#8fc7ff' }}>
                Model lines
              </a>
              <a href="#player-projections" style={{ color: '#8fc7ff' }}>
                Player projections
              </a>
            </nav>
          </section>

          <div id="games" style={{ overflowX: 'auto', scrollMarginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={cellStyle} align="left">
                    Game
                  </th>
                  <th style={cellStyle} align="right">
                    Away win
                  </th>
                  <th style={cellStyle} align="right">
                    Home win
                  </th>
                  <th style={cellStyle} align="right">
                    Tie
                  </th>
                  <th style={cellStyle} align="right">
                    Projected score
                  </th>
                  <th style={cellStyle} align="right">
                    Total (P10/P50/P90)
                  </th>
                  <th style={cellStyle} align="left">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map(({ game, result: gameResult }) => (
                  <tr key={game.id}>
                    <td style={cellStyle}>
                      <Link
                        href={`/dashboard/nfl/${encodeURIComponent(game.gameId)}`}
                        style={{ color: '#8fc7ff', fontWeight: 700, textDecoration: 'none' }}
                      >
                        {game.awayTeam} at {game.homeTeam} →
                      </Link>
                    </td>
                    <td style={cellStyle} align="right">
                      {pct(game.awayWinProbability)}
                    </td>
                    <td style={cellStyle} align="right">
                      {pct(game.homeWinProbability)}
                    </td>
                    <td style={cellStyle} align="right">
                      {pct(game.tieProbability)}
                    </td>
                    <td style={cellStyle} align="right">
                      {game.projectedAwayScore.toFixed(1)}–{game.projectedHomeScore.toFixed(1)}
                    </td>
                    <td style={cellStyle} align="right">
                      {game.totalP10.toFixed(1)} / {game.totalP50.toFixed(1)} /{' '}
                      {game.totalP90.toFixed(1)}
                    </td>
                    <td style={cellStyle}>
                      {(game.decisionUse ?? gameResult.decisionUse) ===
                        'PRODUCTION_READY_NOT_FINAL_GAME_DAY' && !game.provisional
                        ? 'Declared ready'
                        : 'Provisional'}
                      <div style={{ opacity: 0.65, fontSize: 12 }}>
                        {gameResult.generatedAt.toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {games.some((game) => game.totalLines.length || game.spreadLines.length) && (
            <section id="model-lines" style={{ marginTop: 32, scrollMarginTop: 16 }}>
              <h2>Model line probabilities</h2>
              <p style={{ opacity: 0.8 }}>
                Model-only thresholds calculated after simulation. These are not sportsbook quotes,
                picks, or evidence of betting edge.
              </p>
              {games.map((game) => (
                <details key={`lines-${game.id}`} style={{ marginBottom: 12 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                    {game.awayTeam} at {game.homeTeam} ·{' '}
                    {game.totalLines.length + game.spreadLines.length} lines
                  </summary>
                  <div style={{ overflowX: 'auto', marginTop: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={cellStyle} align="left">
                            Market
                          </th>
                          <th style={cellStyle} align="right">
                            Threshold
                          </th>
                          <th style={cellStyle} align="right">
                            Over/Home cover
                          </th>
                          <th style={cellStyle} align="right">
                            Under/Away cover
                          </th>
                          <th style={cellStyle} align="right">
                            Push
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.totalLines.map((line) => (
                          <tr key={`total-${line.id}`}>
                            <td style={cellStyle}>Total</td>
                            <td style={cellStyle} align="right">
                              {line.threshold.toFixed(1)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.overProbability)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.underProbability)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.pushProbability)}
                            </td>
                          </tr>
                        ))}
                        {game.spreadLines.map((line) => (
                          <tr key={`spread-${line.id}`}>
                            <td style={cellStyle}>Home handicap</td>
                            <td style={cellStyle} align="right">
                              {signed(line.homeHandicap)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.homeCoverProbability)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.awayCoverProbability)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.pushProbability)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </section>
          )}

          {playerProjections.length > 0 && (
            <section id="player-projections" style={{ marginTop: 32, scrollMarginTop: 16 }}>
              <h2>Player projections</h2>
              <p style={{ opacity: 0.8 }}>
                Reconciled player outcomes from the same trials as the game projections. Thresholds
                are model-only and are not live book lines.
              </p>
              <p style={{ opacity: 0.8 }}>
                {playerProjections.length} players. Select a game above for a focused matchup view.
              </p>
              {playerProjections.map((player) => (
                <details key={player.id} style={{ marginBottom: 12 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                    {player.playerName} · {player.team} {player.position}
                  </summary>
                  <div style={{ overflowX: 'auto', marginTop: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={cellStyle} align="left">
                            Statistic
                          </th>
                          <th style={cellStyle} align="right">
                            Threshold
                          </th>
                          <th style={cellStyle} align="right">
                            Over
                          </th>
                          <th style={cellStyle} align="right">
                            Under
                          </th>
                          <th style={cellStyle} align="right">
                            Push
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {player.thresholds.map((line) => (
                          <tr key={line.id}>
                            <td style={cellStyle}>
                              {statisticLabels[line.statistic] ?? line.statistic}
                            </td>
                            <td style={cellStyle} align="right">
                              {line.threshold.toFixed(1)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.overProbability)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.underProbability)}
                            </td>
                            <td style={cellStyle} align="right">
                              {pct(line.pushProbability)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </section>
          )}

          {blockedGames.size > 0 && (
            <section style={{ marginTop: 32 }}>
              <h2>Blocked games</h2>
              <ul>
                {[...blockedGames.values()].map((game) => (
                  <li key={game.id}>
                    <strong>{game.sourceGameId}:</strong> {game.failure}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  )
}
