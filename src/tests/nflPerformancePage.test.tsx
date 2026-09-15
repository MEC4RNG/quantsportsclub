import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'

const { session, findFirst, findMany, official } = vi.hoisted(() => ({
  session: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  official: vi.fn(),
}))
vi.mock('next-auth', () => ({ getServerSession: session }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ prisma: { nflGsimResult: { findFirst, findMany } } }))
vi.mock('@/lib/nflOfficialResults', () => ({ loadNflResults: official }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`)
  },
}))
import Page from '@/app/(app)/dashboard/nfl/performance/page'

vi.stubGlobal('React', React)
beforeEach(() => vi.clearAllMocks())

it('requires authentication before database or provider access', async () => {
  session.mockResolvedValue(null)
  await expect(Page()).rejects.toThrow('REDIRECT')
  expect(findFirst).not.toHaveBeenCalled()
  expect(official).not.toHaveBeenCalled()
})

it('renders empty metrics and coverage limits honestly', async () => {
  session.mockResolvedValue({ user: {} })
  findFirst.mockResolvedValue(null)
  findMany.mockResolvedValue([])
  const html = renderToStaticMarkup(await Page())
  expect(html).toContain('No eligible NFL pregame receipts yet')
  expect(html).toContain('not betting returns')
  expect(html).toContain('games with no eligible forecast')
})
