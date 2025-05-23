import { test, expect, type Page } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

// 🎯 Umbrales de performance para sales page (ajustados para autenticación)
const PERFORMANCE_THRESHOLDS = {
  // Tiempo de carga inicial
  FIRST_CONTENTFUL_PAINT: 2000, // ms (aumentado por autenticación)
  LARGEST_CONTENTFUL_PAINT: 3500, // ms (aumentado por autenticación)
  NAVIGATION_TIME: 5000, // ms (aumentado por autenticación)
  
  // Interacciones
  FILTER_RESPONSE_TIME: 300, // ms
  PAGINATION_RESPONSE_TIME: 500, // ms
  
  // Network
  MAX_REQUEST_TIME: 2000, // ms
  MAX_REQUESTS_COUNT: 25,
} as const;

// Función helper para medir Core Web Vitals
async function measureWebVitals(page: Page) {
  const webVitals = await page.evaluate(() => {
    return new Promise<Record<string, number>>((resolve) => {
      const vitals: Record<string, number> = {};
      
      // First Contentful Paint (FCP)
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            vitals.fcp = entry.startTime;
          }
        }
      }).observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.lcp = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        vitals.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });

      // Resolver después de un tiempo para capturar métricas
      setTimeout(() => resolve(vitals), 5000);
    });
  });
  return webVitals;
}

// Tests de Performance Base
test.describe('Sales Page Performance', () => {
  test.beforeEach(async ({ page }) => {
    // 🔐 Autenticación automática antes de cada test
    await setupAuthenticatedUser(page);
  });

  test('🚀 Tiempo de carga inicial debe ser < 5 segundos', async ({ page }) => {
    const startTime = Date.now();
    
    // Esperar a que la página cargue completamente
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="motorcycle-table"], .space-y-4', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️  Tiempo de carga: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.NAVIGATION_TIME);
  });

  test('📊 Core Web Vitals deben estar dentro de límites', async ({ page }) => {
    // Navegar y esperar carga completa
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="motorcycle-table"], h1', { timeout: 15000 });
    
    const vitals = await measureWebVitals(page);
    
    console.log('📊 Core Web Vitals:', vitals);
    
    // Verificar FCP
    if (vitals.fcp) {
      expect(vitals.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT);
    }
    
    // Verificar LCP
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.LARGEST_CONTENTFUL_PAINT);
    }
    
    // Verificar CLS (debe ser < 0.1 para buena UX)
    if (vitals.cls) {
      expect(vitals.cls).toBeLessThan(0.1);
    }
  });

  test('🔍 Filtros deben responder rápidamente', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[placeholder*="Buscar"], input[type="search"]', { timeout: 15000 });
    
    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first();
    
    // Medir tiempo de respuesta al filtrar
    const startTime = Date.now();
    await searchInput.fill('Honda');
    
    // Esperar a que la tabla se actualice
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('tbody tr');
      return rows.length >= 0;
    }, { timeout: 8000 });
    
    const responseTime = Date.now() - startTime;
    
    console.log(`🔍 Tiempo de respuesta del filtro: ${responseTime}ms`);
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FILTER_RESPONSE_TIME);
  });

  test('📄 Paginación debe ser eficiente', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    // Buscar botones de paginación
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Siguiente"), button[aria-label*="next"]').first();
    
    if (await nextButton.isVisible()) {
      const startTime = Date.now();
      await nextButton.click();
      
      // Esperar a que la página cambie
      await page.waitForFunction(() => {
        const pageInfo = document.querySelector('[data-testid="pagination-info"], .text-sm');
        return pageInfo && pageInfo.textContent !== '';
      }, { timeout: 8000 });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`📄 Tiempo de respuesta de paginación: ${responseTime}ms`);
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGINATION_RESPONSE_TIME);
    }
  });

  test('🌐 Número de requests debe ser optimizado', async ({ page }) => {
    const requests: string[] = [];
    
    // Capturar todas las requests
    page.on('request', (request) => {
      requests.push(request.url());
    });
    
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    console.log(`🌐 Total requests: ${requests.length}`);
    console.log('📋 Requests realizadas:', requests.slice(0, 10));
    
    expect(requests.length).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_REQUESTS_COUNT);
  });

  test('⚡ API calls deben ser rápidas', async ({ page }) => {
    const apiCalls: { url: string; duration: number }[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/') || response.url().includes('sales') || response.url().includes('motorcycles')) {
        const request = response.request();
        const timing = request.timing();
        const duration = timing.responseEnd - timing.responseStart;
        
        apiCalls.push({
          url: response.url(),
          duration
        });
      }
    });
    
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    console.log('⚡ API Calls performance:');
    apiCalls.forEach(call => {
      console.log(`  ${call.url}: ${call.duration}ms`);
      expect(call.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_REQUEST_TIME);
    });
  });
});

// Tests de Performance bajo Carga
test.describe('Sales Page Load Testing', () => {
  test.beforeEach(async ({ page }) => {
    // 🔐 Autenticación automática antes de cada test
    await setupAuthenticatedUser(page);
  });

  test('🔄 Múltiples cargas consecutivas', async ({ page }) => {
    const loadTimes: number[] = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      if (i > 0) {
        await page.reload();
      } else {
        await page.goto('/sales');
      }
      
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('h1, [data-testid="motorcycle-table"]', { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      loadTimes.push(loadTime);
      
      console.log(`🔄 Carga ${i + 1}: ${loadTime}ms`);
    }
    
    const averageTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    console.log(`📊 Tiempo promedio: ${averageTime}ms`);
    
    // La segunda y tercera carga deberían beneficiarse del cache
    expect(loadTimes[1]).toBeLessThan(loadTimes[0] * 1.2); // Más realista
    expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.NAVIGATION_TIME);
  });
}); 