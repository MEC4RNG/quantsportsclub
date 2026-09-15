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
vi.mock('@/components/PerformanceRefresh', () => ({ default: () => null }))
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

it('renders the chronological comparison with the early-sample gate', async () => {
  session.mockResolvedValue({ user: {} })
  findFirst.mockResolvedValue({ season: 2026 })
  findMany.mockResolvedValue([
    {
      id: 'receipt',
      payloadHash: 'a'.repeat(64),
      generatedAt: new Date('2026-09-13T13:55:00Z'),
      createdAt: new Date('2026-09-13T14:00:00Z'),
      season: 2026,
      week: 1,
      trialsPerGame: 1000,
      marketIndependent: true,
      decisionUse: 'PRODUCTION_READY_NOT_FINAL_GAME_DAY',
      games: [
        {
          gameId: '2026_01_A_H',
          awayTeam: 'A',
          homeTeam: 'H',
          awayWinProbability: 0.35,
          homeWinProbability: 0.6,
          tieProbability: 0.05,
          projectedMarginHome: 3,
          projectedTotalCalibrated: 44,
          validTrials: 1000,
          invalidTrials: 0,
          provisional: false,
          decisionUse: 'PRODUCTION_READY_NOT_FINAL_GAME_DAY',
        },
      ],
    },
  ])
  official.mockResolvedValue({
    games: new Map([
      [
        '2026_01_A_H',
        {
          gameId: '2026_01_A_H',
          season: 2026,
          week: 1,
          kickoffUtc: '2026-09-13T17:00:00Z',
          awayTeam: 'A',
          homeTeam: 'H',
          awayScore: 20,
          homeScore: 27,
        },
      ],
    ]),
    scheduledGames: 16,
    sourceUrl: 'https://example.test/games.csv',
    sourceHash: 'b'.repeat(64),
    baseline: {
      seasons: [2023, 2024, 2025],
      sampleGames: 816,
      awayWinProbability: 0.45,
      homeWinProbability: 0.54,
      tieProbability: 0.01,
      meanTotal: 42,
      meanHomeMargin: 2,
    },
    unavailable: false,
  })
  const html = renderToStaticMarkup(await Page())
  expect(html).toContain('Chronological baseline comparison')
  expect(html).toContain('descriptive only')
  expect(html).toContain('1 of 50 graded games')
  expect(html).toContain('2023–2024–2025')
})
