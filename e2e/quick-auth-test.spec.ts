import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

test.describe('Quick Auth Test', () => {
  test('🔍 Verificar que la autenticación funciona y se puede acceder a /sales', async ({ page }) => {
    console.log('🚀 Iniciando test rápido de autenticación...');
    
    // Setup de autenticación
    await setupAuthenticatedUser(page);
    
    // Ir a la página de sales con domcontentloaded para evitar problemas de recursos
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Verificar que estamos en la página correcta (no redirigidos a /sign-in)
    const currentUrl = page.url();
    console.log(`📍 URL actual: ${currentUrl}`);
    expect(currentUrl).toContain('/sales');
    expect(currentUrl).not.toContain('/sign-in');
    
    // Verificar que hay contenido en la página (tabla de motocicletas)
    await page.waitForSelector('table, h1', { timeout: 10000 });
    
    const hasTable = await page.locator('table').first().isVisible();
    const hasTitle = await page.locator('h1').first().isVisible();
    const title = await page.locator('h1').first().textContent();
    console.log(`📋 Tabla visible: ${hasTable}, Título visible: ${hasTitle}`);
    console.log(`📄 Título: "${title}"`);
    expect(hasTable || hasTitle).toBe(true);
    
    console.log('✅ Test de autenticación exitoso!');
  });
  
  test('⚡ Medir tiempo de carga básico de /sales', async ({ page }) => {
    console.log('⏱️ Midiendo tiempo de carga básico...');
    
    await setupAuthenticatedUser(page);
    
    const startTime = Date.now();
    await page.goto('/sales', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table, h1', { timeout: 15000 });
    const loadTime = Date.now() - startTime;
    
    console.log(`🚀 Tiempo de carga: ${loadTime}ms`);
    
    // Verificar que es mejor que el original de 1527ms
    if (loadTime < 1527) {
      console.log(`🎉 ¡MEJORA! ${1527 - loadTime}ms más rápido que el original`);
    } else {
      console.log(`⚠️ Tiempo actual: ${loadTime}ms vs ${1527}ms original`);
    }
    
    // Verificar también contenido cargado
    const tableRows = await page.locator('tbody tr').count();
    console.log(`📊 Número de filas en tabla: ${tableRows}`);
    
    // Expectativa flexible para este test rápido
    expect(loadTime).toBeLessThan(5000);
  });
}); 