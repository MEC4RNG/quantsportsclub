import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/log'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

const CreateBankrollEntry = z.object({
  userId: z.string(),
  kind: z.enum(['deposit', 'withdrawal', 'bet', 'win', 'loss', 'adjustment']),
  units: z.number(),
  notes: z.string().optional(),
})

export async function GET() {
  const rows = await prisma.bankrollEntry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const r = await rateLimit({
    if (!r.ok) {
      logger.warn({ ip, route: 'bankroll', event: 'rate_limited' })
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(r.reset),
          },
        },
      )
    }

    const data = await req.json()
    const parsed = CreateBankrollEntry.parse(data)
    const created = await prisma.bankrollEntry.create({ data: parsed })
    logger.info({ ip, route: 'bankroll', event: 'create', id: created.id })

    return NextResponse.json(created, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': String(r.remaining),
        'X-RateLimit-Reset': String(r.reset),
      },
    })
  } catch (err: any) {
    logger.error({ route: 'bankroll', event: 'error', err: err?.message })
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
