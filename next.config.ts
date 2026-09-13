import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
    // Serve our own brand SVG (public/images/logo.svg) through next/image.
    // The CSP + attachment headers keep third-party SVGs from executing scripts.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  webpack: (config) => {
    // Exclude mcp-server directory from Next.js build
    config.module.rules.push({
      test: /\.ts$/,
      exclude: /mcp-server/,
    })
    return config
  },
}

export default nextConfig
