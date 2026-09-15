import { createHash } from 'node:crypto'
import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }))
vi.mock('@/lib/db', () => ({ prisma: { contentDraftPackage: { upsert } } }))
import { POST } from '@/app/api/integrations/content-drafts/route'

function packageValue() {
  return {
    schema_version: 'qsc.content_drafts.v1',
    template_version: '1.1',
    slate_date: '2026-09-15',
    reviewed_at_utc: '2026-09-14T16:00:00Z',
    source_generated_at_utc: '2026-09-14T15:55:00Z',
    source_payload_sha256: 'a'.repeat(64),
    release_status: 'INTERNAL_DRAFT_ONLY',
    public_release_authorized: false,
    posting_enabled: false,
    blockers: [],
    posts: [
      {
        kind: 'DAILY_ANCHOR',
        text: 'Private draft',
        conservative_length: 13,
        copy_status: 'REVIEWABLE',
      },
    ],
    games: [],
    requirements: ['Review'],
    evidence: {
      model_fields: 'EXACT_ACKNOWLEDGED_PAYLOAD',
      prices: 'NOT_APPLICABLE',
      stakes: 'NOT_APPLICABLE',
      betting_decisions: 'NOT_APPLICABLE',
      media: 'NOT_CREATED',
    },
  }
}

function request(value = packageValue(), secret = 'test-secret') {
  const body = JSON.stringify(value)
  return new NextRequest('https://qsc.test/api/integrations/content-drafts', {
    method: 'POST',
    body,
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'x-qsc-content-sha256': createHash('sha256').update(body).digest('hex'),
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.MLB_GSIM_INGESTION_SECRET = 'test-secret'
})

it('accepts an internal draft package idempotently by exact hash', async () => {
  upsert.mockResolvedValue({
    id: 'review',
    packageHash: 'b'.repeat(64),
    reviewStatus: 'PENDING_REVIEW',
  })
  const response = await POST(request())
  expect(response.status).toBe(200)
  expect((await response.json()).accepted).toBe(true)
  expect(upsert).toHaveBeenCalledOnce()
  expect(upsert.mock.calls[0]![0].where).toEqual({ reviewKey: `MLB:${'a'.repeat(64)}` })
})

it('rejects unauthorized, hash-mismatched and publication-enabled packages', async () => {
  expect((await POST(request(packageValue(), 'wrong'))).status).toBe(401)
  const enabled = { ...packageValue(), posting_enabled: true }
  expect((await POST(request(enabled))).status).toBe(422)
  const badHash = request()
  badHash.headers.set('x-qsc-content-sha256', '0'.repeat(64))
  expect((await POST(badHash)).status).toBe(422)
  expect(upsert).not.toHaveBeenCalled()
})
