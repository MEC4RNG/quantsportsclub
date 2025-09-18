export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getExposureAnalytics } from '@/lib/exposure'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const daysParam = url.searchParams.get('days')
  const days = daysParam ? Number(daysParam) : undefined
  const payload = await getExposureAnalytics(Number.isFinite(days!) && days! > 0 ? days : undefined)
  return NextResponse.json(payload)
}
