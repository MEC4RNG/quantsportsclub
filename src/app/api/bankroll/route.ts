import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const CreateBankrollEntry = z.object({
  userId: z.string(),
  kind: z.enum(['deposit','withdrawal','bet','win','loss','adjustment']),
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
    const data = await req.json()
    const parsed = CreateBankrollEntry.parse(data)
    const created = await prisma.bankrollEntry.create({ data: parsed })
    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
