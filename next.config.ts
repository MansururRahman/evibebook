import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // v1 is an auth-gated app rendered per request; Cache Components / PPR adds no value yet.
  cacheComponents: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  experimental: {
    serverActions: {
      // Image uploads go through server actions; default is 1mb.
      bodySizeLimit: '6mb',
    },
  },
}

export default nextConfig
