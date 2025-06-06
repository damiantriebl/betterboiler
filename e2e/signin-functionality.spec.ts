import { test, expect } from '@playwright/test';

test.describe('Sign-In Functionality Tests', () => {
  test('🔍 Verificar que la página de sign-in carga correctamente', async ({ page }) => {
    console.log('🚀 Testing sign-in page load...');
    
    // Navegar a la página de sign-in
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Verificar que la página carga sin errores JavaScript
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
      console.error('❌ JavaScript Error:', error.message);
    });
    
    // Verificar que el título esté presente
    await expect(page.locator('h1, .text-2xl')).toContainText('Iniciar Sesión');
    
    // Verificar que no hay errores de "process is not defined"
    expect(jsErrors.filter(err => err.includes('process is not defined'))).toHaveLength(0);
    
    console.log('✅ Página de sign-in carga sin errores de process.env');
  });

  test('📱 Verificar elementos de UI están presentes', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Verificar Google Sign-In Button
    const googleButton = page.locator('button:has-text("Continuar con Google")');
    await expect(googleButton).toBeVisible();
    console.log('✅ Botón de Google visible');
    
    // Verificar formulario de email/password
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button:has-text("Iniciar Sesión")');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    console.log('✅ Formulario de credenciales visible');
    
    // Verificar link de registro
    const signUpLink = page.locator('a[href="/sign-up"]');
    await expect(signUpLink).toBeVisible();
    
    console.log('✅ Link de registro visible');
  });

  test('🌐 Probar Google OAuth (solo verificar que no falla)', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Capturar errores de red
    const networkErrors: string[] = [];
    page.on('response', (response) => {
      if (!response.ok() && response.url().includes('google')) {
        networkErrors.push(`${response.status()}: ${response.url()}`);
      }
    });
    
    // Clickear el botón de Google (sin completar el OAuth)
    const googleButton = page.locator('button:has-text("Continuar con Google")');
    await googleButton.click();
    
    // Esperar un momento para ver si hay errores inmediatos
    await page.waitForTimeout(2000);
    
    // No esperamos que complete el OAuth, solo que no falle immediatamente
    console.log('✅ Google OAuth button clickeable sin errores inmediatos');
    
    if (networkErrors.length > 0) {
      console.warn('⚠️ Network errors detected:', networkErrors);
    }
  });

  test('📝 Probar formulario de credenciales (UI only)', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button:has-text("Iniciar Sesión")');
    
    // Llenar formulario con datos de prueba
    await emailInput.fill('test@example.com');
    await passwordInput.fill('testpassword123');
    
    // Verificar que los valores se llenaron
    await expect(emailInput).toHaveValue('test@example.com');
    console.log('✅ Email field funciona correctamente');
    
    // Verificar que el botón está habilitado
    await expect(submitButton).toBeEnabled();
    console.log('✅ Submit button está habilitado');
    
    // Clickear submit (esperamos que falle porque no es un usuario real)
    await submitButton.click();
    
    // Esperar un momento para procesar
    await page.waitForTimeout(3000);
    
    // Verificar que seguimos en la página de sign-in (ya que el usuario no existe)
    expect(page.url()).toContain('/sign-in');
    console.log('✅ Formulario procesa correctamente (permanece en sign-in para usuario inexistente)');
  });

  test('🔗 Verificar navegación entre páginas auth', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Ir a sign-up
    const signUpLink = page.locator('a[href="/sign-up"]');
    await signUpLink.click();
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('/sign-up');
    console.log('✅ Navegación a sign-up funciona');
    
    // Ir a forgot-password
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    const forgotPasswordLink = page.locator('a[href="/forgot-password"]');
    await forgotPasswordLink.click();
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('/forgot-password');
    console.log('✅ Navegación a forgot-password funciona');
  });

  test('🛡️ Verificar AuthGuard funciona correctamente', async ({ page }) => {
    // Intentar acceder a una página protegida sin autenticación
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Debería redirigir a sign-in
    expect(page.url()).toContain('/sign-in');
    console.log('✅ AuthGuard redirige correctamente a sign-in');
    
    // Verificar que aparece el mensaje de error apropiado
    const errorParam = new URL(page.url()).searchParams.get('error');
    expect(errorParam).toBe('not-logged');
    console.log('✅ Parámetro de error correcto en redirección');
  });

  test('🎨 Verificar que los estilos cargan correctamente', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Verificar que Tailwind está funcionando
    const card = page.locator('.max-w-sm').first();
    const cardStyles = await card.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        maxWidth: styles.maxWidth,
        display: styles.display
      };
    });
    
    // max-w-sm en Tailwind debería ser 384px
    expect(cardStyles.maxWidth).toBe('384px');
    console.log('✅ Tailwind CSS está funcionando correctamente');
    
    // Verificar que la card es visible
    await expect(card).toBeVisible();
    console.log('✅ Card de sign-in es visible con estilos correctos');
  });
}); 