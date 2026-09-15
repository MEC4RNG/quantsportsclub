import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/ip'
import { requireApiKey } from '@/lib/authz'
import { logger } from '@/lib/log'

const CreateEdge = z.object({
  sport: z.string().min(1),
  league: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  market: z.string().nullable().optional(),
  pick: z.string().nullable().optional(),
  stakeUnits: z.number().nullable().optional(),
  fairOdds: z.number().nullable().optional(),
  bookOdds: z.number().nullable().optional(),
  edgePct: z.number().nullable().optional(),
  modelRunId: z.string().nullable().optional(),
})

export async function GET() {
  const rows = await prisma.edge.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
  })
  return NextResponse.json(rows, { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    // API key gate
    const gate = await requireApiKey(req)
    if (!gate.ok) return gate.res

    const ip = getClientIp(req)
    const rl = await rateLimit({ key: `edges:${ip}`, limit: 10, windowMs: 60_000 })
    if (!rl.ok) {
      logger.warn({ ip, route: 'edges', event: 'rate_limited' })
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
            'X-RateLimit-Reset': String(rl.reset),
          },
        },
      )
    }

    const data = await req.json()
    const parsed = CreateEdge.parse(data)

    const created = await prisma.edge.create({ data: parsed })
    logger.info({ ip, route: 'edges', event: 'create', id: created.id })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
