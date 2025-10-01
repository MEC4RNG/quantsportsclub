// src/lib/authz.ts
import { NextRequest, NextResponse } from 'next/server'

export async function requireApiKey(req: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const required = process.env.API_KEY?.trim()
  if (!required) return { ok: true } // gate disabled if no key configured

  const provided = req.headers.get('x-api-key')?.trim()
  if (provided !== required) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { ok: true }
}
