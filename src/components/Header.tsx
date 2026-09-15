// src/components/Header.tsx
'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import styled from 'styled-components'

const Bar = styled.header`
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(10, 12, 18, 0.6);
  backdrop-filter: blur(6px);
  position: sticky;
  top: 0;
  z-index: 50;
`

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
`

const Brand = styled(Link)`
  font-weight: 800;
  letter-spacing: 0.4px;
  text-decoration: none;
  color: white;
  @media (max-width: 720px) { flex: 1; }
`

const Grow = styled.div`
  flex: 1;
  @media (max-width: 720px) { display: none; }
`

const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  @media (max-width: 720px) {
    order: 3;
    width: 100%;
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: thin;
  }
`

const A = styled(Link)<{ $active?: boolean }>`
  padding: 8px 10px;
  border-radius: 10px;
  text-decoration: none;
  color: ${({ $active }) => ($active ? '#0b1220' : 'white')};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  border: 1px solid rgba(255,255,255,0.12);
  opacity: ${({ $active }) => ($active ? 1 : 0.9)};
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  &:hover { opacity: 1; }
  &:focus-visible { opacity: 1; }
`

const Button = styled.button`
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent;
  color: white;
  font-weight: 700;
  cursor: pointer;
  min-height: 42px;
  &:hover { opacity: 1 }
  &:focus-visible { opacity: 1 }
`

export default function Header() {
  const { data, status } = useSession()
  const pathname = usePathname()

  const authed = status === 'authenticated'
  const contentReviewer = (data?.user as { contentReviewer?: boolean } | undefined)?.contentReviewer === true
  return (
    <Bar>
      <Inner>
        <Brand href={authed ? '/dashboard' : '/'}>QuantSportsClub</Brand>

        <Nav aria-label="Primary navigation">
          {authed && (
            <A href="/dashboard" $active={pathname === '/dashboard'} aria-current={pathname === '/dashboard' ? 'page' : undefined}>
              Overview
            </A>
          )}
          {!authed && (
            <A href="/picks" $active={pathname === '/picks'} aria-current={pathname === '/picks' ? 'page' : undefined}>
              Picks
            </A>
          )}
          {!authed && (
            <A href="/stats" $active={pathname === '/stats'} aria-current={pathname === '/stats' ? 'page' : undefined}>
              Stats
            </A>
          )}
          {authed && (
            <A href="/dashboard/mlb" $active={pathname === '/dashboard/mlb'} aria-current={pathname === '/dashboard/mlb' ? 'page' : undefined}>
              MLB
            </A>
          )}
          {authed && (
            <A href="/dashboard/nfl" $active={pathname === '/dashboard/nfl'} aria-current={pathname === '/dashboard/nfl' ? 'page' : undefined}>
              NFL
            </A>
          )}
          {contentReviewer && (
            <A href="/dashboard/content" $active={pathname === '/dashboard/content'} aria-current={pathname === '/dashboard/content' ? 'page' : undefined}>
              Content Review
            </A>
          )}
          {!authed && (
            <A href="/leaderboard" $active={pathname === '/leaderboard'} aria-current={pathname === '/leaderboard' ? 'page' : undefined}>
              Leaderboard
            </A>
          )}
          {authed && (
            <A href="/exposure" $active={pathname === '/exposure'} aria-current={pathname === '/exposure' ? 'page' : undefined}>
              Exposure
            </A>
          )}
          {authed && (
            <A href="/betslip" $active={pathname === '/betslip'} aria-current={pathname === '/betslip' ? 'page' : undefined}>
              Betslip
            </A>
          )}
        </Nav>

        <Grow />

        {authed ? (
          <Button onClick={() => signOut({ callbackUrl: '/' })}>Sign out</Button>
        ) : (
          <Button onClick={() => signIn('github')}>Sign in with GitHub</Button>
        )}
      </Inner>
    </Bar>
  )
}
