import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { calculateNflGsimPayloadHash } from '@/lib/nflGsimIntegrity'
import type { NflGsimResults } from '@/schemas/nflGsimResults'

const { upsert } = vi.hoisted(() => ({
  upsert: vi.fn(async ({ where }: { where: { payloadHash: string }; create?: unknown }) => ({
    id: 'result-1',
    payloadHash: where.payloadHash,
  })),
}))

vi.mock('@/lib/db', () => ({
  prisma: { nflGsimResult: { upsert } },
}))

import { POST } from '@/app/api/integrations/nfl-gsim/results/route'

function payload(): NflGsimResults {
  const value: NflGsimResults = {
    schema_version: 'qsc.nfl_gsim.results.v1',
    generated_at_utc: '2026-09-01T12:00:00+00:00',
    sport: 'NFL',
    season: 2026,
    week: 1,
    run: {
      trials_per_game: 100,
      master_seed: 7,
      market_independent: true,
      scheduled_games: 2,
      simulated_games: 1,
    },
    readiness: {
      snapshot_status: 'PROVISIONAL',
      weather_status: 'NOT_READY',
      injury_feed_available: false,
      refresh_artifact_hash: 'b'.repeat(64),
    },
    blocked_games: [{ source_game_id: '2026_01_C_D', failure: 'Missing inputs' }],
    games: [
      {
        game_id: '2026_01_A_B',
        scheduled_start_date: '2026-09-01',
        away_team: 'A',
        home_team: 'B',
        away_win_probability: 0.4,
        home_win_probability: 0.6,
        tie_probability: 0.0,
        projected_away_score: 20.0,
        projected_home_score: 24.0,
        projected_margin_home: 4.0,
        projected_total_raw: 44.0,
        projected_total_calibrated: 46.5,
        total_p10: 30.0,
        total_p50: 45.0,
        total_p90: 62.0,
        valid_trials: 100,
        invalid_trials: 0,
        provisional: true,
        model_release: 'NFL_GSIM_V0.1',
        runtime_artifact_hash: 'a'.repeat(64),
      },
    ],
    publication: {
      visibility: 'PRIVATE_QSC',
      decision_use: 'PRODUCTION_PROVISIONAL_NOT_FINAL_GAME_DAY',
      model_parameters_included: false,
    },
    payload_hash: '0'.repeat(64),
  }
  value.payload_hash = calculateNflGsimPayloadHash(value)
  return value
}

function request(value: unknown, secret = 'test-service-secret') {
  return new NextRequest('http://localhost/api/integrations/nfl-gsim/results', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(value),
  })
}

describe('NFL GSIM results ingestion', () => {
  beforeEach(() => {
    process.env.NFL_GSIM_INGESTION_SECRET = 'test-service-secret'
    upsert.mockClear()
  })

  afterEach(() => {
    delete process.env.NFL_GSIM_INGESTION_SECRET
  })

  it('fails closed when service authentication is not configured', async () => {
    delete process.env.NFL_GSIM_INGESTION_SECRET
    const response = await POST(request(payload()))
    expect(response.status).toBe(503)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects an invalid bearer credential before processing the payload', async () => {
    const response = await POST(request(payload(), 'wrong'))
    expect(response.status).toBe(401)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects unknown private-model fields', async () => {
    const unsafe = { ...payload(), private_model_parameters: { coefficient: 1.0 } }
    const response = await POST(request(unsafe))
    expect(response.status).toBe(422)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects an unknown decision-use classification before persistence', async () => {
    const unknown = payload() as unknown as { publication: { decision_use: string } }
    unknown.publication.decision_use = 'UNKNOWN'
    const response = await POST(request(unknown))
    expect(response.status).toBe(422)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects a ready classification with provisional inputs before persistence', async () => {
    const inconsistent = payload()
    inconsistent.publication.decision_use = 'PRODUCTION_READY_NOT_FINAL_GAME_DAY'
    inconsistent.payload_hash = calculateNflGsimPayloadHash(inconsistent)
    const response = await POST(request(inconsistent))
    expect(response.status).toBe(422)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('accepts a ready classification only with fully ready inputs', async () => {
    const ready = payload()
    ready.publication.decision_use = 'PRODUCTION_READY_NOT_FINAL_GAME_DAY'
    ready.games[0]!.provisional = false
    ready.readiness.injury_feed_available = true
    ready.readiness.weather_status = 'CURRENT_WEATHER_FORECAST_READY'
    ready.payload_hash = calculateNflGsimPayloadHash(ready)
    const response = await POST(request(ready))
    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledTimes(1)
  })

  it('rejects a payload whose content does not match its hash', async () => {
    const altered = payload()
    altered.games[0]!.home_win_probability = 0.7
    const response = await POST(request(altered))
    expect(response.status).toBe(422)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('upserts the validated narrow contract by payload hash idempotently', async () => {
    const value = payload()
    const first = await POST(request(value))
    const second = await POST(request(value))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert.mock.calls[0]![0].where).toEqual({ payloadHash: value.payload_hash })
    expect(upsert.mock.calls[1]![0].where).toEqual({ payloadHash: value.payload_hash })
    expect(upsert.mock.calls[0]![0].create).not.toHaveProperty('private_model_parameters')
  })

  it('persists optional model-only game lines and player projections', async () => {
    const value = payload()
    value.games[0]!.model_total_lines = [
      { threshold: 45.5, over_probability: 0.55, under_probability: 0.45, push_probability: 0 },
    ]
    value.games[0]!.model_spread_lines = [
      { home_handicap: -3.5, home_cover_probability: 0.52, away_cover_probability: 0.48, push_probability: 0 },
    ]
    value.player_projections = [{
      game_id: '2026_01_A_B', player_id: 'player-1', player_name: 'Test Player', team: 'A',
      position: 'QB', trial_count: 100,
      means: { passing_yards: 255, rushing_yards: 15, receiving_yards: 0, receptions: 0, total_touchdowns: 2 },
      thresholds: [{ statistic: 'passing_yards', threshold: 249.5, over_probability: 0.54, under_probability: 0.46, push_probability: 0 }],
    }]
    value.payload_hash = calculateNflGsimPayloadHash(value)

    const response = await POST(request(value))

    expect(response.status).toBe(200)
    const create = upsert.mock.calls[0]![0].create as Record<string, unknown>
    expect(create).toHaveProperty('playerProjections.create.0.playerName', 'Test Player')
    expect(create).toHaveProperty('games.create.0.totalLines.create.0.threshold', 45.5)
  })
})
