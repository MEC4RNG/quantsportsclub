// src/app/api/bets/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rateLimit'
import { requireApiKey } from '@/lib/authz'
import { getClientIp } from '@/lib/ip'

// ---- helpers (odds + edge) ----
function toDecimal(american?: number | null): number | null {
  if (american == null) return null
  if (american >= 100) return 1 + american / 100
  if (american <= -100) return 1 + 100 / Math.abs(american)
  return null
}

function impliedFromDecimal(decimal: number): number {
  return 1 / decimal
}

function edgePctFromFairVsBook(fairDec?: number | null, bookDec?: number | null): number | null {
  if (!fairDec || !bookDec) return null
  // positive means bettor edge vs the book
  const fairProb = impliedFromDecimal(fairDec)
  const bookProb = impliedFromDecimal(bookDec)
  return fairProb - bookProb
}

// ---- zod schema for POST body ----
const CreateBet = z.object({
  sport: z.string().min(1),
  league: z.string().nullable().optional().default(null),
  eventId: z.string().nullable().optional().default(null),
  market: z.string().nullable().optional().default(null),
  pick: z.string().min(1),
  stakeUnits: z.number().positive(),

  // odds inputs (one or both may be provided)
  bookOdds: z.number().int().nullable().optional(),
  fairOdds: z.number().int().nullable().optional(),
  oddsAmerican: z.number().int().nullable().optional(),
  oddsDecimal: z.number().nullable().optional(),

  notes: z.string().nullable().optional().default(null),
})

// ---- GET /api/bets ----
export async function GET(_req: NextRequest) {
  // optional: ?status=pending|win|loss
  const url = new URL(_req.url)
  const status = url.searchParams.get('status') ?? undefined
  const allowed = ['pending', 'win', 'loss'] as const
  const where = allowed.includes(status as any) ? { status } : undefined

  const rows = await prisma.bet.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      sport: true,
      league: true,
      eventId: true,
      market: true,
      pick: true,
      stakeUnits: true,
      bookOdds: true,
      fairOdds: true,
      oddsAmerican: true,
      oddsDecimal: true,
      edgePct: true,
      status: true,
      notes: true,
      realizedUnits: true,
    },
  })

  return NextResponse.json(rows, { status: 200 })
}

// ---- POST /api/bets ----
export async function POST(req: NextRequest) {
  try {
    // API key gate for mutating routes (what our tests use)
    const keyOk = requireApiKey(req)
    if (!keyOk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // rate limit per IP
    const ip = getClientIp(req)
    const rl = await rateLimit({ key: `bets:${ip}`, limit: 10, windowMs: 60_000 })
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'X-RateLimit-Remaining': String(rl.remaining) } },
      )
    }

    const body = await req.json()
    const parsed = CreateBet.parse(body)

    // normalize odds
    const bookDec = parsed.oddsDecimal ?? toDecimal(parsed.bookOdds ?? parsed.oddsAmerican ?? null)
    const fairDec = parsed.fairOdds != null ? toDecimal(parsed.fairOdds) : null
    const edgePct = edgePctFromFairVsBook(fairDec, bookDec)

    // IMPORTANT: userId is required by schema.
    // In tests we mock Prisma, but in prod you should set this from session.
    // For now, use a default placeholder that must exist in your DB.
    const userId = process.env.DEFAULT_USER_ID ?? 'demo' // ensure 'demo' exists or set env

    const created = await prisma.bet.create({
      data: {
        user: { connect: { id: userId } },
        sport: parsed.sport,
        league: parsed.league ?? null,
        eventId: parsed.eventId ?? null,
        market: parsed.market ?? null,
        pick: parsed.pick,
        stakeUnits: parsed.stakeUnits,
        bookOdds: parsed.bookOdds ?? parsed.oddsAmerican ?? null,
        fairOdds: parsed.fairOdds ?? null,
        oddsAmerican: parsed.oddsAmerican ?? null,
        oddsDecimal: bookDec,
        edgePct,
        status: 'pending',
        notes: parsed.notes ?? null,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        sport: true,
        league: true,
        eventId: true,
        market: true,
        pick: true,
        stakeUnits: true,
        bookOdds: true,
        fairOdds: true,
        oddsAmerican: true,
        oddsDecimal: true,
        edgePct: true,
        status: true,
        notes: true,
        realizedUnits: true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
