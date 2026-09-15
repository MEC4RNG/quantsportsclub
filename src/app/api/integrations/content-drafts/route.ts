import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateMlbService, mlbPayloadHash } from '@/lib/mlbGsim'
import { contentDraftPackageSchema } from '@/schemas/contentDraft'

export const runtime = 'nodejs'
const MAX_BYTES = 128 * 1024

export async function POST(req: NextRequest) {
  const auth = authenticateMlbService(req.headers.get('authorization'))
  if (auth !== 200)
    return NextResponse.json(
      { error: auth === 503 ? 'Service authentication unavailable' : 'Unauthorized' },
      { status: auth },
    )
  if (req.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  const body = await req.text()
  if (Buffer.byteLength(body) > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }
  const packageHash = mlbPayloadHash(body)
  if (req.headers.get('x-qsc-content-sha256') !== packageHash) {
    return NextResponse.json({ error: 'Payload hash mismatch' }, { status: 422 })
  }
  let unknown: unknown
  try {
    unknown = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = contentDraftPackageSchema.safeParse(unknown)
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid content draft contract' }, { status: 422 })
  const draft = parsed.data
  const reviewKey = `MLB:${draft.source_payload_sha256}`
  if (Date.parse(draft.reviewed_at_utc) > Date.now() + 5 * 60_000) {
    return NextResponse.json({ error: 'Review timestamp is in the future' }, { status: 422 })
  }
  try {
    const result = await prisma.contentDraftPackage.upsert({
      where: { reviewKey },
      update: {},
      create: {
        packageHash,
        reviewKey,
        sourcePayloadHash: draft.source_payload_sha256,
        sport: 'MLB',
        slateDate: draft.slate_date,
        reviewedAt: new Date(draft.reviewed_at_utc),
        releaseStatus: draft.release_status,
        payload: draft,
      },
      select: { id: true, reviewStatus: true },
    })
    return NextResponse.json({ accepted: true, packageHash, ...result })
  } catch {
    return NextResponse.json(
      { error: 'Draft storage unavailable; retry delivery' },
      { status: 503 },
    )
  }
}
