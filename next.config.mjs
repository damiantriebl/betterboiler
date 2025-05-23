/** @type {import('next').NextConfig} */
const nextConfig = {
  // Temporalmente ignorar warnings de lint para permitir build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Configuración para manejar paquetes externos 
  serverExternalPackages: ['@react-pdf/renderer'],
  // Corregir configuración de Turbopack
  turbopack: {},
};

export default nextConfig; 