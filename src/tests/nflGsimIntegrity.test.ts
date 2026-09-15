import { describe, expect, it } from 'vitest'
import { calculateNflGsimPayloadHash } from '@/lib/nflGsimIntegrity'
import type { NflGsimResults } from '@/schemas/nflGsimResults'

describe('NFL GSIM payload hashing', () => {
  it('matches the authoritative Python exporter canonicalization', () => {
    const payload = {
      schema_version: 'qsc.nfl_gsim.results.v1',
      generated_at_utc: '2026-09-01T12:00:00+00:00',
      sport: 'NFL',
      season: 2026,
      week: 1,
      run: { trials_per_game: 1, master_seed: 7, market_independent: true, scheduled_games: 0, simulated_games: 0 },
      readiness: { snapshot_status: 'PROVISIONAL', weather_status: 'NOT_READY', injury_feed_available: false, refresh_artifact_hash: 'b'.repeat(64) },
      blocked_games: [],
      games: [],
      publication: { visibility: 'PRIVATE_QSC', decision_use: 'PRODUCTION_PROVISIONAL_NOT_FINAL_GAME_DAY', model_parameters_included: false },
      payload_hash: '0'.repeat(64),
    } satisfies NflGsimResults

    expect(calculateNflGsimPayloadHash(payload)).toBe(
      'abb223f32d73f2bebf2282b7bfd80cba36eb9e651b1206e02ae0f93f974650bb',
    )
  })

  it('preserves Python float rendering for model-only line and player fields', () => {
    const payload = {
      schema_version: 'qsc.nfl_gsim.results.v1',
      generated_at_utc: '2026-09-08T13:08:28.120207+00:00',
      sport: 'NFL',
      season: 2026,
      week: 1,
      run: { trials_per_game: 1000, master_seed: 2601, market_independent: true, scheduled_games: 1, simulated_games: 1 },
      readiness: { snapshot_status: 'PROVISIONAL_CURRENT_SLATE_READY', weather_status: 'CURRENT_WEATHER_PARTIALLY_AVAILABLE', injury_feed_available: true, refresh_artifact_hash: 'b'.repeat(64) },
      blocked_games: [],
      games: [{
        game_id: '2026_01_A_B', scheduled_start_date: '2026-09-09', away_team: 'A', home_team: 'B',
        away_win_probability: 0.4, home_win_probability: 0.6, tie_probability: 0.0,
        projected_away_score: 20.0, projected_home_score: 24.0, projected_margin_home: 4.0,
        projected_total_raw: 44.0, projected_total_calibrated: 46.5,
        total_p10: 30.0, total_p50: 45.0, total_p90: 62.0,
        valid_trials: 1000, invalid_trials: 0, provisional: true,
        model_release: 'NFL_GSIM_V0.1', runtime_artifact_hash: 'a'.repeat(64),
        model_total_lines: [{ threshold: 45.5, over_probability: 1.0, under_probability: 0.0, push_probability: 0.0 }],
        model_spread_lines: [{ home_handicap: 0.0, home_cover_probability: 0.6, away_cover_probability: 0.4, push_probability: 0.0 }],
      }],
      player_projections: [{
        game_id: '2026_01_A_B', player_id: 'player-1', player_name: 'Test Player', team: 'A', position: 'QB', trial_count: 1000,
        means: { passing_yards: 250.0, rushing_yards: 0.0, receiving_yards: 0.0, receptions: 0.0, total_touchdowns: 2.0 },
        thresholds: [{ statistic: 'passing_yards', threshold: 249.5, over_probability: 1.0, under_probability: 0.0, push_probability: 0.0 }],
      }],
      publication: { visibility: 'PRIVATE_QSC', decision_use: 'PRODUCTION_PROVISIONAL_NOT_FINAL_GAME_DAY', model_parameters_included: false },
      payload_hash: '0'.repeat(64),
    } satisfies NflGsimResults

    expect(calculateNflGsimPayloadHash(payload)).toBe(
      '08a5c3eb01f72a782626ccedf9bc10af3a9a35fc50c8f08e2702b7c595be63e0',
    )
  })
})
