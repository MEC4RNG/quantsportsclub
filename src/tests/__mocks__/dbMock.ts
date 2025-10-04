// src/tests/__mocks__/dbMock.ts
// Minimal in-memory Prisma mock for tests

type Id = string
const nid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date()

// In-memory stores
const users: Array<{ id: Id; email: string; name?: string | null }> = [
  { id: 'u1', email: 'demo@local.test', name: 'Demo User' },
]
const bets: Array<{
  id: Id
  createdAt: Date
  updatedAt: Date
  userId: Id
  sport: string
  league: string | null
  eventId: string | null
  market: string | null
  pick: string
  stakeUnits: number
  status: 'pending' | 'win' | 'loss' | 'void'
  notes: string | null
  realizedUnits: number | null
  // optional odds fields
  bookOdds: number | null
  fairOdds: number | null
  edgePct: number | null
}> = []

const bankrollEntries: Array<{
  id: Id
  createdAt: Date
  updatedAt: Date
  userId: Id
  kind: 'deposit' | 'withdrawal'
  units: number
  notes: string | null
}> = [
  { id: 'b1', createdAt: now(), updatedAt: now(), userId: 'u1', kind: 'deposit', units: 100, notes: null },
]

// Optional edges dataset if other tests use it
const edges: Array<{
  id: Id
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
}> = []

// Helpers
function sortDescByCreated<T extends { createdAt: Date }>(arr: T[]) {
  return [...arr].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// Prisma-like client
export const prisma = {
  user: {
    findFirst: async ({ select }: any = {}) => {
      const u = users[0]
      if (!u) return null
      return select ? Object.fromEntries(Object.keys(select).map(k => [k, (u as any)[k]])) : u
    },
    create: async ({ data, select }: any) => {
      const u = { id: nid(), email: data.email, name: data.name ?? null }
      users.push(u)
      return select ? Object.fromEntries(Object.keys(select).map(k => [k, (u as any)[k]])) : u
    },
  },

  bet: {
    findMany: async ({ where, orderBy, take }: any = {}) => {
      let rows = bets
      if (where?.status) rows = rows.filter(b => b.status === where.status)
      if (orderBy?.[0]?.createdAt === 'desc') rows = sortDescByCreated(rows)
      if (Number.isFinite(take)) rows = rows.slice(0, take)
      return rows
    },
    findUnique: async ({ where }: any) => {
      return bets.find(b => b.id === where.id) ?? null
    },
    create: async ({ data }: any) => {
      const bet = {
        id: nid(),
        createdAt: now(),
        updatedAt: now(),
        userId: data.userId,
        sport: data.sport,
        league: data.league ?? null,
        eventId: data.eventId ?? null,
        market: data.market ?? null,
        pick: data.pick,
        stakeUnits: data.stakeUnits,
        status: (data.status ?? 'pending') as 'pending' | 'win' | 'loss' | 'void',
        notes: data.notes ?? null,
        realizedUnits: data.realizedUnits ?? null,
        bookOdds: data.bookOdds ?? null,
        fairOdds: data.fairOdds ?? null,
        edgePct: data.edgePct ?? null,
      }
      bets.push(bet)
      return bet
    },
    update: async ({ where, data }: any) => {
      const i = bets.findIndex(b => b.id === where.id)
      if (i === -1) throw new Error('Bet not found')
      const updated = { ...bets[i], ...data, updatedAt: now() }
      bets[i] = updated
      return updated
    },
    aggregate: async ({ where, _sum }: any) => {
      let rows = bets
      if (where?.status?.in) {
        const set = new Set(where.status.in)
        rows = rows.filter(b => set.has(b.status))
      }
      const sum: any = {}
      if (_sum?.realizedUnits) {
        sum.realizedUnits = rows.reduce((acc, b) => acc + (b.realizedUnits ?? 0), 0)
      }
      return { _sum: sum }
    },
  },

  bankrollEntry: {
    findMany: async ({ select }: any = {}) => {
      return bankrollEntries.map(e =>
        select
          ? Object.fromEntries(Object.keys(select).map(k => [k, (e as any)[k]]))
          : e,
      )
    },
  },

  edge: {
    create: async ({ data }: any) => {
      const row = {
        id: nid(),
        createdAt: now(),
        sport: data.sport,
        league: data.league ?? null,
        eventId: data.eventId ?? null,
        market: data.market ?? null,
        pick: data.pick ?? null,
        stakeUnits: data.stakeUnits ?? null,
        fairOdds: data.fairOdds ?? null,
        bookOdds: data.bookOdds ?? null,
        edgePct: data.edgePct ?? null,
        modelRunId: data.modelRunId ?? null,
      }
      edges.push(row)
      return row
    },
    findMany: async () => edges,
  },

  // Support $transaction(fn) used by settle route
  $transaction: async (fnOrArr: any) => {
    if (typeof fnOrArr === 'function') {
      // function gets a "tx client" with same surface
      return await fnOrArr(prisma as any)
    }
    // array of promises case
    return await Promise.all(fnOrArr)
  },
}
