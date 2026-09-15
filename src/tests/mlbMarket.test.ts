import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mlbPayloadHash } from '@/lib/mlbGsim'
import { mlbMarketSchema, type MlbMarket } from '@/schemas/mlbMarket'
import type { MlbGsimResults } from '@/schemas/mlbGsimResults'
import { selectMarketForecasts, gradeMarketForecasts } from '@/lib/mlbMarket'
const { findUnique, upsert } = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn() }))
vi.mock('@/lib/db', () => ({ prisma: { mlbGsimResult: { findUnique }, mlbMarketSnapshot: { upsert } } }))
import { POST } from '@/app/api/integrations/mlb-gsim/markets/route'

const now = Date.parse('2026-09-12T16:15:00Z')
function model(): MlbGsimResults {
  return { schema_version: 'qsc.mlb_gsim.results.v1', sport: 'MLB', slate_date: '2026-09-12', generated_at_utc: '2026-09-12T16:00:00Z',
    publication: { visibility: 'PRIVATE_QSC', decision_use: 'DESCRIPTIVE_MODEL_OUTPUT_NOT_VALIDATED_EDGE', model_parameters_included: false },
    games: [{ game_id: '123', home_team: 'Home', away_team: 'Away', scheduled_start_utc: '2026-09-12T17:00:00Z',
      source_state: 'REGISTERED', mlb_state: 'Scheduled', context: 'PREGAME_MODEL', run_id: 'production_1',
      projection: { home_win_probability: .6, away_win_probability: .4, game_total_mean: 8 } }] }
}
function payload(): MlbMarket {
  return { schema_version: 'qsc.mlb_market_observations.v1', sport: 'MLB', slate_date: '2026-09-12',
    generated_at_utc: '2026-09-12T16:14:00Z', odds_fetched_at_utc: '2026-09-12T16:10:00Z',
    model_payload_sha256: 'a'.repeat(64), odds_snapshot_sha256: 'b'.repeat(64),
    publication: { visibility: 'PRIVATE_QSC', decision_use: 'RESEARCH_ONLY_SETTLEMENT_RULES_NOT_VERIFIED' },
    quotes: [{ game_id: '123', event_id: 'event1', bookmaker: 'book', home_team: 'Home', away_team: 'Away',
      scheduled_start_utc: '2026-09-12T17:00:00Z', book_updated_at: '2026-09-12T16:09:00Z', home_decimal: 1.8, away_decimal: 2.1 }] }
}
function snapshot(p = payload(), received = now) {
  return { id: 'receipt', payloadHash: 'c'.repeat(64), modelPayloadHash: p.model_payload_sha256,
    receivedAt: new Date(received), payload: p, modelResult: { payload: model() } }
}
function request(p = payload(), headers = {}, body = JSON.stringify(p)) {
  return new NextRequest('https://qsc.example/api/integrations/mlb-gsim/markets', { method: 'POST', body,
    headers: { 'content-type': 'application/json', authorization: 'Bearer fixture-secret',
      'x-qsc-content-sha256': mlbPayloadHash(body), ...headers } })
}
beforeEach(() => {
  vi.clearAllMocks(); vi.spyOn(Date, 'now').mockReturnValue(now)
  process.env.MLB_GSIM_INGESTION_SECRET = 'fixture-secret'
  findUnique.mockResolvedValue({ payload: model() }); upsert.mockResolvedValue({ id: 'receipt', payloadHash: 'hash' })
})
afterEach(() => { vi.restoreAllMocks(); delete process.env.MLB_GSIM_INGESTION_SECRET })

it('authenticates before accessing storage', async () => {
  expect((await POST(request(undefined, { authorization: 'Bearer wrong' }))).status).toBe(401)
  expect(findUnique).not.toHaveBeenCalled()
  delete process.env.MLB_GSIM_INGESTION_SECRET
  expect((await POST(request())).status).toBe(503)
})
it('rejects private fields, hash mismatches and oversized bodies', async () => {
  const p = payload(); Object.assign(p, { model_parameters: 'private' })
  expect((await POST(request(p))).status).toBe(422)
  expect((await POST(request(undefined, { 'x-qsc-content-sha256': 'wrong' }))).status).toBe(422)
  expect((await POST(request(undefined, {}, ' '.repeat(256 * 1024 + 1)))).status).toBe(413)
  expect(upsert).not.toHaveBeenCalled()
})
it('requires a matching stored eligible model', async () => {
  findUnique.mockResolvedValueOnce(null)
  expect((await POST(request())).status).toBe(422)
  const p = payload(); p.quotes[0]!.home_team = 'Different'
  expect((await POST(request(p))).status).toBe(422)
  expect(upsert).not.toHaveBeenCalled()
})
it('stores immutable repeated observations', async () => {
  expect((await POST(request())).status).toBe(200)
  expect((await POST(request())).status).toBe(200)
  expect(upsert.mock.calls[0]![0]).toEqual(upsert.mock.calls[1]![0])
  expect(upsert.mock.calls[0]![0].update).toEqual({})
})
it('rejects stale or future prices and late website arrival', async () => {
  const p = payload(); p.quotes[0]!.book_updated_at = '2026-09-12T15:00:00Z'
  expect((await POST(request(p))).status).toBe(422)
  p.quotes[0]!.book_updated_at = '2026-09-12T16:11:00Z'
  expect((await POST(request(p))).status).toBe(422)
  expect(selectMarketForecasts([snapshot(payload(), Date.parse('2026-09-12T17:00:00Z'))]).forecasts).toHaveLength(0)
})
it('does not silently select duplicate or ambiguous quotes', () => {
  const p = payload(); p.quotes.push({ ...p.quotes[0]! })
  expect(mlbMarketSchema.safeParse(p).success).toBe(false)
  p.quotes[1]!.bookmaker = 'another'; p.quotes[1]!.event_id = 'another-event'
  expect(mlbMarketSchema.safeParse(p).success).toBe(false)
})
it('retains first receipt rather than a later better probability', () => {
  const later = snapshot(); later.receivedAt = new Date(now + 1000); later.id = 'later'
  later.modelResult.payload.games[0]!.projection!.home_win_probability = .9
  later.modelResult.payload.games[0]!.projection!.away_win_probability = .1
  const cohort = selectMarketForecasts([later, snapshot()])
  expect(cohort.forecasts).toHaveLength(1)
  expect(cohort.forecasts[0]!.game.projection!.home_win_probability).toBe(.6)
})
it('scores model and normalized market separately for verified finals', () => {
  const cohort = selectMarketForecasts([snapshot()])
  const final = { gamePk: 123, gameDate: '2026-09-12T17:00:00Z', status: { abstractGameState: 'Final', detailedState: 'Final' },
    teams: { home: { team: { name: 'Home' }, score: 4 }, away: { team: { name: 'Away' }, score: 2 } } }
  const report = gradeMarketForecasts(cohort.forecasts, new Map([['123', final]]))
  expect(report.uniqueGames).toBe(1); expect(report.books[0]!.graded).toBe(1)
  expect(report.books[0]!.modelBrier).toBeCloseTo(.16)
  expect(report.books[0]!.marketBrier).toBeCloseTo((2.1 / 3.9 - 1) ** 2)
  final.gameDate = '2026-09-12T18:00:00Z'
  expect(gradeMarketForecasts(cohort.forecasts, new Map([['123', final]])).rows[0]!.status).toContain('Excluded')
})
it('returns retryable storage errors without internal details', async () => {
  upsert.mockRejectedValueOnce(new Error('private database detail'))
  const result = await POST(request())
  expect(result.status).toBe(503); expect(await result.text()).not.toContain('private database')
})
