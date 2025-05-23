import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

test.describe('Production vs Development Performance', () => {
  
  test('🚀 Comparar Development vs Production Performance', async ({ page }) => {
    console.log('🚀 Comparando Development vs Production...');
    
    await setupAuthenticatedUser(page);
    
    // 📊 MÚLTIPLES MEDICIONES PARA PROMEDIO
    const measurements: number[] = [];
    const numMeasurements = 3;
    
    console.log(`📊 Realizando ${numMeasurements} mediciones...`);
    
    for (let i = 1; i <= numMeasurements; i++) {
      console.log(`🔄 Medición ${i}/${numMeasurements}...`);
      
      const start = Date.now();
      
      if (i === 1) {
        await page.goto('/sales', { waitUntil: 'domcontentloaded' });
      } else {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      
      await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 15000 });
      const time = Date.now() - start;
      measurements.push(time);
      
      console.log(`⏱️ Medición ${i}: ${time}ms`);
      
      // Pequeña pausa para estabilizar
      await page.waitForTimeout(1000);
    }
    
    const avgTime = measurements.reduce((sum, t) => sum + t, 0) / measurements.length;
    const minTime = Math.min(...measurements);
    const maxTime = Math.max(...measurements);
    const variability = ((maxTime - minTime) / avgTime) * 100;
    
    console.log('\n📊 RESULTADOS FINALES:');
    console.log(`⏱️ Tiempo promedio: ${avgTime.toFixed(1)}ms`);
    console.log(`🏆 Mejor tiempo: ${minTime}ms`);
    console.log(`😴 Peor tiempo: ${maxTime}ms`);
    console.log(`📈 Variabilidad: ${variability.toFixed(1)}%`);
    
    // Verificar data integrity
    const rows = await page.locator('tbody tr').count();
    console.log(`📋 Filas cargadas: ${rows}`);
    
    // Determinar modo basado en tiempo (heurística)
    if (avgTime < 800) {
      console.log('🚀 PROBABLEMENTE MODO PRODUCCIÓN - Excelente performance');
    } else if (avgTime < 1500) {
      console.log('⚡ MODO INTERMEDIO - Buena performance');
    } else {
      console.log('🐌 PROBABLEMENTE MODO DESARROLLO - Performance más lenta');
    }
    
    // Comparación con baseline original de 1527ms
    const improvementVsOriginal = ((1527 - avgTime) / 1527) * 100;
    if (improvementVsOriginal > 0) {
      console.log(`🎉 MEJORA vs Original: ${improvementVsOriginal.toFixed(1)}% (${(1527 - avgTime).toFixed(1)}ms más rápido)`);
    } else {
      console.log(`⚠️ Más lento que original: ${Math.abs(improvementVsOriginal).toFixed(1)}% (${Math.abs(1527 - avgTime).toFixed(1)}ms más lento)`);
    }
    
    expect(rows).toBeGreaterThan(0);
    expect(avgTime).toBeGreaterThan(0);
    expect(measurements.length).toBe(numMeasurements);
  });

  test('🔍 Análisis detallado de recursos y red', async ({ page }) => {
    console.log('🔍 Analizando recursos y red...');
    
    const metrics = {
      requests: [] as string[],
      jsFiles: [] as string[],
      cssFiles: [] as string[],
      totalBytes: 0,
      largeFiles: [] as { url: string; size: number }[]
    };
    
    // Capturar todas las requests
    page.on('response', async (response) => {
      try {
        const url = response.url();
        const size = parseInt(response.headers()['content-length'] || '0');
        metrics.totalBytes += size;
        metrics.requests.push(url);
        
        if (url.includes('.js')) {
          metrics.jsFiles.push(url);
        }
        if (url.includes('.css')) {
          metrics.cssFiles.push(url);
        }
        
        // Archivos grandes (>100KB)
        if (size > 100000) {
          metrics.largeFiles.push({ url: url.split('/').pop() || url, size });
        }
      } catch (e) {
        // Ignorar errores
      }
    });
    
    await setupAuthenticatedUser(page);
    
    const start = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1:has-text("Catálogo de Motos")', { timeout: 15000 });
    const loadTime = Date.now() - start;
    
    console.log('\n🔍 ANÁLISIS DE RECURSOS:');
    console.log(`⏱️ Tiempo de carga: ${loadTime}ms`);
    console.log(`🌐 Total requests: ${metrics.requests.length}`);
    console.log(`📦 Archivos JS: ${metrics.jsFiles.length}`);
    console.log(`🎨 Archivos CSS: ${metrics.cssFiles.length}`);
    console.log(`💾 Datos transferidos: ${(metrics.totalBytes / 1024).toFixed(1)} KB`);
    
    if (metrics.largeFiles.length > 0) {
      console.log(`📁 Archivos grandes (>100KB):`);
      metrics.largeFiles.forEach(file => {
        console.log(`  - ${file.url}: ${(file.size / 1024).toFixed(1)} KB`);
      });
    }
    
    // Heurística para determinar modo
    const hasSourceMaps = metrics.requests.some(url => url.includes('.map'));
    const hasHMR = metrics.requests.some(url => url.includes('_next/webpack-hmr'));
    const avgRequestSize = metrics.totalBytes / metrics.requests.length;
    
    console.log('\n🕵️ INDICADORES DE MODO:');
    console.log(`📍 Source maps detectados: ${hasSourceMaps ? 'SÍ (Development)' : 'NO (Production?)'}`);
    console.log(`🔥 HMR detectado: ${hasHMR ? 'SÍ (Development)' : 'NO (Production?)'}`);
    console.log(`📊 Tamaño promedio request: ${(avgRequestSize / 1024).toFixed(1)} KB`);
    
    if (hasSourceMaps || hasHMR) {
      console.log('🐌 MODO DESARROLLO CONFIRMADO');
    } else {
      console.log('🚀 POSIBLE MODO PRODUCCIÓN');
    }
    
    expect(loadTime).toBeGreaterThan(0);
    expect(metrics.requests.length).toBeGreaterThan(0);
  });
}); 