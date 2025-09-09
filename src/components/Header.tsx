'use client'
import styled from 'styled-components'
import Link from 'next/link'

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
`

export default function Header() {
  return (
    <Bar>
      <Brand href="/">QuantSportsClub</Brand>
      <Nav>
        <Link href="/about">About</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="https://github.com/" target="_blank">GitHub</Link>
      </Nav>
    </Bar>
  )
}
