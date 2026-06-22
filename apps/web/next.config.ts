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
    // API_URL carries the Nest global '/api' prefix (e.g. http://host:8000/api),
    // but Fastify static assets ('/assets') and Swagger ('/api-docs') are served
    // at the origin root, outside that prefix. Strip the prefix for these.
    const apiOrigin = (process.env.API_URL ?? '').replace(/\/api\/?$/, '');
    return [
      {
        source: '/assets/:path*',
        destination: `${apiOrigin}/assets/:path*`,
      },
      {
        source: '/api-docs/:path*',
        destination: `${apiOrigin}/api-docs/:path*`,
      },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
