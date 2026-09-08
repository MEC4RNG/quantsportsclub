export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { nflResultsDescription } from '@/lib/nflGsimPresentation'

const cellStyle = { padding: '10px 8px', borderBottom: '1px solid rgba(255,255,255,.1)' }
const cardStyle = {
  background: '#111a2e',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 12,
  padding: 16,
}

function pct(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value)
}

function signed(value: number) {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
}

const statisticLabels: Record<string, string> = {
  passing_yards: 'Passing yards',
  rushing_yards: 'Rushing yards',
  receiving_yards: 'Receiving yards',
  receptions: 'Receptions',
  total_touchdowns: 'Touchdowns',
}

export default async function NflGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const session = await getServerSession(authOptions)
  const { gameId } = await params
  if (!session) redirect(`/auth/signin?callbackUrl=/dashboard/nfl/${encodeURIComponent(gameId)}`)

  const result = await prisma.nflGsimResult.findFirst({
    orderBy: { generatedAt: 'desc' },
    include: {
      games: {
        where: { gameId },
        include: {
          totalLines: { orderBy: { threshold: 'asc' } },
          spreadLines: { orderBy: { homeHandicap: 'asc' } },
        },
      },
      playerProjections: {
        where: { sourceGameId: gameId },
        orderBy: [{ team: 'asc' }, { position: 'asc' }, { playerName: 'asc' }],
        include: { thresholds: { orderBy: [{ statistic: 'asc' }, { threshold: 'asc' }] } },
      },
    },
  })

  const game = result?.games[0]
  if (!result || !game) notFound()

  return (
    <main style={{ maxWidth: 1120, margin: '40px auto', padding: 16 }}>
      <Link href="/dashboard/nfl" style={{ color: '#8fc7ff' }}>← Back to NFL Week {result.week}</Link>
      <header style={{ ...cardStyle, marginTop: 16, marginBottom: 24 }}>
        <p style={{ margin: 0, opacity: 0.75 }}>{result.season} Week {result.week} · {game.scheduledStartDate.toLocaleDateString()}</p>
        <h1 style={{ marginBottom: 8 }}>{game.awayTeam} at {game.homeTeam}</h1>
        <p style={{ color: '#f6c85f' }}>
          {nflResultsDescription(result.decisionUse)}. Model probabilities are not sportsbook quotes, picks, or evidence of betting edge.
        </p>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }} aria-label="Game result sections">
          <a href="#outlook" style={{ color: '#8fc7ff' }}>Game outlook</a>
          <a href="#lines" style={{ color: '#8fc7ff' }}>Model lines</a>
          <a href="#players" style={{ color: '#8fc7ff' }}>Player projections ({result.playerProjections.length})</a>
        </nav>
      </header>

      <section id="outlook" style={{ scrollMarginTop: 16 }}>
        <h2>Game outlook</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div style={cardStyle}><strong>{game.awayTeam} win</strong><div style={{ fontSize: 28 }}>{pct(game.awayWinProbability)}</div></div>
          <div style={cardStyle}><strong>{game.homeTeam} win</strong><div style={{ fontSize: 28 }}>{pct(game.homeWinProbability)}</div></div>
          <div style={cardStyle}><strong>Projected score</strong><div style={{ fontSize: 28 }}>{game.projectedAwayScore.toFixed(1)}–{game.projectedHomeScore.toFixed(1)}</div></div>
          <div style={cardStyle}><strong>Projected total</strong><div style={{ fontSize: 28 }}>{game.projectedTotalCalibrated.toFixed(1)}</div></div>
        </div>
        <p style={{ opacity: 0.8 }}>
          Total range (P10/P50/P90): {game.totalP10.toFixed(1)} / {game.totalP50.toFixed(1)} / {game.totalP90.toFixed(1)} · {game.provisional ? 'Provisional' : 'Declared ready'}
        </p>
      </section>

      <section id="lines" style={{ marginTop: 32, scrollMarginTop: 16 }}>
        <h2>Model line probabilities</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={cellStyle} align="left">Market</th><th style={cellStyle} align="right">Threshold</th><th style={cellStyle} align="right">Over/Home cover</th><th style={cellStyle} align="right">Under/Away cover</th><th style={cellStyle} align="right">Push</th></tr></thead>
            <tbody>
              {game.totalLines.map((line) => <tr key={line.id}><td style={cellStyle}>Total</td><td style={cellStyle} align="right">{line.threshold.toFixed(1)}</td><td style={cellStyle} align="right">{pct(line.overProbability)}</td><td style={cellStyle} align="right">{pct(line.underProbability)}</td><td style={cellStyle} align="right">{pct(line.pushProbability)}</td></tr>)}
              {game.spreadLines.map((line) => <tr key={line.id}><td style={cellStyle}>Home handicap</td><td style={cellStyle} align="right">{signed(line.homeHandicap)}</td><td style={cellStyle} align="right">{pct(line.homeCoverProbability)}</td><td style={cellStyle} align="right">{pct(line.awayCoverProbability)}</td><td style={cellStyle} align="right">{pct(line.pushProbability)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section id="players" style={{ marginTop: 32, scrollMarginTop: 16 }}>
        <h2>Player projections</h2>
        <p style={{ opacity: 0.8 }}>{result.playerProjections.length} players from this matchup, derived from the same {result.trialsPerGame.toLocaleString()} simulation trials.</p>
        {result.playerProjections.map((player) => (
          <details key={player.id} style={{ ...cardStyle, marginBottom: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
              {player.playerName} · {player.team} {player.position}
            </summary>
            <p style={{ opacity: 0.8 }}>
              Mean: {player.passingYards.toFixed(1)} pass yds · {player.rushingYards.toFixed(1)} rush yds · {player.receivingYards.toFixed(1)} rec yds · {player.receptions.toFixed(1)} receptions · {player.totalTouchdowns.toFixed(2)} TD
            </p>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={cellStyle} align="left">Statistic</th><th style={cellStyle} align="right">Threshold</th><th style={cellStyle} align="right">Over</th><th style={cellStyle} align="right">Under</th><th style={cellStyle} align="right">Push</th></tr></thead>
              <tbody>{player.thresholds.map((line) => <tr key={line.id}><td style={cellStyle}>{statisticLabels[line.statistic] ?? line.statistic}</td><td style={cellStyle} align="right">{line.threshold.toFixed(1)}</td><td style={cellStyle} align="right">{pct(line.overProbability)}</td><td style={cellStyle} align="right">{pct(line.underProbability)}</td><td style={cellStyle} align="right">{pct(line.pushProbability)}</td></tr>)}</tbody>
            </table></div>
          </details>
        ))}
      </section>
    </main>
  )
}
