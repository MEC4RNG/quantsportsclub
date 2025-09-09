import styled from 'styled-components'

const Wrap = styled.main`
  max-width: 900px; margin: 40px auto; padding: 24px;
`

export default function AboutPage() {
  return (
    <Wrap>
      <h2>About QuantSportsClub</h2>
      <p>
        This site will host model outputs, bankroll logs, and explainers on sharp betting
        principles (value, line movement, Kelly). Built with Next.js + styled-components.
      </p>
    </Wrap>
  )
}
