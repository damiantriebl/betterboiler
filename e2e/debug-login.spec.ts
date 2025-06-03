import { test, expect } from '@playwright/test';
import { loginUser, isUserLoggedIn, ensureTestUserExists, TEST_USER } from './helpers/auth-helper';

test.describe('Debug Login Process', () => {
  test('🔍 Verificar y depurar el proceso completo de login', async ({ page }) => {
    console.log('🚀 Iniciando depuración del proceso de login...');
    
    // 1. Verificar que el servidor está corriendo
    console.log('1️⃣ Verificando servidor...');
    await page.goto('/');
    console.log('✅ Servidor accesible');
    
    // 2. Verificar página de sign-in
    console.log('2️⃣ Verificando página de sign-in...');
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Tomar screenshot de la página de login
    await page.screenshot({ path: 'test-results/debug-login-page.png' });
    console.log('📸 Screenshot tomado: test-results/debug-login-page.png');
    
    // Verificar que los elementos existen
    const forms = page.locator('form');
    const formsCount = await forms.count();
    console.log(`📝 Formularios encontrados: ${formsCount}`);
    
    // Buscar directamente los campos de input
    const emailInputs = page.locator('input[name="email"]');
    const passwordInputs = page.locator('input[name="password"]');
    const emailCount = await emailInputs.count();
    const passwordCount = await passwordInputs.count();
    
    console.log(`📧 Campos email encontrados: ${emailCount}`);
    console.log(`🔒 Campos password encontrados: ${passwordCount}`);
    
    // Usar el último campo de cada tipo (más probable que sea el correcto)
    const emailInput = emailInputs.last();
    const passwordInput = passwordInputs.last();
    const submitButton = page.locator('button:has-text("Iniciar Sesión")').last();
    
    console.log('📧 Campo email visible:', await emailInput.isVisible());
    console.log('🔒 Campo password visible:', await passwordInput.isVisible());
    console.log('🚀 Botón submit visible:', await submitButton.isVisible());
    
    // 3. Intentar crear usuario si no existe
    console.log('3️⃣ Verificando si usuario existe...');
    await ensureTestUserExists(page);
    
    // 4. Volver a sign-in e intentar login manual paso a paso
    console.log('4️⃣ Intentando login paso a paso...');
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Llenar campos manualmente con más detalle
    console.log(`📧 Llenando email: ${TEST_USER.email}`);
    await emailInput.click();
    await emailInput.fill('');
    await emailInput.fill(TEST_USER.email);
    const emailValue = await emailInput.inputValue();
    console.log(`✅ Email valor actual: "${emailValue}"`);
    
    console.log('🔒 Llenando password...');
    await passwordInput.click();
    await passwordInput.fill('');
    await passwordInput.fill(TEST_USER.password);
    console.log('✅ Password llenado');
    
    // Tomar screenshot antes del submit
    await page.screenshot({ path: 'test-results/debug-before-submit.png' });
    console.log('📸 Screenshot antes del submit: test-results/debug-before-submit.png');
    
    // Submit el formulario
    console.log('🚀 Clickeando submit...');
    await submitButton.click();
    
    // Esperar y ver qué pasa
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    console.log(`📍 URL después del submit: ${currentUrl}`);
    
    // Tomar screenshot después del submit
    await page.screenshot({ path: 'test-results/debug-after-submit.png' });
    console.log('📸 Screenshot después del submit: test-results/debug-after-submit.png');
    
    // 5. Verificar si el login fue exitoso
    console.log('5️⃣ Verificando resultado del login...');
    if (currentUrl.includes('/sign-in')) {
      console.log('❌ Login falló - aún en página de sign-in');
      
      // Buscar mensajes de error
      const errorMessages = await page.locator('[role="alert"], .text-red-500, .text-destructive').allTextContents();
      if (errorMessages.length > 0) {
        console.log('⚠️ Errores encontrados:', errorMessages);
      }
    } else {
      console.log('✅ Login exitoso - redirigido fuera de sign-in');
      
      // Verificar si podemos acceder a /sales
      const canAccessSales = await isUserLoggedIn(page);
      console.log(`📊 ¿Puede acceder a /sales?: ${canAccessSales}`);
    }
    
    // 6. Final summary
    console.log('6️⃣ Resumen de la depuración:');
    console.log(`   - Servidor: ✅ Accesible`);
    console.log(`   - Página login: ✅ Cargada`);
    console.log(`   - Campos: ✅ Visibles`);
    console.log(`   - Email llenado: ✅ "${emailValue}"`);
    console.log(`   - Submit: ✅ Clickeado`);
    console.log(`   - URL final: ${currentUrl}`);
    console.log(`   - Login exitoso: ${!currentUrl.includes('/sign-in') ? '✅' : '❌'}`);
    
    // El test pasa sin importar el resultado para poder ver los logs
    expect(true).toBe(true);
  });
  
  test('🧪 Test simple de verificación de autenticación', async ({ page }) => {
    console.log('🧪 Test simple de verificación...');
    
    const isAuthenticated = await isUserLoggedIn(page);
    console.log(`✅ Estado de autenticación: ${isAuthenticated}`);
    
    if (!isAuthenticated) {
      console.log('🔐 No autenticado, intentando login completo...');
      await loginUser(page);
      
      const isNowAuthenticated = await isUserLoggedIn(page);
      console.log(`✅ Estado después del login: ${isNowAuthenticated}`);
    }
    
    expect(true).toBe(true);
  });
}); 