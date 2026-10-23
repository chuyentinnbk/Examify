import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: [
    'geoip-lite',
    'winston',
    'winston-daily-rotate-file',
    'ioredis',
    'bullmq',
    'bcryptjs',
    '@prisma/client',
  ],
  transpilePackages: ['docx'],
  experimental: {
    serverActions: {
      bodySizeLimit: '1024mb',
    },
  },
  async redirects() {
    return [
      {
        source: '/setup',
        destination: '/#setup-wizard',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/#dashboard',
        permanent: false,
      },
    ];
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        'geoip-lite': false,
      };
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
