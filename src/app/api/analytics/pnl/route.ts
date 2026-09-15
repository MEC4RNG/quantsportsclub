export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getExposureAnalytics } from '@/lib/exposure'
import { getSessionUserId } from '@/lib/sessionUser'

export async function GET(req: Request) {
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const daysParam = url.searchParams.get('days')
  const days = daysParam ? Number(daysParam) : undefined
  const payload = await getExposureAnalytics(userId, Number.isFinite(days!) && days! > 0 ? days : undefined)
  return NextResponse.json(payload)
}
