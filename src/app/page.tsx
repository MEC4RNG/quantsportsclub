import styled from 'styled-components'
import Link from 'next/link'

const Hero = styled.section`
  max-width: 1100px;
  margin: 40px auto;
  padding: 24px;
`
const H1 = styled.h1`
  font-size: clamp(32px, 6vw, 56px);
  line-height: 1.05;
  margin: 0 0 12px;
`
const P = styled.p`
  max-width: 720px;
  font-size: 18px;
  opacity: 0.9;
`

const CTA = styled.div`
  display: flex; gap: 12px; margin-top: 20px;
  a, button {
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: ${({ theme }) => theme.colors.primary};
    color: #0b1220;
    font-weight: 700;
  }
`

export default function Page() {
  return (
    <Hero>
      <H1>Bet smarter. Build edge.</H1>
      <P>
        QuantSportsClub is a hub for data‑driven sports analysis. Track models, publish picks,
        and learn Billy‑Walters‑style bankroll discipline. This is a starter skeleton—plug in your
        APIs, sheets, and dashboards next.
      </P>
      <CTA>
        <Link href="/dashboard">Open Dashboard</Link>
        <Link href="/about">Learn more</Link>
      </CTA>
    </Hero>
  )
}
