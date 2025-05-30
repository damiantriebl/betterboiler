import { type Page, expect } from '@playwright/test';

export const TEST_USER = {  email: 'damianplay@gmail.com',  password: '123456789'};

/**
 * Helper para hacer login en los tests
 */
export async function loginUser(page: Page): Promise<void> {
  console.log('🔐 Realizando login automático...');
  
  try {
    // Ir a la página de login
    await page.goto('/sign-in');
    
    // Esperar a que aparezcan los campos de login
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Llenar credenciales
    await page.fill('input[type="email"], input[name="email"]', TEST_USER.email);
    await page.fill('input[type="password"], input[name="password"]', TEST_USER.password);
    
    // Hacer click en el botón de login
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Iniciar"), button:has-text("Entrar")');
    
    // Esperar a que el login sea exitoso (redirect a dashboard o home)
    await page.waitForURL(url => !url.pathname.includes('/sign-in'), { timeout: 15000 });
    
    // Verificar que estamos autenticados
    await page.waitForSelector('h1, table, .space-y-4', { timeout: 10000 });
    
    console.log('✅ Login exitoso');
  } catch (error) {
    console.log('⚠️ Error en login automático:', error);
    // Continuar con el test, posiblemente ya estemos autenticados
  }
}

/**
 * Helper para verificar si el usuario está autenticado
 */
export async function isUserLoggedIn(page: Page): Promise<boolean> {
  try {
    // Intentar ir a una página protegida
    await page.goto('/sales');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Si no somos redirigidos al login, estamos autenticados
    const currentUrl = page.url();
    const isAuthenticated = !currentUrl.includes('/sign-in') && !currentUrl.includes('/login');
    
    if (isAuthenticated) {
      // Verificar que la página tiene contenido esperado (tabla o elementos de sales)
      const hasContent = await page.locator('h1, table, .p-4, .flex').first().isVisible({ timeout: 5000 });
      return hasContent;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Helper para setup de autenticación antes de cada test
 */
export async function setupAuthenticatedUser(page: Page): Promise<void> {
  console.log('🔍 Verificando estado de autenticación...');
  
  const isLoggedIn = await isUserLoggedIn(page);
  
  if (!isLoggedIn) {
    console.log('🔐 Usuario no autenticado, intentando login...');
    await loginUser(page);
    
    // Verificar nuevamente después del login
    const isNowLoggedIn = await isUserLoggedIn(page);
    if (!isNowLoggedIn) {
      console.log('⚠️ Login falló, continuando con el test (puede que necesites registrar el usuario primero)');
    }
  } else {
    console.log('✅ Usuario ya autenticado');
  }
  
  // Pequeña pausa para asegurar que la sesión esté completamente establecida
  await page.waitForTimeout(1000);
} 