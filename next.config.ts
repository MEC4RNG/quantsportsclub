// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: {
      ssr: true,
      displayName: true,
      // optional: fileName: false, minify: true, pure: true
    },
  },
}

export default nextConfig
