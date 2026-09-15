'use client'
import { createGlobalStyle } from 'styled-components'

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #__next { height: 100%; }
  body {
    margin: 0;
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, 'Apple Color Emoji', 'Segoe UI Emoji';
  }
  a { color: inherit; text-decoration: none; }
  :focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 3px;
  }
  #main-content:focus { outline: none; }
  .skip-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 1000;
    padding: 10px 14px;
    border-radius: 8px;
    background: ${({ theme }) => theme.colors.primary};
    color: #0b1220;
    font-weight: 800;
    transform: translateY(-160%);
    transition: transform 120ms ease-out;
  }
  .skip-link:focus { transform: translateY(0); }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`

export default GlobalStyle
