// src/app/api/picks/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/ip'
import { logger } from '@/lib/log'

const Query = z.object({
  sport: z.string().min(1).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(200))
    .optional(),
})

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req)

    // 🔧 await the limiter result
    const rl = await rateLimit({ key: `picks:${ip}`, limit: 60, windowMs: 60_000 })
    if (!rl.ok) {
      logger.warn({ ip, route: 'picks', event: 'rate_limited' })
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

    const url = new URL(req.url)
    const parsed = Query.safeParse({
      sport: url.searchParams.get('sport') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const { sport, limit = 50 } = parsed.data

    const rows = await prisma.edge.findMany({
      where: {
        ...(sport ? { sport } : {}),
        edgePct: { not: null },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        createdAt: true,
        sport: true,
        league: true,
        eventId: true,
        market: true,
        pick: true,
        stakeUnits: true,
        fairOdds: true,
        bookOdds: true,
        edgePct: true,
        modelRunId: true,
      },
    })

    logger.info({ ip, route: 'picks', event: 'list', count: rows.length })

    return NextResponse.json(rows, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=15, s-maxage=60, stale-while-revalidate=120',
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.reset),
      },
    })
  } catch (err: unknown) {
    logger.error({ route: 'picks', err })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
