import { expect, it } from 'vitest'
import { selectForecasts, gradeForecasts, type StoredMlbSnapshot, type OfficialGame } from '@/lib/mlbPerformance'

function snapshot(id = 'a', received = '2026-09-11T17:05:00Z'): StoredMlbSnapshot {
  return { id, payloadHash: id.repeat(64), receivedAt: new Date(received), payload: {
    schema_version: 'qsc.mlb_gsim.results.v1', sport: 'MLB', slate_date: '2026-09-11', generated_at_utc: '2026-09-11T17:00:00Z',
    publication: { visibility: 'PRIVATE_QSC', decision_use: 'DESCRIPTIVE_MODEL_OUTPUT_NOT_VALIDATED_EDGE', model_parameters_included: false },
    games: [{ game_id: '123', away_team: 'Away', home_team: 'Home', scheduled_start_utc: '2026-09-11T19:00:00Z',
      source_state: 'REGISTERED', mlb_state: 'Pre-Game', context: 'PREGAME_MODEL', run_id: 'production_1',
      projection: { home_win_probability: .6, away_win_probability: .4, game_total_mean: 8 } }],
  } }
}
const final: OfficialGame = { gamePk: 123, gameDate: '2026-09-11T19:00:00Z', status: { abstractGameState: 'Final', detailedState: 'Final' },
  teams: { home: { team: { name: 'Home' }, score: 5 }, away: { team: { name: 'Away' }, score: 2 } } }
it('deduplicates games and selects the earliest eligible receipt regardless of input order', () => {
  const result = selectForecasts([snapshot('b', '2026-09-11T17:10:00Z'), snapshot()])
  expect(result.forecasts).toHaveLength(1)
  expect(result.forecasts[0]!.snapshotId).toBe('a')
})
it.each(['2026-09-11T19:00:00Z', '2026-09-11T19:01:00Z', '2026-09-11T18:31:00Z', '2026-09-11T16:59:00Z'])(
  'rejects late, stale or chronologically invalid receipt %s', received => {
    expect(selectForecasts([snapshot('a', received)]).forecasts).toHaveLength(0)
  })
it('never admits retained references or invalid payloads', () => {
  const row = snapshot()
  const payload = row.payload as { games: { context: string }[] }
  payload.games[0]!.context = 'PREGAME_REFERENCE'
  const result = selectForecasts([row, { ...snapshot('b'), payload: {} }])
  expect(result.forecasts).toHaveLength(0)
  expect(result.excluded).toBe(1)
  expect(result.invalidSnapshots).toBe(1)
})
it('computes Brier, total MAE and signed bias from actual outcomes', () => {
  const forecasts = selectForecasts([snapshot()]).forecasts
  const report = gradeForecasts(forecasts, new Map([['123', final]]))
  expect(report.graded).toBe(1)
  expect(report.brier).toBeCloseTo(.16)
  expect(report.totalMae).toBe(1)
  expect(report.totalBias).toBe(1)
  const loss = structuredClone(final)
  loss.teams.away.score = 6
  expect(gradeForecasts(forecasts, new Map([['123', loss]])).brier).toBeCloseTo(.36)
})
it.each(['Live', 'Suspended', 'Postponed'])('does not grade %s', state => {
  const game = { ...final, status: { abstractGameState: state, detailedState: state } }
  const report = gradeForecasts(selectForecasts([snapshot()]).forecasts, new Map([['123', game]]))
  expect(report.graded).toBe(0)
  expect(report.brier).toBeNull()
  expect(report.pending).toBe(1)
})
it('excludes identity changes and starts moved before receipt', () => {
  const forecasts = selectForecasts([snapshot()]).forecasts
  const moved = { ...final, gameDate: '2026-09-11T17:00:00Z' }
  expect(gradeForecasts(forecasts, new Map([['123', moved]])).excluded).toBe(1)
  const changed = structuredClone(final)
  changed.teams.home.team.name = 'Other'
  expect(gradeForecasts(forecasts, new Map([['123', changed]])).excluded).toBe(1)
})
it('withholds missing or tied finals and handles empty cohorts without zero metrics', () => {
  const forecasts = selectForecasts([snapshot()]).forecasts
  expect(gradeForecasts(forecasts, new Map()).pending).toBe(1)
  const tied = structuredClone(final)
  tied.teams.away.score = 5
  expect(gradeForecasts(forecasts, new Map([['123', tied]])).graded).toBe(0)
  expect(gradeForecasts([], new Map()).totalMae).toBeNull()
})
