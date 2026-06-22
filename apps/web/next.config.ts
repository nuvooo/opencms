import { NextConfig } from 'next';

const nextConfig = {
  reactStrictMode: false,
  experimental: {
    viewTransition: true,
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/assets/:path*',
        destination: `${process.env.API_URL}/assets/:path*`,
      },
      {
        source: '/api-docs/:path*',
        destination: `${process.env.API_URL}/api-docs/:path*`,
      },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
