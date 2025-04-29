import type { NextConfig } from "next";

// next.config.mjs o next.config.js
const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Desactivar la optimización de imágenes completamente
    domains: ['uknapex.s3.us-east-1.amazonaws.com'], // Mantener por compatibilidad
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Permitir cualquier origen para las imágenes
          },
        ],
      },
    ];
  },
};

export default nextConfig;
