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
`

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 18px;
`

const Brand = styled(Link)`
  font-weight: 800;
  letter-spacing: 0.4px;
  text-decoration: none;
  color: white;
`

const Grow = styled.div`
  flex: 1;
`

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 12px;
`

const A = styled(Link)<{ $active?: boolean }>`
  padding: 8px 10px;
  border-radius: 10px;
  text-decoration: none;
  color: ${({ $active }) => ($active ? '#0b1220' : 'white')};
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  border: 1px solid rgba(255,255,255,0.12);
  opacity: ${({ $active }) => ($active ? 1 : 0.9)};
  &:hover { opacity: 1; }
`

const Button = styled.button`
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent;
  color: white;
  font-weight: 700;
  cursor: pointer;
  &:hover { opacity: 1 }
`

function join(...parts: string[]) {
  return parts
    .map((p) => p.replace(/(^\/+|\/+$)/g, ''))
    .filter(Boolean)
    .join('/')
}

export default function Header() {
  const { status } = useSession()
  const pathname = usePathname()

  const authed = status === 'authenticated'
  // Helper that builds the right href depending on auth
  const href = (slug: string) => '/' + (authed ? join('dashboard', slug) : join(slug))

  // Active checker that works for both public and dashboard paths
  const isActive = (slug: string) => {
    const pub = '/' + join(slug)
    const app = '/' + join('dashboard', slug)
    return pathname === pub || pathname === app
  }

  return (
    <Bar>
      <Inner>
        <Brand href={authed ? '/dashboard' : '/'}>QuantSportsClub</Brand>

        <Nav>
          <A href={href('picks')} $active={isActive('picks')} aria-current={isActive('picks') ? 'page' : undefined}>
            Picks
          </A>
          <A href={href('stats')} $active={isActive('stats')} aria-current={isActive('stats') ? 'page' : undefined}>
            Stats
          </A>
          <A href={href('leaderboard')} $active={isActive('leaderboard')} aria-current={isActive('leaderboard') ? 'page' : undefined}>
            Leaderboard
          </A>
          <A href={href('exposure')} $active={isActive('exposure')} aria-current={isActive('exposure') ? 'page' : undefined}>
            Exposure
          </A>
          <A href={href('betslip')} $active={isActive('betslip')} aria-current={isActive('betslip') ? 'page' : undefined}>
            Betslip
          </A>
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
