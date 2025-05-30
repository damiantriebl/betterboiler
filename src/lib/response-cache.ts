// 🚀 SISTEMA DE RESPONSE CACHING PARA THROUGHPUT

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Máximo 1000 entradas
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  // Generar clave de cache basada en URL y headers relevantes
  generateKey(url: string, method: string, userId?: string, organizationId?: string): string {
    const baseKey = `${method}:${url}`;
    const userContext = userId ? `user:${userId}` : "anonymous";
    const orgContext = organizationId ? `org:${organizationId}` : "no-org";
    return `${baseKey}:${userContext}:${orgContext}`;
  }

  // Obtener del cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Verificar TTL
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Incrementar hits y retornar data
    entry.hits++;
    this.stats.hits++;
    return entry.data;
  }

  // Guardar en cache
  set<T>(key: string, data: T, ttlMs = 300000): void {
    // 5 minutos por defecto
    // Si el cache está lleno, eliminar entrada más antigua
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      hits: 0,
    });
  }

  // Invalidar cache por patrón
  invalidatePattern(pattern: string): number {
    let removed = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  // Limpiar cache expirado
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  // Eliminar entrada menos usada
  private evictLeastRecentlyUsed(): void {
    let lruKey = "";
    let lruHits = Number.POSITIVE_INFINITY;
    let oldestTime = Number.POSITIVE_INFINITY;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < lruHits || (entry.hits === lruHits && entry.timestamp < oldestTime)) {
        lruKey = key;
        lruHits = entry.hits;
        oldestTime = entry.timestamp;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  // Obtener estadísticas
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
        : "0";

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  // Limpiar todo el cache
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }
}

// Singleton instance
export const responseCache = new ResponseCache();

// Helper para configurar TTL según el tipo de data
export const CACHE_TTL = {
  STATIC_DATA: 30 * 60 * 1000, // 30 minutos
  USER_DATA: 5 * 60 * 1000, // 5 minutos
  DYNAMIC_DATA: 1 * 60 * 1000, // 1 minuto
  REAL_TIME: 10 * 1000, // 10 segundos
} as const;

// Auto cleanup cada 5 minutos
if (typeof globalThis !== "undefined") {
  setInterval(
    () => {
      const removed = responseCache.cleanup();
      if (removed > 0 && process.env.NODE_ENV === "development") {
        console.log(`🧹 Cache cleanup: removed ${removed} expired entries`);
      }
    },
    5 * 60 * 1000,
  );
}
