import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateMlbService, mlbPayloadHash } from '@/lib/mlbGsim'
import { mlbGsimResultsSchema } from '@/schemas/mlbGsimResults'

export const runtime = 'nodejs'
const MAX_BYTES = 256 * 1024

export async function POST(req: NextRequest) {
  const status = authenticateMlbService(req.headers.get('authorization'))
  if (status !== 200) return NextResponse.json({ error: status === 503 ? 'Service authentication unavailable' : 'Unauthorized' }, { status })
  if (req.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  if (Number(req.headers.get('content-length')) > MAX_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }
  const reader = req.body?.getReader()
  if (!reader) return NextResponse.json({ error: 'Missing body' }, { status: 400 })
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
      }
      chunks.push(value)
    }
  } catch {
    return NextResponse.json({ error: 'Unable to read body' }, { status: 400 })
  }
  const body = Buffer.concat(chunks).toString('utf8')
  const hash = mlbPayloadHash(body)
  if (req.headers.get('x-qsc-content-sha256') !== hash) {
    return NextResponse.json({ error: 'Payload hash mismatch' }, { status: 422 })
  }
  let value: unknown
  try { value = JSON.parse(body) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = mlbGsimResultsSchema.safeParse(value)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid MLB results contract' }, { status: 422 })
  const payload = parsed.data
  if (Date.parse(payload.generated_at_utc) > Date.now() + 5 * 60 * 1000) {
    return NextResponse.json({ error: 'Snapshot timestamp is in the future' }, { status: 422 })
  }
  try {
    const result = await prisma.mlbGsimResult.upsert({
      where: { payloadHash: hash }, update: {},
      create: { payloadHash: hash, slateDate: payload.slate_date,
        generatedAt: new Date(payload.generated_at_utc), payload },
      select: { id: true, payloadHash: true },
    })
    return NextResponse.json({ accepted: true, ...result })
  } catch {
    return NextResponse.json({ error: 'Results storage unavailable; retry delivery' }, { status: 503 })
  }
}
