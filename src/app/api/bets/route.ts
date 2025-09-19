// src/app/api/bets/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getClientIp } from '@/lib/ip'
import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/log'
import { edgePercentFromAmerican } from '@/lib/odds'

// ---- GET /api/bets ---------------------------------------------------------
type BetStatusStr = 'pending' | 'win' | 'loss' | 'void'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const limitNum = Number.parseInt(searchParams.get('limit') ?? '100', 10)
  const limit = Number.isFinite(limitNum) ? Math.min(Math.max(limitNum, 1), 500) : 100

  const s = (searchParams.get('status') ?? '') as BetStatusStr
  const allowed: BetStatusStr[] = ['pending', 'win', 'loss', 'void']
  const where = allowed.includes(s) ? { status: s } : undefined

  const rows = await prisma.bet.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
  })

  return NextResponse.json(rows, { status: 200 })
}

// ---- POST /api/bets --------------------------------------------------------
const CreateBet = z.object({
  sport: z.string().min(1),
  market: z.string().optional().nullable().transform(v => v ?? null),
  pick: z.string().min(1),
  stakeUnits: z.number().positive(),
  bookOdds: z.number().int().optional().nullable(),
  fairOdds: z.number().int().optional().nullable(),
  edgePct: z.number().optional().nullable(),
})

async function resolveUserId(): Promise<string> {
  const envId = process.env.DEMO_USER_ID
  if (envId) return envId
  const first = await prisma.user.findFirst({ select: { id: true } })
  if (first?.id) return first.id
  const demo = await prisma.user.create({
    data: { email: `demo+${Date.now()}@local.test`, name: 'Demo User' },
    select: { id: true },
  })
  return demo.id
}

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const r = await rateLimit({ key: `bets:${ip}`, limit: 10, windowMs: 60_000 })
  if (!r.ok) {
    logger.warn({ ip, route: 'bets', event: 'rate_limited' })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const json = await req.json()
    const data = CreateBet.parse(json)

    let edgePct = data.edgePct ?? null
    if (edgePct == null && data.bookOdds != null && data.fairOdds != null) {
      edgePct = Number(edgePercentFromAmerican(data.bookOdds, data.fairOdds).toFixed(4))
    }

    const userId = await resolveUserId()

    const created = await prisma.bet.create({
      data: {
        userId,
        sport: data.sport,
        market: data.market,
        pick: data.pick,
        stakeUnits: data.stakeUnits,
        bookOdds: data.bookOdds ?? null,
        fairOdds: data.fairOdds ?? null,
        edgePct,
        // status uses Prisma default
      },
    })

    logger.info({ ip, route: 'bets', event: 'create', id: created.id })
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    logger.error({ ip, route: 'bets', err: (err as Error).message })
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
