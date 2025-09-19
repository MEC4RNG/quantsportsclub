import { prisma } from '@/lib/db'

type DbEdge = {
  id: string
  createdAt: Date
  sport: string
  league: string | null
  eventId: string | null
  market: string | null
  pick: string | null
  stakeUnits: number | null
  fairOdds: number | null
  bookOdds: number | null
  edgePct: number | null
  modelRunId: string | null
}

export type EdgeRow = {
  id: string
  sport: string
  market: string | null
  eventId: string | null
  pick: string | null
  /** Book odds from DB (bookOdds) mapped to UI field */
  price: number | null
  /** Fair odds from DB (fairOdds) mapped to UI field */
  fair: number | null
  edgePct: number | null
  /** Optional note (DB may not have this; set null for now) */
  note: string | null
  createdAt: Date
}

export async function getEdges(opts?: {
  sport?: string
  market?: string
  minEdgePct?: number
  limit?: number
}) {
  const { sport, market, minEdgePct, limit = 50 } = opts ?? {}

  const rows = await prisma.edge.findMany({
    where: {
      ...(sport ? { sport } : {}),
      ...(market ? { market } : {}),
      ...(minEdgePct != null ? { edgePct: { gte: minEdgePct } } : {}),
    },
    orderBy: [{ edgePct: 'desc' }, { createdAt: 'desc' }],
    take: Math.min(Math.max(limit, 1), 200),
    // We can select to be explicit, or just rely on the default; explicit keeps types tight:
    select: {
      id: true,
      createdAt: true,
      sport: true,
      league: true,          // not used in UI but harmless to fetch
      eventId: true,
      market: true,
      pick: true,
      stakeUnits: true,      // not used in UI
      fairOdds: true,
      bookOdds: true,
      edgePct: true,
      modelRunId: true,      // not used in UI
    },
  })

  // Map Prisma fields -> UI shape (price/fair/note)
  const mapped: EdgeRow[] = rows.map((r: DbEdge) => ({
    id: r.id,
    sport: r.sport,
    market: r.market,
    eventId: r.eventId,
    pick: r.pick,
    price: r.bookOdds ?? null,
    fair: r.fairOdds ?? null,
    edgePct: r.edgePct ?? null,
    note: null,              // your schema doesn’t have a note; keep null for now
    createdAt: r.createdAt,
  }))

  return mapped
}
