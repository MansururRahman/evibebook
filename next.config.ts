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
  headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Never let a browser second-guess a Content-Type, in particular for
          // user uploads served from /uploads.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
  experimental: {
    serverActions: {
      // Image uploads go through server actions; default is 1mb.
      bodySizeLimit: '6mb',
    },
  },
}

export default nextConfig
