import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'localhost',
      '127.0.0.1',
      ...(process.env.NEXT_PUBLIC_BACKEND_URL 
        ? [process.env.NEXT_PUBLIC_BACKEND_URL.replace(/^https?:\/\//, '').split(':')[0]]
        : []
      )
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/public/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5000',
        pathname: '/public/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/public/**',
      },
    ],
  },
};

export default nextConfig;
