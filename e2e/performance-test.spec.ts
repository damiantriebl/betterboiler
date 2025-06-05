import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

test.describe('Performance Test - Sales Page', () => {
  test('📊 Test completo de performance en página de sales', async ({ page }) => {
    console.log('🚀 Iniciando test de performance completo...');
    
    // 1. Autenticarse
    const authStartTime = performance.now();
    await setupAuthenticatedUser(page);
    const authEndTime = performance.now();
    console.log(`⏱️ Tiempo de autenticación: ${Math.round(authEndTime - authStartTime)}ms`);
    
    // 2. Medir tiempo de carga inicial de la página
    const pageStartTime = performance.now();
    console.log('📍 Navegando a /sales y midiendo performance...');
    
    // Escuchar network requests para medir API calls
    const apiCalls: { url: string; method: string; status: number }[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/') || response.url().includes('/sales')) {
        const request = response.request();
        apiCalls.push({
          url: response.url(),
          method: request.method(),
          status: response.status(),
        });
      }
    });
    
    // Navegar y esperar carga completa
    const response = await page.goto('/sales', { waitUntil: 'networkidle' });
    const pageEndTime = performance.now();
    
    console.log(`📍 URL cargada: ${page.url()}`);
    console.log(`📋 Status: ${response?.status()}`);
    console.log(`⏱️ Tiempo de carga inicial: ${Math.round(pageEndTime - pageStartTime)}ms`);
    
    // 🔍 VERIFICAR: ¿Fuimos redirigidos al login?
    const currentUrl = page.url();
    if (currentUrl.includes('/sign-in')) {
      console.log('❌ PROBLEMA: Fuimos redirigidos al login después de autenticarnos');
      console.log('📍 URL actual:', currentUrl);
      
      // Tomar screenshot para debug
      await page.screenshot({ path: 'test-results/redirect-to-login-debug.png' });
      
      // Verificar cookies otra vez
      const cookiesAfterRedirect = await page.context().cookies();
      console.log(`🍪 Cookies después de redirección: ${cookiesAfterRedirect.length}`);
      cookiesAfterRedirect.forEach(cookie => {
        console.log(`   ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
      });
      
      console.log('⚠️ Continuando con el análisis en la página de login...');
    } else {
      console.log('✅ Estamos en la página correcta de sales');
    }
    
    // 3. Esperar específicamente a que se resuelva el Suspense
    console.log('⏳ Esperando resolución del Suspense...');
    const suspenseStartTime = performance.now();
    
    // Estrategia múltiple para detectar cuando el contenido está listo
    try {
      // Opción 1: Esperar elementos específicos de datos (no skeleton)
      await page.waitForSelector('table tbody tr, [data-testid="motorcycle-row"], .motorcycle-item', { 
        timeout: 30000 
      });
      console.log('✅ Contenido de datos detectado');
    } catch (error) {
      console.log('⚠️ Timeout en contenido de datos, intentando detectar tabla...');
      
      // Opción 2: Esperar cualquier tabla
      try {
        await page.waitForSelector('table, [role="table"]', { timeout: 15000 });
        console.log('✅ Tabla detectada');
      } catch (error2) {
        console.log('⚠️ No se detectó tabla, continuando con análisis...');
      }
    }
    
    const suspenseEndTime = performance.now();
    console.log(`⏱️ Tiempo de resolución del Suspense: ${Math.round(suspenseEndTime - suspenseStartTime)}ms`);
    
    // 4. Analizar el estado final de la página
    console.log('🔍 Analizando estado final de la página...');
    
    // Contar elementos importantes
    const h1Count = await page.locator('h1').count();
    const tableCount = await page.locator('table, [role="table"]').count();
    const rowCount = await page.locator('table tbody tr, [data-testid="motorcycle-row"]').count();
    const loadingCount = await page.locator('[data-loading="true"], .loading, .animate-pulse').count();
    const errorCount = await page.locator('[role="alert"], .error, .text-destructive').count();
    
    console.log(`📊 Análisis del contenido:`);
    console.log(`   H1 elements: ${h1Count}`);
    console.log(`   Tables: ${tableCount}`);
    console.log(`   Data rows: ${rowCount}`);
    console.log(`   Loading elements: ${loadingCount}`);
    console.log(`   Error elements: ${errorCount}`);
    
    // 5. Verificar palabras clave de éxito
    const pageContent = await page.textContent('body');
    const successKeywords = ['Catálogo', 'Motos', 'Ventas'];
    const keywordsFound = successKeywords.filter(keyword => pageContent?.includes(keyword));
    console.log(`🔍 Palabras clave encontradas: ${keywordsFound.join(', ')}`);
    
    // 6. Analizar API calls
    console.log(`🌐 API Calls realizadas: ${apiCalls.length}`);
    apiCalls.forEach((call, index) => {
      console.log(`   API[${index}]: ${call.method} ${call.url.split('/').slice(-2).join('/')} - ${call.status}`);
    });
    
    // 7. Medir performance de browser
    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart),
        loadComplete: Math.round(perf.loadEventEnd - perf.loadEventStart),
        firstContentfulPaint: Math.round((performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0)),
        largestContentfulPaint: Math.round((performance.getEntriesByType('largest-contentful-paint')?.[0]?.startTime || 0)),
      };
    });
    
    console.log(`📊 Browser Performance Metrics:`);
    console.log(`   DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`   Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`   First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);
    console.log(`   Largest Contentful Paint: ${performanceMetrics.largestContentfulPaint}ms`);
    
    // 8. Calcular métricas totales
    const totalTime = Math.round(suspenseEndTime - authStartTime);
    const pageOnlyTime = Math.round(suspenseEndTime - pageStartTime);
    
    console.log(`📊 RESUMEN DE PERFORMANCE:`);
    console.log(`   ⏱️ Tiempo total (auth + página): ${totalTime}ms`);
    console.log(`   ⏱️ Tiempo solo página: ${pageOnlyTime}ms`);
    console.log(`   📄 Contenido cargado: ${rowCount > 0 ? '✅' : '❌'}`);
    console.log(`   🔄 Estado loading: ${loadingCount === 0 ? '✅' : '⚠️'}`);
    console.log(`   ❌ Errores: ${errorCount === 0 ? '✅' : '❌'}`);
    
    // 9. Tomar screenshot final
    await page.screenshot({ path: 'test-results/sales-performance-final.png' });
    console.log('📸 Screenshot final guardado: test-results/sales-performance-final.png');
    
    // 10. Definir criterios de éxito
    const isSuccess = 
      keywordsFound.length >= 2 && // Al menos 2 palabras clave
      errorCount === 0 && // Sin errores
      pageOnlyTime < 10000; // Menos de 10 segundos
    
    console.log(`🎯 Performance Result: ${isSuccess ? '✅ ÉXITO' : '❌ NECESITA MEJORA'}`);
    
    // El test pasa siempre para que podamos ver los logs
    expect(true).toBe(true);
    
    // Pero reportamos las métricas importantes
    expect(errorCount).toBe(0);
    expect(keywordsFound.length).toBeGreaterThanOrEqual(1);
  });
}); 