import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

test.describe('Inspeccionar Página de Sales', () => {
  test('🔍 Inspeccionar contenido de la página de sales', async ({ page }) => {
    console.log('🚀 Inspeccionando página de sales...');
    
    // 1. Autenticarse
    await setupAuthenticatedUser(page);
    
    // 1.5. Verificar cookies después del login
    console.log('🍪 Verificando cookies después del login...');
    const cookies = await page.context().cookies();
    console.log(`🍪 Total de cookies: ${cookies.length}`);
    cookies.forEach((cookie, index) => {
      console.log(`   Cookie[${index}]: ${cookie.name} = ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
    });
    
    // 1.6. Verificar headers de la sesión
    console.log('📋 Verificando endpoint de sesión...');
    try {
      const sessionResponse = await page.request.get('/api/auth/get-session');
      console.log(`📋 Status de /api/auth/get-session: ${sessionResponse.status()}`);
      if (sessionResponse.ok()) {
        const sessionData = await sessionResponse.json();
        console.log('📋 Datos de sesión:', JSON.stringify(sessionData, null, 2));
      } else {
        console.log('❌ Error en /api/auth/get-session:', await sessionResponse.text());
      }
    } catch (error) {
      console.log('❌ Error llamando a /api/auth/get-session:', error);
    }
    
    // 2. Ir a sales y verificar headers del middleware
    console.log('📍 Navegando a /sales...');
    const response = await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    console.log(`📋 Status de respuesta: ${response?.status()}`);
    
    // Verificar headers del middleware
    const sessionHeader = response?.headers()['x-session'];
    console.log(`🔐 Header x-session del middleware: ${sessionHeader}`);
    
    // 3. Tomar screenshot
    await page.screenshot({ path: 'test-results/sales-page-current-state.png' });
    console.log('📸 Screenshot tomado: test-results/sales-page-current-state.png');
    
    // 4. Obtener el título de la página
    const pageTitle = await page.title();
    console.log(`📄 Título de la página: "${pageTitle}"`);
    
    // 5. Buscar todos los h1 en la página
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    console.log(`📝 Elementos H1 encontrados: ${h1Count}`);
    
    if (h1Count > 0) {
      for (let i = 0; i < h1Count; i++) {
        const h1Text = await h1Elements.nth(i).textContent();
        console.log(`   H1[${i}]: "${h1Text}"`);
      }
    }
    
    // 6. Buscar todos los elementos con data-testid
    const testIds = page.locator('[data-testid]');
    const testIdCount = await testIds.count();
    console.log(`🏷️ Elementos con data-testid encontrados: ${testIdCount}`);
    
    if (testIdCount > 0) {
      for (let i = 0; i < Math.min(testIdCount, 10); i++) {
        const testId = await testIds.nth(i).getAttribute('data-testid');
        console.log(`   data-testid[${i}]: "${testId}"`);
      }
    }
    
    // 7. Buscar elementos comunes de tabla/contenido
    const tableElements = page.locator('table, .table, [role="table"]');
    const tableCount = await tableElements.count();
    console.log(`📊 Elementos de tabla encontrados: ${tableCount}`);
    
    // 8. Buscar divs con clases comunes
    const contentDivs = page.locator('.space-y-4, .p-4, .container, .max-w, .grid');
    const contentCount = await contentDivs.count();
    console.log(`📦 Divs de contenido encontrados: ${contentCount}`);
    
    // 9. Verificar si hay mensajes de error o carga
    const errorMessages = page.locator('[role="alert"], .error, .text-red, .text-destructive');
    const errorCount = await errorMessages.count();
    console.log(`⚠️ Mensajes de error encontrados: ${errorCount}`);
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent();
        console.log(`   Error[${i}]: "${errorText}"`);
      }
    }
    
    // 10. Verificar si hay elementos de carga
    const loadingElements = page.locator('[aria-label*="loading"], .loading, .spinner');
    const loadingCount = await loadingElements.count();
    console.log(`⏳ Elementos de carga encontrados: ${loadingCount}`);
    
    // 11. Esperar más tiempo para que React se hidrate completamente
    console.log('⏳ Esperando hidratación de React...');
    await page.waitForTimeout(3000);
    
    // Verificar nuevamente después de esperar
    const h1ElementsAfter = page.locator('h1');
    const h1CountAfter = await h1ElementsAfter.count();
    console.log(`📝 Elementos H1 después de esperar: ${h1CountAfter}`);
    
    if (h1CountAfter > 0) {
      for (let i = 0; i < h1CountAfter; i++) {
        const h1Text = await h1ElementsAfter.nth(i).textContent();
        console.log(`   H1[${i}]: "${h1Text}"`);
      }
    }
    
    // 12. Buscar palabras clave específicas en el contenido
    const pageContent = await page.textContent('body');
    const keywords = ['Catálogo', 'Motos', 'Ventas', 'Sales', 'Motorcycle', 'Error', 'Loading', 'Cargando'];
    
    console.log('🔍 Búsqueda de palabras clave:');
    keywords.forEach(keyword => {
      const found = pageContent?.includes(keyword);
      console.log(`   "${keyword}": ${found ? '✅ Encontrada' : '❌ No encontrada'}`);
    });
    
    // El test siempre pasa para poder ver todos los logs
    expect(true).toBe(true);
  });
}); 