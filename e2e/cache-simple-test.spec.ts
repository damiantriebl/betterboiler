import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

test.describe('Cache Simple Test', () => {
  
  test('⚡ Test simple de cache: Primera vs Segunda carga', async ({ page }) => {
    console.log('⚡ Test simple: Primera vs Segunda carga...');
    
    await setupAuthenticatedUser(page);
    
    // 1️⃣ PRIMERA CARGA (Cache Miss)
    console.log('1️⃣ Primera carga (Cache Miss)...');
    const start1 = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 10000 });
    const time1 = Date.now() - start1;
    
    const rows1 = await page.locator('tbody tr').count();
    console.log(`1️⃣ Primera: ${time1}ms (${rows1} rows)`);
    
    // 2️⃣ SEGUNDA CARGA (Cache Hit esperado)
    console.log('2️⃣ Segunda carga (Cache Hit esperado)...');
    const start2 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 10000 });
    const time2 = Date.now() - start2;
    
    const rows2 = await page.locator('tbody tr').count();
    console.log(`2️⃣ Segunda: ${time2}ms (${rows2} rows)`);
    
    // 3️⃣ TERCERA CARGA (Consistencia)
    console.log('3️⃣ Tercera carga (Consistencia)...');
    const start3 = Date.now();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 10000 });
    const time3 = Date.now() - start3;
    
    const rows3 = await page.locator('tbody tr').count();
    console.log(`3️⃣ Tercera: ${time3}ms (${rows3} rows)`);
    
    // 📊 ANÁLISIS
    const improvement = time1 - time2;
    const improvementPercent = ((improvement) / time1) * 100;
    
    console.log('\n📊 ANÁLISIS DEL CACHE:');
    console.log(`🗑️ Primera carga: ${time1}ms`);
    console.log(`💾 Segunda carga: ${time2}ms`);
    console.log(`🔄 Tercera carga: ${time3}ms`);
    console.log(`⚡ Mejora: ${improvement}ms (${improvementPercent.toFixed(1)}%)`);
    
    // 🧪 DETERMINACIÓN DEL ESTADO DEL CACHE
    if (time2 < time1 && improvement > 100) {
      console.log('✅ ¡CACHE FUNCIONANDO! Mejora significativa detectada');
    } else if (time2 < time1 && improvement > 0) {
      console.log('⚡ Cache funcionando con mejora leve');
    } else if (Math.abs(time2 - time1) < 200) {
      console.log('📊 Tiempos similares - Cache podría estar funcionando');
    } else {
      console.log('⚠️ Cache no muestra mejora clara');
    }
    
    // Verificaciones básicas
    expect(rows1).toEqual(rows2); // Mismos datos
    expect(rows2).toEqual(rows3); // Consistencia
    expect(rows1).toBeGreaterThan(0); // Hay datos
    expect(time1).toBeGreaterThan(0);
    expect(time2).toBeGreaterThan(0);
    expect(time3).toBeGreaterThan(0);
  });

  test('🔍 Test de desarrollo del cache en múltiples cargas', async ({ page }) => {
    console.log('🔍 Analizando comportamiento del cache en múltiples cargas...');
    
    await setupAuthenticatedUser(page);
    
    const times: number[] = [];
    const numLoads = 5;
    
    for (let i = 1; i <= numLoads; i++) {
      console.log(`🔄 Carga ${i}/${numLoads}...`);
      const start = Date.now();
      
      if (i === 1) {
        await page.goto('/sales', { waitUntil: 'domcontentloaded' });
      } else {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      
      await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 10000 });
      const time = Date.now() - start;
      times.push(time);
      
      console.log(`📊 Carga ${i}: ${time}ms`);
      
      // Pequeña pausa entre cargas
      await page.waitForTimeout(500);
    }
    
    // 📈 ANÁLISIS DE TENDENCIA
    console.log('\n📈 ANÁLISIS DE TENDENCIA:');
    console.log('Times:', times.map((t, i) => `${i + 1}: ${t}ms`).join(', '));
    
    const firstLoad = times[0];
    const avgSubsequent = times.slice(1).reduce((sum, t) => sum + t, 0) / (times.length - 1);
    const improvement = firstLoad - avgSubsequent;
    const improvementPercent = (improvement / firstLoad) * 100;
    
    console.log(`🗑️ Primera carga: ${firstLoad}ms`);
    console.log(`💾 Promedio subsecuentes: ${avgSubsequent.toFixed(1)}ms`);
    console.log(`⚡ Mejora promedio: ${improvement.toFixed(1)}ms (${improvementPercent.toFixed(1)}%)`);
    
    if (improvement > 200) {
      console.log('🎉 ¡CACHE MUY EFECTIVO!');
    } else if (improvement > 50) {
      console.log('✅ Cache funcionando bien');
    } else if (improvement > 0) {
      console.log('⚡ Cache con mejora leve');
    } else {
      console.log('⚠️ Cache no muestra mejora');
    }
    
    expect(times.length).toBe(numLoads);
    expect(firstLoad).toBeGreaterThan(0);
  });
}); 