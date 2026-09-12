import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { authenticateMlbService } from '@/lib/mlbGsim'
import { marketGame } from '@/lib/mlbMarket'
import { mlbMarketSchema } from '@/schemas/mlbMarket'
import { mlbGsimResultsSchema } from '@/schemas/mlbGsimResults'

export const runtime = 'nodejs'
const MAX_BYTES = 256 * 1024

export async function POST(req: NextRequest) {
  const status = authenticateMlbService(req.headers.get('authorization'))
  if (status !== 200) return NextResponse.json({ error: status === 503 ? 'Service authentication unavailable' : 'Unauthorized' }, { status })
  if (req.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  if (Number(req.headers.get('content-length')) > MAX_BYTES) return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  const reader = req.body?.getReader()
  if (!reader) return NextResponse.json({ error: 'Missing body' }, { status: 400 })
  const chunks: Uint8Array[] = []
  let size = 0, value: unknown, hash: string
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > MAX_BYTES) {
        await reader.cancel()
        return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
      }
      chunks.push(chunk.value)
    }
    const bytes = Buffer.concat(chunks)
    hash = createHash('sha256').update(bytes).digest('hex')
    if (req.headers.get('x-qsc-content-sha256') !== hash) return NextResponse.json({ error: 'Payload hash mismatch' }, { status: 422 })
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
  const parsed = mlbMarketSchema.safeParse(value)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid MLB market contract' }, { status: 422 })
  const payload = parsed.data, now = Date.now()
  if (Date.parse(payload.generated_at_utc) > now || now - Date.parse(payload.generated_at_utc) > 5 * 60_000) {
    return NextResponse.json({ error: 'Market review is not current' }, { status: 422 })
  }
  try {
    const source = await prisma.mlbGsimResult.findUnique({ where: { payloadHash: payload.model_payload_sha256 }, select: { payload: true } })
    const model = mlbGsimResultsSchema.safeParse(source?.payload)
    if (!model.success || model.data.slate_date !== payload.slate_date ||
      payload.quotes.some(quote => !marketGame(payload, quote, model.data, now))) {
      return NextResponse.json({ error: 'Market observations do not match eligible stored pregame models' }, { status: 422 })
    }
    const result = await prisma.mlbMarketSnapshot.upsert({
      where: { payloadHash: hash }, update: {},
      create: { payloadHash: hash, modelPayloadHash: payload.model_payload_sha256, slateDate: payload.slate_date,
        generatedAt: new Date(payload.generated_at_utc), payload },
      select: { id: true, payloadHash: true },
    })
    return NextResponse.json({ accepted: true, ...result, observations: payload.quotes.length })
  } catch { return NextResponse.json({ error: 'Market storage unavailable; retry delivery' }, { status: 503 }) }
}
