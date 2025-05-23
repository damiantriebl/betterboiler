import { test, expect } from '@playwright/test';
import { setupAuthenticatedUser } from './helpers/auth-helper';

test.describe('Debug Sales Page', () => {
  test('🔍 Debug: Investigar qué pasa en /sales', async ({ page }) => {
    console.log('🕵️ Iniciando debug de la página sales...');
    
    // Configurar manejo de errores
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console error: ${msg.text()}`);
      }
    });
    
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`❌ Failed request: ${response.status()} ${response.url()}`);
      }
    });
    
    // Setup de autenticación
    await setupAuthenticatedUser(page);
    
    console.log('🚀 Intentando ir a /sales...');
    
    // Ir a la página de sales con timeout más largo
    try {
      await page.goto('/sales', { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('✅ página cargada exitosamente');
      
      // Verificar qué hay en la página
      const title = await page.title();
      console.log(`📄 Título de la página: ${title}`);
      
      const url = page.url();
      console.log(`📍 URL actual: ${url}`);
      
      // Verificar si hay elementos visibles
      const elements = await page.evaluate(() => {
        return {
          h1: document.querySelector('h1')?.textContent || 'No h1 found',
          table: !!document.querySelector('table'),
          body: document.body.innerHTML.substring(0, 500) + '...'
        };
      });
      
      console.log('📊 Elementos encontrados:', elements);
      
    } catch (error) {
      console.log(`❌ Error al cargar /sales: ${error}`);
      
      // Verificar si estamos siendo redirigidos
      const currentUrl = page.url();
      console.log(`📍 URL actual después del error: ${currentUrl}`);
      
      throw error;
    }
  });
  
  test('🔍 Debug: Verificar si /sales redirije', async ({ page }) => {
    console.log('🔄 Verificando redirecciones...');
    
    await setupAuthenticatedUser(page);
    
    // Intentar cargar sin esperar load
    await page.goto('/sales', { waitUntil: 'networkidle', timeout: 30000 });
    
    const finalUrl = page.url();
    console.log(`📍 URL final: ${finalUrl}`);
    
    if (finalUrl.includes('/sign-in')) {
      console.log('❌ Redirigido a sign-in - problema de autenticación');
    } else if (finalUrl.includes('/sales')) {
      console.log('✅ Estamos en sales - posible problema de carga de contenido');
    } else {
      console.log(`⚠️ Redirigido a: ${finalUrl}`);
    }
  });
}); 