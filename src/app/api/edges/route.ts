import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateEdge = z.object({
  sport: z.string(),
  league: z.string().optional(),
  eventId: z.string().optional(),
  market: z.string().optional(),
  pick: z.string().optional(),
  fairOdds: z.number().optional(),
  bookOdds: z.number().optional(),
  edgePct: z.number().optional(),
  stakeUnits: z.number().optional(),
  modelRunId: z.string().optional(),
})

export async function GET() {
  const rows = await prisma.edge.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const parsed = CreateEdge.parse(data)
    const created = await prisma.edge.create({ data: parsed })
    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
