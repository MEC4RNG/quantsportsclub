import styled from 'styled-components'

const Grid = styled.main`
  max-width: 1100px; margin: 40px auto; padding: 24px;
  display: grid; gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
`

const Card = styled.div`
  background: ${({ theme }) => theme.colors.card};
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 16px;
`

export default function Dashboard() {
  return (
    <Grid>
      <Card>
        <h3>Today&apos;s Edges</h3>
        <p>Wire up your model feed here.</p>
      </Card>
      <Card>
        <h3>Bankroll</h3>
        <p>Track units, CLV, and Kelly stakes.</p>
      </Card>
      <Card>
        <h3>Market Watch</h3>
        <p>Live line movement and bet splits.</p>
      </Card>
    </Grid>
  )
}
