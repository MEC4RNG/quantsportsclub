// src/components/Header.tsx
'use client'

import Link from 'next/link'
import styled from 'styled-components'

const Bar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`

const Brand = styled.div`
  font-weight: 800;
  letter-spacing: 0.4px;
  a {
    text-decoration: none;
  }
`

const Nav = styled.nav`
  display: flex;
  gap: 12px;
  a {
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid transparent;
    text-decoration: none;
  }
  a:hover {
    border-color: rgba(255, 255, 255, 0.12);
  }
`

export default function Header() {
  // Only NEXT_PUBLIC_* is guaranteed on the client.
  // We also check PUBLIC_MVP in case it was inlined during SSR.
  const showMvpClient =
    process.env.NEXT_PUBLIC_PUBLIC_MVP === 'true' ||
    process.env.NEXT_PUBLIC_PUBLIC_MVP === '1' ||
    process.env.NEXT_PUBLIC_PUBLIC_MVP === 'yes'

  const showMvpServer = process.env.PUBLIC_MVP === 'true'

  const showMvp = showMvpClient || showMvpServer

  return (
    <Bar>
      <Brand>
        <Link href="/">QuantSportsClub</Link>
      </Brand>
      <Nav>
        {/* Always-on links */}
        <Link href="/about">About</Link>
        <Link href="/dashboard">Dashboard</Link>

        {/* MVP section (feature-flagged) */}
        {showMvp && (
          <>
            <Link href="/picks">Picks</Link>
            <Link href="/stats">Stats</Link>
            <Link href="/leaderboard">Leaderboard</Link>
          </>
        )}
      </Nav>
    </Bar>
  )
}
