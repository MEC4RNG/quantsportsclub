import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sessionUserId, getExposureAnalytics } = vi.hoisted(() => ({
  sessionUserId: vi.fn(),
  getExposureAnalytics: vi.fn(),
}))
vi.mock('@/lib/sessionUser', () => ({ getSessionUserId: sessionUserId }))
vi.mock('@/lib/exposure', () => ({ getExposureAnalytics }))

import { GET } from '@/app/api/analytics/pnl/route'

describe('exposure analytics access', () => {
  beforeEach(() => {
    sessionUserId.mockReset()
    getExposureAnalytics.mockReset()
  })

  it('rejects anonymous requests before querying exposure', async () => {
    sessionUserId.mockResolvedValue(null)
    const response = await GET(new Request('http://localhost/api/analytics/pnl'))
    expect(response.status).toBe(401)
    expect(getExposureAnalytics).not.toHaveBeenCalled()
  })

  it('scopes analytics to the signed-in user', async () => {
    sessionUserId.mockResolvedValue('user-1')
    getExposureAnalytics.mockResolvedValue({ daily: [], pendingBySport: [] })
    const response = await GET(new Request('http://localhost/api/analytics/pnl?days=30'))
    expect(response.status).toBe(200)
    expect(getExposureAnalytics).toHaveBeenCalledWith('user-1', 30)
  })
})
