// src/app/api/bets/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/ip'
import { requireApiKey } from '@/lib/authz'

// --- local helper: convert American odds -> Decimal odds (e.g. -110 -> 1.9091, +150 -> 2.5)
function toDecimalFromAmerican(american: number): number {
  if (!Number.isFinite(american) || american === 0) throw new Error('Invalid American odds')
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american)
}

const CreateBet = z.object({
  sport: z.string().min(1),
  league: z.string().nullable().optional().default(null),
  eventId: z.string().nullable().optional().default(null),
  market: z.string().nullable().optional().default(null),
  pick: z.string().min(1),
  stakeUnits: z.number().positive(),
  bookOdds: z.number().nullable().optional().default(null), // e.g. -110
  fairOdds: z.number().nullable().optional().default(null), // e.g. -105
}).strict()

// Keep GET public for now
export async function GET(_req: NextRequest) {
  const rows = await prisma.bet.findMany({
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
  })
  return NextResponse.json(rows, { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    // --- API key gate
    const auth = await requireApiKey(req)
    if (!auth.ok) return auth.res

    // --- Rate limit
    const ip = getClientIp(req)
    const r = await rateLimit({ key: `bets:${ip}`, limit: 10, windowMs: 60_000 })
    if (!r.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': String(r.remaining),
            'X-RateLimit-Reset': String(r.reset),
            'X-RateLimit-Limit': String(r.limit),
          },
        }
      )
    }

    // --- Parse input
    const body = await req.json()
    const parsed = CreateBet.parse(body)

    // --- Derive odds & edge if provided
    const oddsDecimal =
      parsed.bookOdds != null ? toDecimalFromAmerican(parsed.bookOdds) : null
    const fairDecimal =
      parsed.fairOdds != null ? toDecimalFromAmerican(parsed.fairOdds) : null
    const edgePct =
      oddsDecimal != null && fairDecimal != null
        ? (fairDecimal - oddsDecimal) / oddsDecimal
        : null

    // --- Prisma create
    // Use unchecked create by providing userId. Make sure DEMO_USER_ID exists in DB (seed),
    // or set it in .env / Vercel env. Falls back to 'demo-user'.
   const userId = process.env.DEMO_USER_ID ?? 'demo-user'

const created = await prisma.bet.create({
  data: {
    // satisfy the relation safely
    user: {
      connectOrCreate: {
        where: { id: userId },
        create: { id: userId, name: 'Demo User' },
      },
    },

    sport: parsed.sport,
    league: parsed.league,
    eventId: parsed.eventId,
    market: parsed.market,
    pick: parsed.pick,
    stakeUnits: parsed.stakeUnits,
    bookOdds: parsed.bookOdds,
    fairOdds: parsed.fairOdds,
    edgePct,
    oddsAmerican: parsed.bookOdds,
    oddsDecimal,
    status: 'pending',
    notes: null,
  },
})


    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
