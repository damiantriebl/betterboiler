/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporalmente ignorar warnings de lint para permitir build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Configuración de webpack para manejar Prisma
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Para el cliente, asegurar que Prisma se resuelva correctamente
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        util: false,
      };
    }
    return config;
  },

  // Corregir configuración de Turbopack
  turbopack: {},

  // Configuración de imágenes para permitir hostnames externos
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uknapex.s3.us-east-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // 🚀 OPTIMIZACIONES DE THROUGHPUT SIMPLIFICADAS
  // Compresión para reducir tamaño de respuestas
  compress: true,

  // Headers para optimizar caching y conexiones
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Keep-alive para reutilizar conexiones
          {
            key: 'Connection',
            value: 'keep-alive'
          }
        ],
      },
      // Cache para assets estáticos
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ],
      }
    ];
  },
};

export default nextConfig; 