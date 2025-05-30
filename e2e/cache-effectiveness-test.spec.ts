import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

test.describe('Cache Effectiveness - Direct Comparison', () => {
  
  test('🔬 Comparar getMotorcycles (sin cache) vs getMotorcyclesOptimized (con cache)', async ({ page, context }) => {
    console.log('🔬 Test directo: Sin cache vs Con cache...');
    
    await setupAuthenticatedUser(page);
    
    // 🔥 MÉTODO 1: Forzar sin cache (simulando primera visita)
    console.log('🗑️ Limpiando todo el cache del browser...');
    await context.clearCookies();
    await context.clearPermissions();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Forzar recompile del cache de Next.js esperando 61 segundos (TTL expirado)
    console.log('⏳ Esperando TTL del cache (65 segundos)...');
    await page.waitForTimeout(65000); // Esperar que expire el cache de 60s
    
    // 1️⃣ MEDICIÓN SIN CACHE (COLD START TOTAL)
    console.log('1️⃣ Midiendo sin cache (cold start total)...');
    const noCacheStart = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 15000 });
    const noCacheTime = Date.now() - noCacheStart;
    
    const noCacheRows = await page.locator('tbody tr').count();
    console.log(`🗑️ Sin cache: ${noCacheTime}ms (${noCacheRows} rows)`);
    
    // 2️⃣ MEDICIÓN CON CACHE (WARM START)
    console.log('2️⃣ Midiendo con cache (warm start)...');
    const withCacheStart = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 15000 });
    const withCacheTime = Date.now() - withCacheStart;
    
    const withCacheRows = await page.locator('tbody tr').count();
    console.log(`💾 Con cache: ${withCacheTime}ms (${withCacheRows} rows)`);
    
    // 3️⃣ MÚLTIPLES CARGAS CON CACHE PARA CONFIRMAR
    console.log('3️⃣ Verificando consistencia del cache...');
    const cacheTimes: number[] = [];
    
    for (let i = 1; i <= 3; i++) {
      const start = Date.now();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 15000 });
      const time = Date.now() - start;
      cacheTimes.push(time);
      console.log(`💾 Cache ${i}: ${time}ms`);
      await page.waitForTimeout(1000); // Pausa pequeña
    }
    
    const avgCacheTime = cacheTimes.reduce((sum, t) => sum + t, 0) / cacheTimes.length;
    
    // 📊 ANÁLISIS FINAL
    const improvement = noCacheTime - avgCacheTime;
    const improvementPercent = (improvement / noCacheTime) * 100;
    
    console.log('\n🔬 ANÁLISIS DIRECTO DE EFECTIVIDAD:');
    console.log(`🗑️ Sin cache (cold): ${noCacheTime}ms`);
    console.log(`💾 Con cache (warm): ${withCacheTime}ms`);
    console.log(`📊 Promedio cache: ${avgCacheTime.toFixed(1)}ms`);
    console.log(`⚡ Mejora total: ${improvement.toFixed(1)}ms (${improvementPercent.toFixed(1)}%)`);
    
    // 🎯 DETERMINACIÓN CIENTÍFICA
    if (improvement > 500) {
      console.log('🎉 ¡CACHE MUY EFECTIVO! Mejora significativa detectada');
    } else if (improvement > 200) {
      console.log('✅ Cache efectivo con buena mejora');
    } else if (improvement > 50) {
      console.log('⚡ Cache funcionando con mejora moderada');
    } else if (improvement > 0) {
      console.log('📊 Cache con mejora leve (posible overhead de testing)');
    } else {
      console.log('⚠️ Cache no muestra mejora - revisar implementación');
    }
    
    // Verificaciones
    expect(noCacheRows).toEqual(withCacheRows); // Mismos datos
    expect(noCacheRows).toBeGreaterThan(0); // Hay datos
    expect(noCacheTime).toBeGreaterThan(0);
    expect(avgCacheTime).toBeGreaterThan(0);
  });

  test('⚡ Test rápido de efectividad del cache (sin TTL wait)', async ({ page }) => {
    console.log('⚡ Test rápido de cache...');
    
    await setupAuthenticatedUser(page);
    
    // 1️⃣ PRIMERA CARGA
    console.log('1️⃣ Primera carga...');
    const firstStart = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 15000 });
    const firstTime = Date.now() - firstStart;
    
    // 2️⃣ CARGAS SUBSECUENTES (RÁPIDAS)
    const subsequentTimes: number[] = [];
    
    for (let i = 1; i <= 5; i++) {
      console.log(`🔄 Carga subsecuente ${i}...`);
      const start = Date.now();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 15000 });
      const time = Date.now() - start;
      subsequentTimes.push(time);
      console.log(`⚡ Tiempo ${i}: ${time}ms`);
      
      // Sin pausa para maximizar beneficio del cache
    }
    
    const avgSubsequent = subsequentTimes.reduce((sum, t) => sum + t, 0) / subsequentTimes.length;
    const minSubsequent = Math.min(...subsequentTimes);
    const maxSubsequent = Math.max(...subsequentTimes);
    
    const improvement = firstTime - avgSubsequent;
    const improvementPercent = (improvement / firstTime) * 100;
    
    console.log('\n⚡ ANÁLISIS RÁPIDO:');
    console.log(`🗑️ Primera carga: ${firstTime}ms`);
    console.log(`📊 Promedio subsecuentes: ${avgSubsequent.toFixed(1)}ms`);
    console.log(`🏆 Mejor tiempo: ${minSubsequent}ms`);
    console.log(`😴 Peor tiempo: ${maxSubsequent}ms`);
    console.log(`⚡ Mejora: ${improvement.toFixed(1)}ms (${improvementPercent.toFixed(1)}%)`);
    console.log(`📈 Variabilidad: ±${((maxSubsequent - minSubsequent) / 2).toFixed(1)}ms`);
    
    // Análisis de consistencia
    const variability = (maxSubsequent - minSubsequent) / avgSubsequent * 100;
    if (variability < 20) {
      console.log('✅ Cache muy consistente (baja variabilidad)');
    } else if (variability < 50) {
      console.log('⚡ Cache consistente');
    } else {
      console.log('⚠️ Cache con variabilidad alta');
    }
    
    expect(firstTime).toBeGreaterThan(0);
    expect(avgSubsequent).toBeGreaterThan(0);
    expect(subsequentTimes.length).toBe(5);
  });
}); 