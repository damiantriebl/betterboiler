import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceHeaders, getCacheHeaders, optimizeJsonResponse } from './performance-config';
import { responseCache, CACHE_TTL } from './response-cache';

// 🚀 OPTIMIZADOR DE APIs PARA THROUGHPUT CON CACHING

export function withPerformanceOptimization<T = any>(
  handler: (req: NextRequest) => Promise<NextResponse<T>> | NextResponse<T>,
  options?: {
    cache?: boolean;
    cacheTTL?: number;
    cacheType?: keyof typeof CACHE_TTL;
  }
) {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    const start = performance.now();
    const { cache = false, cacheTTL, cacheType = 'DYNAMIC_DATA' } = options || {};
    
    try {
      // 🚀 INTENTO DE CACHE PARA GET REQUESTS
      if (cache && req.method === 'GET') {
        const url = req.nextUrl.pathname + req.nextUrl.search;
        const userId = req.headers.get('x-user-id') || undefined;
        const organizationId = req.headers.get('x-organization-id') || undefined;
        
        const cacheKey = responseCache.generateKey(url, req.method, userId, organizationId);
        const cachedResponse = responseCache.get<any>(cacheKey);
        
        if (cachedResponse) {
          const duration = performance.now() - start;
          const response = NextResponse.json(cachedResponse);
          
          // Headers de performance
          const headers = getPerformanceHeaders();
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
          
          response.headers.set('Server-Timing', `api-cached;dur=${duration.toFixed(2)}`);
          response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
          response.headers.set('X-Cache', 'HIT');
          response.headers.set('X-Cache-Key', cacheKey);
          
          // Cache headers
          const cacheHeaders = getCacheHeaders('api');
          Object.entries(cacheHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
          
          return response as NextResponse<T>;
        }
      }

      // Ejecutar handler original
      const response = await handler(req);
      
      // Calcular tiempo de respuesta
      const duration = performance.now() - start;
      
      // 🚀 GUARDAR EN CACHE SI ES SUCCESSFUL GET REQUEST
      if (cache && req.method === 'GET' && response.status === 200) {
        try {
          const responseData = await response.clone().json();
          const url = req.nextUrl.pathname + req.nextUrl.search;
          const userId = req.headers.get('x-user-id') || undefined;
          const organizationId = req.headers.get('x-organization-id') || undefined;
          
          const cacheKey = responseCache.generateKey(url, req.method, userId, organizationId);
          const ttl = cacheTTL || CACHE_TTL[cacheType];
          
          responseCache.set(cacheKey, responseData, ttl);
        } catch (error) {
          // Silently fail cache storage
          console.warn('Failed to cache response:', error);
        }
      }
      
      // Aplicar headers de performance
      const headers = getPerformanceHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Agregar timing information
      response.headers.set('Server-Timing', `api;dur=${duration.toFixed(2)}`);
      response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
      response.headers.set('X-Cache', 'MISS');
      
      // Aplicar cache headers según el método
      if (req.method === 'GET') {
        const cacheHeaders = getCacheHeaders('api');
        Object.entries(cacheHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
    } catch (error) {
      // Error timing
      const duration = performance.now() - start;
      
      const errorResponse = NextResponse.json(
        { error: 'Internal server error', timing: `${duration.toFixed(2)}ms` },
        { status: 500 }
      );
      
      errorResponse.headers.set('Server-Timing', `error;dur=${duration.toFixed(2)}`);
      errorResponse.headers.set('X-Cache', 'ERROR');
      
      return errorResponse as NextResponse<T>;
    }
  };
}

// Optimizar respuestas JSON grandes con streaming
export function optimizedJsonResponse<T>(
  data: T,
  options?: { 
    status?: number;
    cache?: boolean;
    compress?: boolean;
    stream?: boolean;
  }
) {
  const { status = 200, cache = true, compress = false, stream = false } = options || {};
  
  // Para respuestas grandes, usar streaming
  if (stream && typeof data === 'object') {
    const jsonString = JSON.stringify(data);
    if (jsonString.length > 100000) { // > 100KB
      return streamJsonResponse(data, status);
    }
  }
  
  const optimizedData = optimizeJsonResponse(data, { compress });
  const response = NextResponse.json(optimizedData, { status });
  
  // Headers de performance
  const headers = getPerformanceHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Cache headers si está habilitado
  if (cache) {
    const cacheHeaders = getCacheHeaders('api');
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

// Streaming de respuestas JSON grandes
function streamJsonResponse<T>(data: T, status: number = 200): NextResponse {
  const encoder = new TextEncoder();
  const jsonString = JSON.stringify(data);
  
  const stream = new ReadableStream({
    start(controller) {
      // Enviar data en chunks de 8KB
      const chunkSize = 8192;
      let offset = 0;
      
      const sendChunk = () => {
        if (offset < jsonString.length) {
          const chunk = jsonString.slice(offset, offset + chunkSize);
          controller.enqueue(encoder.encode(chunk));
          offset += chunkSize;
          // Usar requestIdleCallback si está disponible
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(sendChunk);
          } else {
            setTimeout(sendChunk, 0);
          }
        } else {
          controller.close();
        }
      };
      
      sendChunk();
    }
  });
  
  return new NextResponse(stream, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      ...getPerformanceHeaders(),
    }
  });
}

// Middleware para logging de performance mejorado
export function logPerformance(req: NextRequest, duration: number) {
  if (process.env.NODE_ENV === 'development') {
    const emoji = duration < 50 ? '🚀' : duration < 100 ? '⚡' : duration < 500 ? '🟡' : '🐌';
    console.log(`${emoji} ${req.method} ${req.nextUrl.pathname} - ${duration.toFixed(2)}ms`);
  }
}

// Utility para manejar paginación eficiente con caching
export function optimizePagination(
  page: number = 1,
  limit: number = 20,
  maxLimit: number = 100
) {
  const normalizedPage = Math.max(1, page);
  const normalizedLimit = Math.min(Math.max(1, limit), maxLimit);
  const offset = (normalizedPage - 1) * normalizedLimit;
  
  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset,
    skip: offset,
    take: normalizedLimit,
    // Cache key helper para paginación
    cacheKey: `page:${normalizedPage}:limit:${normalizedLimit}`,
  };
}

// Helper para invalidar cache después de mutations
export function invalidateRelatedCache(patterns: string[]) {
  let totalRemoved = 0;
  patterns.forEach(pattern => {
    const removed = responseCache.invalidatePattern(pattern);
    totalRemoved += removed;
  });
  
  if (totalRemoved > 0 && process.env.NODE_ENV === 'development') {
    console.log(`🗑️ Invalidated ${totalRemoved} cache entries`);
  }
  
  return totalRemoved;
}

// Endpoint para estadísticas de cache (debugging)
export function getCacheStats() {
  return responseCache.getStats();
} 