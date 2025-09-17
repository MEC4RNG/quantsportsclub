import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const Row = z.object({
  userId: z.string(),
  kind: z.enum(['deposit','withdrawal','bet','win','loss','adjustment']),
  units: z.coerce.number(),
  notes: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional().nullable(),
})
type RowT = z.infer<typeof Row>

export async function POST(req: Request) {
  const text = await req.text()
  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'No CSV provided' }, { status: 400 })
  }

  // Parse CSV with header row
  const records = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]
  const parsed: RowT[] = []
  const errors: { line: number; error: string }[] = []

  records.forEach((r, idx) => {
    const res = Row.safeParse(r)
    if (res.success) parsed.push(res.data)
    else errors.push({ line: idx + 2, error: res.error.errors.map(e => e.message).join('; ') })
  })

  if (parsed.length === 0) {
    return NextResponse.json({ imported: 0, errors }, { status: 400 })
  }

  // Insert
  for (const row of parsed) {
    await prisma.bankrollEntry.create({
      data: {
        userId: row.userId,
        kind: row.kind,
        units: row.units,
        notes: row.notes ?? undefined,
        createdAt: row.createdAt ?? undefined,
      },
    })
  }

  return NextResponse.json({ imported: parsed.length, errors })
}
