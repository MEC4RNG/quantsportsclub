import { z } from 'zod'
import { mlbGsimResultsSchema, type MlbGame } from '@/schemas/mlbGsimResults'

export type StoredMlbSnapshot = { id: string; payloadHash: string; receivedAt: Date; payload: unknown }
export type Forecast = { game: MlbGame; date: string; snapshotId: string; hash: string; receivedAt: string; generatedAt: string }

// First eligible QSC receipt per game. Never select forecasts using outcomes.
export function selectForecasts(snapshots: StoredMlbSnapshot[]) {
  const selected = new Map<string, Forecast>()
  const seen = new Set<string>()
  let invalidSnapshots = 0
  for (const row of [...snapshots].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime() || a.id.localeCompare(b.id))) {
    const parsed = mlbGsimResultsSchema.safeParse(row.payload)
    if (!parsed.success) { invalidSnapshots++; continue }
    const slate = parsed.data
    const received = row.receivedAt.getTime()
    const generated = Date.parse(slate.generated_at_utc)
    for (const game of slate.games) {
      seen.add(game.game_id)
      if (selected.has(game.game_id) || game.context !== 'PREGAME_MODEL' || !game.projection ||
          !Number.isFinite(received) || generated > received || received - generated > 90 * 60_000 ||
          received >= Date.parse(game.scheduled_start_utc)) continue
      selected.set(game.game_id, { game, date: slate.slate_date, snapshotId: row.id, hash: row.payloadHash,
        receivedAt: row.receivedAt.toISOString(), generatedAt: slate.generated_at_utc })
    }
  }
  return { forecasts: [...selected.values()], excluded: seen.size - selected.size, invalidSnapshots }
}

const team = z.object({ team: z.object({ name: z.string() }), score: z.number().int().nonnegative().optional() })
export const officialScheduleSchema = z.object({ dates: z.array(z.object({ games: z.array(z.object({
  gamePk: z.number().int().positive(), gameDate: z.string().datetime({ offset: true }),
  status: z.object({ abstractGameState: z.string(), detailedState: z.string() }),
  teams: z.object({ home: team, away: team }),
})) })) })
export type OfficialGame = z.infer<typeof officialScheduleSchema>['dates'][number]['games'][number]

export function gradeForecasts(forecasts: Forecast[], official: Map<string, OfficialGame>) {
  const rows = forecasts.map(forecast => {
    const game = official.get(forecast.game.game_id)
    const base = { ...forecast, status: 'Pending final' as string, brier: null as number | null,
      totalError: null as number | null, homeRuns: null as number | null, awayRuns: null as number | null }
    if (!game) return { ...base, status: 'Official result unavailable' }
    if (game.teams.home.team.name !== forecast.game.home_team || game.teams.away.team.name !== forecast.game.away_team ||
        Date.parse(forecast.receivedAt) >= Date.parse(game.gameDate)) return { ...base, status: 'Excluded: identity or start-time mismatch' }
    if (game.status.abstractGameState !== 'Final' || game.status.detailedState !== 'Final') return base
    const home = game.teams.home.score, away = game.teams.away.score
    if (home === undefined || away === undefined || home === away) return { ...base, status: 'Final requires review' }
    const p = forecast.game.projection!
    return { ...base, status: 'Graded', homeRuns: home, awayRuns: away,
      brier: (p.home_win_probability - Number(home > away)) ** 2,
      totalError: p.game_total_mean - (home + away) }
  })
  const graded = rows.filter(row => row.status === 'Graded')
  const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null
  return { rows, graded: graded.length, pending: rows.filter(r => r.status !== 'Graded' && !r.status.startsWith('Excluded:')).length,
    excluded: rows.filter(r => r.status.startsWith('Excluded:')).length,
    brier: mean(graded.map(r => r.brier!)), totalMae: mean(graded.map(r => Math.abs(r.totalError!))),
    totalBias: mean(graded.map(r => r.totalError!)) }
}
