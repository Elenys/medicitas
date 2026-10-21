import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Genera .next/standalone para la imagen de Docker
  output: 'standalone',
};

export default nextConfig;
