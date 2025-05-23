// 🚀 CONFIGURACIONES DE OPTIMIZACIÓN DE THROUGHPUT

export const PERFORMANCE_CONFIG = {
  // Cache configurations
  CACHE_TTL: {
    STATIC_ASSETS: 31536000, // 1 año
    API_RESPONSES: 300,      // 5 minutos  
    DYNAMIC_CONTENT: 60,     // 1 minuto
    USER_SESSION: 3600,      // 1 hora
  },

  // Response optimization
  RESPONSE_LIMITS: {
    MAX_JSON_SIZE: 10 * 1024 * 1024,  // 10MB
    MAX_ITEMS_PER_PAGE: 100,
    DEFAULT_PAGE_SIZE: 20,
  },

  // Connection optimization
  CONNECTION: {
    KEEP_ALIVE_TIMEOUT: 5000,
    MAX_CONNECTIONS: 1000,
    REQUEST_TIMEOUT: 30000,
  },

  // Headers para optimización
  HEADERS: {
    SECURITY: {
      'X-DNS-Prefetch-Control': 'on',
      'X-XSS-Protection': '1; mode=block',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'origin-when-cross-origin',
    },
    PERFORMANCE: {
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=5, max=1000',
      'X-Powered-By': 'Next.js',
    },
    CACHE_STATIC: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    CACHE_DYNAMIC: {
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
    CACHE_API: {
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  },
};

// Utility para aplicar headers de cache
export function getCacheHeaders(type: 'static' | 'dynamic' | 'api') {
  switch (type) {
    case 'static':
      return PERFORMANCE_CONFIG.HEADERS.CACHE_STATIC;
    case 'api':
      return PERFORMANCE_CONFIG.HEADERS.CACHE_API;
    case 'dynamic':
    default:
      return PERFORMANCE_CONFIG.HEADERS.CACHE_DYNAMIC;
  }
}

// Utility para optimizar respuestas JSON
export function optimizeJsonResponse<T>(data: T, options?: {
  compress?: boolean;
  maxSize?: number;
}) {
  const jsonString = JSON.stringify(data);
  const size = Buffer.byteLength(jsonString, 'utf8');
  
  if (options?.maxSize && size > options.maxSize) {
    throw new Error(`Response too large: ${size} bytes (max: ${options.maxSize})`);
  }

  return {
    data,
    meta: {
      size,
      compressed: options?.compress || false,
      timestamp: new Date().toISOString(),
    },
  };
}

// Headers de performance para respuestas API
export function getPerformanceHeaders() {
  return {
    ...PERFORMANCE_CONFIG.HEADERS.SECURITY,
    ...PERFORMANCE_CONFIG.HEADERS.PERFORMANCE,
  };
} 