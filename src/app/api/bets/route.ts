// src/app/api/bets/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/ip'
import { requireApiKey } from '@/lib/authz'
import { getSessionUserId } from '@/lib/sessionUser'
import { impliedFromAmerican } from '@/lib/odds'

// --- local helper: convert American odds -> Decimal odds (e.g. -110 -> 1.9091, +150 -> 2.5)
function toDecimalFromAmerican(american: number): number {
  if (!Number.isFinite(american) || american === 0) throw new Error('Invalid American odds')
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american)
}

const AmericanOdds = z.number().int().refine((value) => value !== 0, 'Odds cannot be zero')
const CreateBet = z.object({
  sport: z.string().trim().min(1).max(20),
  league: z.string().trim().max(40).nullable().optional().default(null),
  eventId: z.string().trim().max(120).nullable().optional().default(null),
  market: z.string().trim().max(80).nullable().optional().default(null),
  pick: z.string().trim().min(1).max(200),
  stakeUnits: z.number().positive().max(100_000),
  bookOdds: AmericanOdds.nullable().optional().default(null),
  fairOdds: AmericanOdds.nullable().optional().default(null),
}).strict()

export async function GET(_req: NextRequest) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.bet.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
  })
  return NextResponse.json(rows, { status: 200 })
}

export async function POST(req: NextRequest) {
  try {
    // Signed-in users write to their own ledger. The API key remains available
    // for trusted server-to-server ingestion without a browser session.
    const signedInUserId = await getSessionUserId()
    if (!signedInUserId) {
      const auth = await requireApiKey(req)
      if (!auth.ok) return auth.res
    }

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
    const body = await req.json().catch(() => null)
    const validation = CreateBet.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Check the bet fields and odds' }, { status: 400 })
    }
    const parsed = validation.data

    // --- Derive odds & edge if provided
    const oddsDecimal =
      parsed.bookOdds != null ? toDecimalFromAmerican(parsed.bookOdds) : null
    const edgePct =
      parsed.bookOdds != null && parsed.fairOdds != null
        ? (impliedFromAmerican(parsed.fairOdds) - impliedFromAmerican(parsed.bookOdds)) * 100
        : null

    // --- Prisma create
    // Use unchecked create by providing userId. Make sure DEMO_USER_ID exists in DB (seed),
    // or set it in .env / Vercel env. Falls back to 'demo-user'.
   const userId = signedInUserId ?? process.env.DEMO_USER_ID ?? 'demo-user'

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
