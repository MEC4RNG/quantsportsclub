'use client'
import styled from 'styled-components'
import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'

const Bar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: ${({ theme }) => theme.colors.card};
  position: sticky;
  top: 0;
  z-index: 10;
`

const Brand = styled(Link)`
  font-weight: 800;
  letter-spacing: 0.5px;
`

const Nav = styled.nav`
  display: flex; gap: 16px;
  a { opacity: 0.9; }
  a:hover { opacity: 1; }
  button {
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: ${({ theme }) => theme.colors.primary};
    color: #0b1220;
    font-weight: 700;
    cursor: pointer;
  }
`

export default function Header() {
  const { status } = useSession()
  return (
    <Bar>
      <Brand href="/">QuantSportsClub</Brand>
      <Nav>
        <Link href="/about">About</Link>
        <Link href="/dashboard">Dashboard</Link>
        {status === 'authenticated' ? (
          <button onClick={() => signOut({ callbackUrl: '/' })}>Sign out</button>
        ) : (
          <button onClick={() => signIn('github', { callbackUrl: '/dashboard' })}>Sign in</button>
        )}
      </Nav>
    </Bar>
  )
}
