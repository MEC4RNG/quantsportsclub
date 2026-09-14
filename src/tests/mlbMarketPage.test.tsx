import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
const { session, findMany, official } = vi.hoisted(() => ({ session: vi.fn(), findMany: vi.fn(), official: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: session }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/components/MlbRefresh', () => ({ default: () => null }))
vi.mock('@/lib/db', () => ({ prisma: { mlbMarketSnapshot: { findMany } } }))
vi.mock('@/lib/mlbOfficialResults', () => ({ loadOfficialResults: official }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`) } }))
import Page from '@/app/(app)/dashboard/mlb/markets/page'
vi.stubGlobal('React', React)
beforeEach(() => vi.clearAllMocks())
it('requires authentication before storage or results access', async () => {
  session.mockResolvedValue(null)
  await expect(Page()).rejects.toThrow('REDIRECT')
  expect(findMany).not.toHaveBeenCalled(); expect(official).not.toHaveBeenCalled()
})
it('explains empty coverage without inventing a historical cohort', async () => {
  session.mockResolvedValue({ user: {} }); findMany.mockResolvedValue([])
  official.mockResolvedValue({ games: new Map(), unavailable: [] })
  const html = renderToStaticMarkup(await Page())
  expect(html).toContain('No eligible market observations')
  expect(html).toContain('not betting returns')
  expect(html).toContain('not backfilled')
})
