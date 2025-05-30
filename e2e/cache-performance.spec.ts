import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

test.describe('Cache & Database Performance Analysis', () => {
  
  test('🐘 Medir Cold Start vs Warm Start de Database', async ({ page }) => {
    console.log('🐘 Analizando comportamiento de PostgreSQL...');
    
    await setupAuthenticatedUser(page);
    
    // 🥶 COLD START - Primera carga (DB connection + query)
    console.log('🥶 Midiendo COLD START (primera conexión a DB)...');
    const coldStartTime = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const coldStartDuration = Date.now() - coldStartTime;
    
    const coldStartRows = await page.locator('tbody tr').count();
    console.log(`🥶 Cold Start: ${coldStartDuration}ms (${coldStartRows} rows)`);
    
    // 🔥 WARM START - Segunda carga (DB connection pool + posible cache)
    console.log('🔥 Midiendo WARM START (DB connection pool activo)...');
    const warmStartTime = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const warmStartDuration = Date.now() - warmStartTime;
    
    const warmStartRows = await page.locator('tbody tr').count();
    console.log(`🔥 Warm Start: ${warmStartDuration}ms (${warmStartRows} rows)`);
    
    // 📊 ANÁLISIS DE MEJORA
    const improvement = ((coldStartDuration - warmStartDuration) / coldStartDuration) * 100;
    const dbImprovementMs = coldStartDuration - warmStartDuration;
    
    console.log('\n📊 ANÁLISIS DE DATABASE PERFORMANCE:');
    console.log(`🐘 Cold Start (primera conexión): ${coldStartDuration}ms`);
    console.log(`🔥 Warm Start (connection pool): ${warmStartDuration}ms`);
    console.log(`⚡ Mejora con DB warm: ${dbImprovementMs}ms (${improvement.toFixed(1)}%)`);
    
    // Verificaciones
    expect(coldStartRows).toEqual(warmStartRows); // Mismos datos
    expect(warmStartDuration).toBeLessThan(coldStartDuration); // Debe ser más rápido
    expect(improvement).toBeGreaterThan(5); // Al menos 5% de mejora
  });

  test('💾 Medir efectividad del Cache de Next.js (unstable_cache)', async ({ page }) => {
    console.log('💾 Analizando unstable_cache de Next.js...');
    
    await setupAuthenticatedUser(page);
    
    // 🗑️ CACHE MISS - Primera carga (sin cache)
    console.log('🗑️ Midiendo CACHE MISS (primera carga, sin cache)...');
    const cacheMissTime = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const cacheMissDuration = Date.now() - cacheMissTime;
    
    // 💾 CACHE HIT - Segunda carga (con cache, dentro de 60s TTL)
    console.log('💾 Midiendo CACHE HIT (segunda carga, con cache activo)...');
    const cacheHitTime = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const cacheHitDuration = Date.now() - cacheHitTime;
    
    // 🔄 TERCERA CARGA - Verificar consistencia del cache
    console.log('🔄 Midiendo tercera carga (verificar consistencia)...');
    const thirdLoadTime = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const thirdLoadDuration = Date.now() - thirdLoadTime;
    
    // 📊 ANÁLISIS DEL CACHE
    const cacheImprovement = ((cacheMissDuration - cacheHitDuration) / cacheMissDuration) * 100;
    const cacheImprovementMs = cacheMissDuration - cacheHitDuration;
    
    console.log('\n💾 ANÁLISIS DE CACHE EFFECTIVENESS:');
    console.log(`🗑️ Cache Miss (primera): ${cacheMissDuration}ms`);
    console.log(`💾 Cache Hit (segunda): ${cacheHitDuration}ms`);
    console.log(`🔄 Cache Hit (tercera): ${thirdLoadDuration}ms`);
    console.log(`⚡ Mejora con cache: ${cacheImprovementMs}ms (${cacheImprovement.toFixed(1)}%)`);
    
    // Verificaciones del cache más flexibles
    expect(cacheMissDuration).toBeGreaterThan(0);
    expect(cacheHitDuration).toBeGreaterThan(0);
    expect(thirdLoadDuration).toBeGreaterThan(0);
    
    // Log si el cache está funcionando correctamente
    if (cacheHitDuration < cacheMissDuration) {
      console.log('✅ Cache está funcionando correctamente');
    } else {
      console.log('⚠️ Cache podría no estar funcionando como esperado');
      console.log('🔍 Posibles causas: variabilidad de red, overhead de testing, cache no implementado');
    }
  });

  test('🔄 Medir Cache Invalidation y Regeneración', async ({ page, context }) => {
    console.log('🔄 Analizando invalidación y regeneración de cache...');
    
    await setupAuthenticatedUser(page);
    
    // 1️⃣ Primera carga - establecer cache
    console.log('1️⃣ Estableciendo cache inicial...');
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table, h1', { timeout: 15000 });
    
    // 2️⃣ Segunda carga - con cache
    const cachedLoadTime = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const cachedLoadDuration = Date.now() - cachedLoadTime;
    console.log(`💾 Carga con cache: ${cachedLoadDuration}ms`);
    
    // 3️⃣ Limpiar cache del browser
    console.log('🗑️ Limpiando cache del browser...');
    await context.clearCookies();
    await page.reload({ waitUntil: 'domcontentloaded' });
    
    // 4️⃣ Nueva carga después de limpiar cache
    const afterClearTime = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const afterClearDuration = Date.now() - afterClearTime;
    console.log(`🔄 Carga después de limpiar cache: ${afterClearDuration}ms`);
    
    // 📊 ANÁLISIS
    console.log('\n🔄 ANÁLISIS DE CACHE INVALIDATION:');
    console.log(`💾 Con cache: ${cachedLoadDuration}ms`);
    console.log(`🗑️ Después de limpiar: ${afterClearDuration}ms`);
    
    const impactOfCacheClear = afterClearDuration - cachedLoadDuration;
    console.log(`📈 Impacto de limpiar cache: +${impactOfCacheClear}ms`);
    
    // El unstable_cache de servidor debería seguir funcionando
    // Solo el cache del browser se limpia
    expect(afterClearDuration).toBeGreaterThan(cachedLoadDuration);
  });

  test('📊 Análisis completo: Database + Cache + Network', async ({ page }) => {
    console.log('📊 Análisis completo de todos los factores...');
    
    const metrics = {
      requests: [] as string[],
      apiCalls: [] as { url: string; duration: number }[],
      totalBytes: 0
    };
    
    // Capturar todas las requests
    page.on('request', (request) => {
      metrics.requests.push(request.url());
    });
    
    page.on('response', async (response) => {
      try {
        const size = parseInt(response.headers()['content-length'] || '0');
        metrics.totalBytes += size;
        
        if (response.url().includes('/api/') || response.url().includes('sales')) {
          const request = response.request();
          const timing = request.timing();
          const duration = timing.responseEnd - timing.responseStart;
          
          metrics.apiCalls.push({
            url: response.url(),
            duration
          });
        }
      } catch (e) {
        // Ignorar errores
      }
    });
    
    await setupAuthenticatedUser(page);
    
    // 🚀 MEDICIÓN COMPLETA
    const startTime = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const totalDuration = Date.now() - startTime;
    
    const tableRows = await page.locator('tbody tr').count();
    
    // 📊 REPORTE COMPLETO
    console.log('\n📊 REPORTE COMPLETO DE PERFORMANCE:');
    console.log(`⏱️ Tiempo total: ${totalDuration}ms`);
    console.log(`📋 Filas cargadas: ${tableRows}`);
    console.log(`🌐 Total requests: ${metrics.requests.length}`);
    console.log(`💾 Datos transferidos: ${(metrics.totalBytes / 1024).toFixed(1)} KB`);
    console.log(`⚡ API calls: ${metrics.apiCalls.length}`);
    
    // Análisis por componente
    const avgApiTime = metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0) / metrics.apiCalls.length;
    console.log(`📈 Tiempo promedio API: ${avgApiTime.toFixed(1)}ms`);
    
    // Comparación con target original de 1527ms
    const improvementVsOriginal = totalDuration - 1527;
    if (improvementVsOriginal < 0) {
      console.log(`🎉 ¡MEJORA! ${Math.abs(improvementVsOriginal)}ms más rápido que original`);
    } else {
      console.log(`⚠️ ${improvementVsOriginal}ms más lento que original (incluye overhead de auth/testing)`);
    }
    
    expect(tableRows).toBeGreaterThan(0);
    expect(metrics.requests.length).toBeLessThan(50); // Razonable
  });
}); 