import { NextRequest, NextResponse } from "next/server";
import { auth } from "./src/auth";

export default async function authMiddleware(request: NextRequest) {
  // 🚀 OPTIMIZACIÓN DE THROUGHPUT
  // Early return para assets estáticos
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/api/auth/') ||
    request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Optimizar headers de respuesta para throughput
  const response = await auth.handler(request);
  
  // Agregar headers de optimización
  if (response) {
    response.headers.set('X-Powered-By', 'Next.js');
    response.headers.set('Server-Timing', 'middleware;dur=0');
    return response;
  }

  // Para rutas que no necesitan autenticación
  const nextResponse = NextResponse.next();
  nextResponse.headers.set('X-Powered-By', 'Next.js');
  nextResponse.headers.set('Server-Timing', 'middleware;dur=0');
  
  return nextResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Apply middleware to all other routes
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}; 