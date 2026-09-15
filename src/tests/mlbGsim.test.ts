import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mlbPayloadHash, mlbDisplayContext } from '@/lib/mlbGsim'
import { mlbGsimResultsSchema, type MlbGsimResults } from '@/schemas/mlbGsimResults'

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn(async ({ where }) => ({ id: 'snapshot', payloadHash: where.payloadHash })) }))
vi.mock('@/lib/db', () => ({ prisma: { mlbGsimResult: { upsert } } }))
import { POST } from '@/app/api/integrations/mlb-gsim/results/route'

function payload(): MlbGsimResults {
  return { schema_version: 'qsc.mlb_gsim.results.v1', sport: 'MLB', slate_date: '2026-09-11',
    generated_at_utc: '2026-09-11T12:00:00+00:00',
    publication: { visibility: 'PRIVATE_QSC', decision_use: 'DESCRIPTIVE_MODEL_OUTPUT_NOT_VALIDATED_EDGE', model_parameters_included: false },
    games: [{ game_id: '123', away_team: 'Away', home_team: 'Home', scheduled_start_utc: '2026-09-11T23:00:00Z',
      source_state: 'REGISTERED', mlb_state: 'Scheduled', context: 'PREGAME_MODEL', run_id: 'production_1',
      projection: { home_win_probability: .6, away_win_probability: .4, game_total_mean: 8.2 } }] }
}

function request(body = JSON.stringify(payload()), headers: Record<string, string> = {}) {
  return new NextRequest('https://qsc.example/api/integrations/mlb-gsim/results', { method: 'POST', body,
    headers: { 'content-type': 'application/json', authorization: 'Bearer test-mlb-secret',
      'x-qsc-content-sha256': mlbPayloadHash(body), ...headers } })
}

describe('MLB ingestion boundary', () => {
  beforeEach(() => { process.env.MLB_GSIM_INGESTION_SECRET = 'test-mlb-secret'; upsert.mockClear() })
  afterEach(() => { delete process.env.MLB_GSIM_INGESTION_SECRET })
  it('fails closed without a configured secret', async () => {
    delete process.env.MLB_GSIM_INGESTION_SECRET
    expect((await POST(request())).status).toBe(503)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('rejects wrong service credentials', async () => {
    expect((await POST(request(undefined, { authorization: 'Bearer wrong' }))).status).toBe(401)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('rejects mutated bytes', async () => {
    expect((await POST(request(undefined, { 'x-qsc-content-sha256': '0'.repeat(64) }))).status).toBe(422)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('rejects private fields instead of silently storing them', async () => {
    expect((await POST(request(JSON.stringify({ ...payload(), model_parameters: { private: true } })))).status).toBe(422)
    const p = payload()
    Object.assign(p.games[0]!, { source_path: 'private' })
    expect((await POST(request(JSON.stringify(p)))).status).toBe(422)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('stores repeated identical snapshots using the same immutable key', async () => {
    expect((await POST(request())).status).toBe(200)
    expect((await POST(request())).status).toBe(200)
    expect(upsert.mock.calls[0]![0]).toEqual(upsert.mock.calls[1]![0])
    expect(upsert.mock.calls[0]![0].update).toEqual({})
  })
  it('rejects oversized streams even without content-length', async () => {
    expect((await POST(request(' '.repeat(256 * 1024 + 1)))).status).toBe(413)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('rejects malformed JSON and wrong media types', async () => {
    expect((await POST(request('{'))).status).toBe(400)
    expect((await POST(request(undefined, { 'content-type': 'text/plain' }))).status).toBe(415)
  })
  it('returns a retryable error without database details', async () => {
    upsert.mockRejectedValueOnce(new Error('private database details'))
    const response = await POST(request())
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('private database')
  })
})

describe('MLB presentation integrity', () => {
  it('does not label started games or stale snapshots as current pregame models', () => {
    const p = payload()
    expect(mlbDisplayContext(p.games[0]!, p.generated_at_utc, Date.parse('2026-09-11T12:30:00Z'))).toBe('Pregame model')
    expect(mlbDisplayContext(p.games[0]!, p.generated_at_utc, Date.parse('2026-09-11T14:00:00Z'))).toBe('Stale snapshot')
    expect(mlbDisplayContext(p.games[0]!, p.generated_at_utc, Date.parse('2026-09-12T00:00:00Z'))).toBe('Pregame reference')
  })
  it('rejects blocked game projections, duplicates, and inconsistent probabilities', () => {
    const p = payload()
    p.games[0]!.source_state = 'BLOCKED'
    expect(mlbGsimResultsSchema.safeParse(p).success).toBe(false)
    const duplicate = payload(); duplicate.games.push(duplicate.games[0]!)
    expect(mlbGsimResultsSchema.safeParse(duplicate).success).toBe(false)
    const invalid = payload(); invalid.games[0]!.projection!.home_win_probability = .8
    expect(mlbGsimResultsSchema.safeParse(invalid).success).toBe(false)
  })
  it('rejects a current-model label when the snapshot was generated after start', () => {
    const p = payload(); p.generated_at_utc = '2026-09-12T00:00:00Z'
    expect(mlbGsimResultsSchema.safeParse(p).success).toBe(false)
  })
})
