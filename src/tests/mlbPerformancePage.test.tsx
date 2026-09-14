import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi, beforeEach } from 'vitest'
const { session, findMany, official } = vi.hoisted(() => ({ session: vi.fn(), findMany: vi.fn(), official: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: session }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/components/MlbRefresh', () => ({ default: () => null }))
vi.mock('@/lib/db', () => ({ prisma: { mlbGsimResult: { findMany } } }))
vi.mock('@/lib/mlbOfficialResults', () => ({ loadOfficialResults: official }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`) } }))
import Page from '@/app/(app)/dashboard/mlb/performance/page'
vi.stubGlobal('React', React)
beforeEach(() => vi.clearAllMocks())
it('requires authentication before database or provider access', async () => {
  session.mockResolvedValue(null)
  await expect(Page()).rejects.toThrow('REDIRECT')
  expect(findMany).not.toHaveBeenCalled()
  expect(official).not.toHaveBeenCalled()
})
it('renders empty metrics and coverage limits honestly', async () => {
  session.mockResolvedValue({ user: {} })
  findMany.mockResolvedValue([])
  official.mockResolvedValue({ games: new Map(), unavailable: [] })
  const html = renderToStaticMarkup(await Page())
  expect(html).toContain('No eligible pregame receipts yet')
  expect(html).toContain('not betting returns')
  expect(html).toContain('not the entire private simulator history')
})
