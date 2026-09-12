import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/ip'
import { requireApiKey } from '@/lib/authz'
import { logger } from '@/lib/log'

const CreateBankrollEntry = z.object({
  userId: z.string().min(1),
  kind: z.enum(['deposit', 'withdrawal']),
  units: z.number(),
  notes: z.string().nullable().optional(),
})

export async function GET() {
  const rows = await prisma.bankrollEntry.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
  })
  return NextResponse.json(rows, { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    // API key gate (await the helper; it takes the request, not a string)
    const gate = await requireApiKey(req)
    if (!gate.ok) return gate.res

    const ip = getClientIp(req)
    const rl = await rateLimit({ key: `bankroll:${ip}`, limit: 10, windowMs: 60_000 })
    if (!rl.ok) {
      logger.warn({ ip, route: 'bankroll', event: 'rate_limited' })
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
    const parsed = CreateBankrollEntry.parse(data)

    const created = await prisma.bankrollEntry.create({
      data: {
        userId: parsed.userId,
        kind: parsed.kind,
        units: parsed.units,
        notes: parsed.notes ?? null,
      },
    })

    logger.info({ ip, route: 'bankroll', event: 'create', id: created.id })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
