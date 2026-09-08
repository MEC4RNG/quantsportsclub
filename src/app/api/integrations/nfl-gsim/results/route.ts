import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateNflGsimService } from '@/lib/serviceAuth'
import { hasValidNflGsimPayloadHash } from '@/lib/nflGsimIntegrity'
import { nflGsimResultsSchema } from '@/schemas/nflGsimResults'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 1024 * 1024

export async function POST(req: NextRequest) {
  const auth = authenticateNflGsimService(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  if (req.headers.get('content-type')?.split(';', 1)[0]?.trim() !== 'application/json') {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const declaredLength = Number(req.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const rawBody = await req.text()
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let unknownPayload: unknown
  try {
    unknownPayload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parsed = nflGsimResultsSchema.safeParse(unknownPayload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload does not match qsc.nfl_gsim.results.v1' }, { status: 422 })
  }

  const payload = parsed.data
  if (!hasValidNflGsimPayloadHash(payload)) {
    return NextResponse.json({ error: 'Payload hash mismatch' }, { status: 422 })
  }

  const result = await prisma.nflGsimResult.upsert({
    where: { payloadHash: payload.payload_hash },
    update: {},
    create: {
      schemaVersion: payload.schema_version,
      payloadHash: payload.payload_hash,
      generatedAt: new Date(payload.generated_at_utc),
      season: payload.season,
      week: payload.week,
      trialsPerGame: payload.run.trials_per_game,
      masterSeed: payload.run.master_seed,
      marketIndependent: payload.run.market_independent,
      scheduledGames: payload.run.scheduled_games,
      simulatedGames: payload.run.simulated_games,
      snapshotStatus: payload.readiness.snapshot_status,
      weatherStatus: payload.readiness.weather_status,
      injuryFeedAvailable: payload.readiness.injury_feed_available,
      refreshArtifactHash: payload.readiness.refresh_artifact_hash,
      visibility: payload.publication.visibility,
      decisionUse: payload.publication.decision_use,
      blockedGames: {
        create: payload.blocked_games.map((blocked) => ({
          sourceGameId: blocked.source_game_id,
          failure: blocked.failure,
        })),
      },
      games: {
        create: payload.games.map((game) => ({
          gameId: game.game_id,
          scheduledStartDate: new Date(`${game.scheduled_start_date}T00:00:00.000Z`),
          awayTeam: game.away_team,
          homeTeam: game.home_team,
          awayWinProbability: game.away_win_probability,
          homeWinProbability: game.home_win_probability,
          tieProbability: game.tie_probability,
          projectedAwayScore: game.projected_away_score,
          projectedHomeScore: game.projected_home_score,
          projectedMarginHome: game.projected_margin_home,
          projectedTotalRaw: game.projected_total_raw,
          projectedTotalCalibrated: game.projected_total_calibrated,
          totalP10: game.total_p10,
          totalP50: game.total_p50,
          totalP90: game.total_p90,
          validTrials: game.valid_trials,
          invalidTrials: game.invalid_trials,
          provisional: game.provisional,
          modelRelease: game.model_release,
          runtimeArtifactHash: game.runtime_artifact_hash,
          totalLines: {
            create: (game.model_total_lines ?? []).map((line) => ({
              threshold: line.threshold,
              overProbability: line.over_probability,
              underProbability: line.under_probability,
              pushProbability: line.push_probability,
            })),
          },
          spreadLines: {
            create: (game.model_spread_lines ?? []).map((line) => ({
              homeHandicap: line.home_handicap,
              homeCoverProbability: line.home_cover_probability,
              awayCoverProbability: line.away_cover_probability,
              pushProbability: line.push_probability,
            })),
          },
        })),
      },
      playerProjections: {
        create: (payload.player_projections ?? []).map((player) => ({
          sourceGameId: player.game_id,
          playerId: player.player_id,
          playerName: player.player_name,
          team: player.team,
          position: player.position,
          trialCount: player.trial_count,
          passingYards: player.means.passing_yards,
          rushingYards: player.means.rushing_yards,
          receivingYards: player.means.receiving_yards,
          receptions: player.means.receptions,
          totalTouchdowns: player.means.total_touchdowns,
          thresholds: {
            create: player.thresholds.map((line) => ({
              statistic: line.statistic,
              threshold: line.threshold,
              overProbability: line.over_probability,
              underProbability: line.under_probability,
              pushProbability: line.push_probability,
            })),
          },
        })),
      },
    },
    select: { id: true, payloadHash: true },
  })

  return NextResponse.json({ accepted: true, ...result }, { status: 200 })
}
