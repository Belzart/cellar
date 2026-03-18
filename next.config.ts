import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Explicitly pass server env vars (Next.js sometimes drops them in API routes)
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Allow images from Supabase storage (signed URL hostnames)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/**',
      },
    ],
  },

  // Required for Supabase auth helpers + image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
