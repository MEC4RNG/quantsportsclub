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
      publication: { visibility: 'PRIVATE_QSC', decision_use: 'PRESENTATION_SAMPLE_NOT_FINAL_GAME_DAY', model_parameters_included: false },
      payload_hash: '0'.repeat(64),
    } satisfies NflGsimResults

    expect(calculateNflGsimPayloadHash(payload)).toBe(
      '40fadbe0568a461ae365ae1c64eda9c44848759825b3704e4f2cde65338034b2',
    )
  })
})
