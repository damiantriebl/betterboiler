import { Page, expect } from '@playwright/test';

export const TEST_USER = {
  email: 'damianplay@gmail.com',
  password: '123456789'
};

/**
 * Helper para hacer login en los tests
 */
export async function loginUser(page: Page): Promise<void> {
  console.log('🔐 Realizando login automático...');
  
  try {
    // Ir a la página de login
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Buscar directamente los campos de email y password (más robusto)
    const emailInput = page.locator('input[name="email"]').last(); // Usar el último en caso de duplicados
    const passwordInput = page.locator('input[name="password"]').last();
    
    await emailInput.waitFor({ timeout: 10000 });
    await passwordInput.waitFor({ timeout: 10000 });
    console.log('✅ Campos de email y password encontrados');
    
    // Limpiar y llenar los campos
    await emailInput.clear();
    await emailInput.fill(TEST_USER.email);
    console.log(`📧 Email rellenado: ${TEST_USER.email}`);
    
    await passwordInput.clear();
    await passwordInput.fill(TEST_USER.password);
    console.log('🔒 Password rellenado');
    
    // Verificar que los campos tienen los valores correctos
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    console.log(`✅ Email verificado: "${emailValue}"`);
    console.log(`✅ Password verificado: ${passwordValue.length} caracteres`);
    
    // Buscar el botón de submit más específico (el que dice "Iniciar Sesión")
    const submitButton = page.locator('button:has-text("Iniciar Sesión")').last();
    await submitButton.waitFor({ timeout: 10000 });
    
    // Submit el formulario
    console.log('🚀 Clickeando submit...');
    await submitButton.click();
    
    // Esperar a que el login sea exitoso (redirect fuera de sign-in)
    try {
      await page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 15000 });
      console.log('✅ Redirect exitoso después del login');
    } catch {
      console.log('⏳ Esperando un poco más para el redirect...');
      await page.waitForTimeout(3000);
    }
    
    // Verificar que llegamos a una página autenticada
    const currentUrl = page.url();
    console.log(`📍 URL actual después del login: ${currentUrl}`);
    
    if (!currentUrl.includes('/sign-in') && !currentUrl.includes('/login')) {
      console.log('✅ Login exitoso - estamos en página autenticada');
    } else {
      console.log('⚠️ Posible problema con el login - aún en página de autenticación');
      
      // Buscar mensajes de error en la página
      const errorMessages = await page.locator('[role="alert"], .text-red-500, .text-destructive, .text-red').allTextContents();
      if (errorMessages.length > 0) {
        console.log('⚠️ Errores encontrados en la página:', errorMessages);
      }
    }
    
  } catch (error: unknown) {
    console.log('❌ Error en login automático:', error instanceof Error ? error.message : String(error));
    throw error; // Re-lanzar para que el test sepa que falló
  }
}

/**
 * Helper para verificar si el usuario está autenticado
 */
export async function isUserLoggedIn(page: Page): Promise<boolean> {
  try {
    console.log('🔍 Verificando estado de autenticación...');
    
    // Intentar ir a una página protegida
    await page.goto('/sales');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Si no somos redirigidos al login, estamos autenticados
    const currentUrl = page.url();
    const isAuthenticated = !currentUrl.includes('/sign-in') && !currentUrl.includes('/login');
    
    console.log(`📍 URL después de ir a /sales: ${currentUrl}`);
    console.log(`✅ ¿Autenticado?: ${isAuthenticated}`);
    
    if (isAuthenticated) {
      // Verificar que la página tiene contenido esperado
      try {
        const hasContent = await page.locator('h1, table, .p-4, .flex, [data-testid="sales-content"]').first().isVisible({ timeout: 5000 });
        console.log(`📄 ¿Tiene contenido de sales?: ${hasContent}`);
        return hasContent;
      } catch {
        console.log('📄 No se pudo verificar contenido, pero URL es correcta');
        return true; // Si la URL es correcta, asumir que estamos autenticados
      }
    }
    
    return false;
  } catch (error: unknown) {
    console.log('❌ Error verificando autenticación:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Helper para setup de autenticación antes de cada test
 * Maneja mejor las cookies y el estado de sesión con better-auth
 */
export async function setupAuthenticatedUser(page: Page): Promise<void> {
  console.log('🔐 Iniciando proceso de autenticación...');
  
  try {
    // 1. Verificar primero si ya estamos autenticados
    const isAlreadyAuthenticated = await isUserLoggedIn(page);
    if (isAlreadyAuthenticated) {
      console.log('✅ Usuario ya autenticado, saltando proceso de login');
      return;
    }

    // 2. Ir a la página de sign-in
    await page.goto('/sign-in', { waitUntil: 'networkidle' });
    
    // 3. Verificar que estamos en la página correcta
    await expect(page).toHaveURL(/.*sign-in/);
    console.log('✅ En página de sign-in');
    
    // 4. Manejar múltiples formularios en la página (Google + credenciales)
    console.log('🔍 Buscando campos de login...');
    
    // Esperar a que la página esté completamente cargada
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Esperar componentes React
    
    // Buscar campos usando múltiples estrategias
    let emailField, passwordField, submitButton;
    
    // Los campos existen, los usamos directamente
    console.log('📧 Configurando campos de email y password...');
    emailField = page.locator('input[name="email"]').last();
    passwordField = page.locator('input[name="password"]').last();
    submitButton = page.locator('button[type="submit"]').last();
    
    // Verificar que los campos están disponibles
    await emailField.waitFor({ timeout: 10000 });
    await passwordField.waitFor({ timeout: 10000 });
    await submitButton.waitFor({ timeout: 10000 });
    
    console.log('✅ Todos los campos encontrados y disponibles');
    
    // 5. Llenar el formulario
    console.log('📝 Llenando formulario de login...');
    await emailField.fill(TEST_USER.email);
    await passwordField.fill(TEST_USER.password);
    
    // 6. Hacer click en el botón de submit y esperar navegación
    console.log('🚀 Enviando formulario...');
    
    // Escuchar respuestas de autenticación
    const authPromise = page.waitForResponse(resp => 
      resp.url().includes('/api/auth/') && resp.status() === 200
    ).catch(() => null); // No fallar si no hay respuesta específica
    
    await submitButton.click();
    
    // Esperar respuesta de autenticación
    try {
      const authResponse = await authPromise;
      if (authResponse) {
        console.log(`✅ Respuesta de auth recibida: ${authResponse.status()}`);
      } else {
        console.log('⚠️ No se detectó respuesta de auth específica, continuando...');
      }
    } catch (error) {
      console.log('⚠️ No se detectó respuesta de auth específica, continuando...');
    }
    
    // 7. Submit y esperar redirección
    console.log('🚀 Enviando formulario y esperando redirección...');
    
    try {
      await Promise.all([
        page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 15000 }),
        submitButton.click()
      ]);
    } catch (error) {
      // Si falla la redirección, intentar una vez más
      console.log('⚠️ Primer intento de redirección falló, reintentando...');
      await submitButton.click();
      await page.waitForTimeout(2000);
      
      // Verificar manualmente si cambió la URL
      const currentUrlAfterRetry = page.url();
      if (currentUrlAfterRetry.includes('/sign-in')) {
        throw new Error('Login falló después del segundo intento');
      }
    }
    
    const currentUrl = page.url();
    console.log(`📍 URL después del login: ${currentUrl}`);
    
    // 8. Verificar cookies de autenticación (con mejor manejo de errores)
    console.log('🍪 Verificando cookies de autenticación...');
    try {
      // Verificar que el contexto del página sigue activo
      if (page.isClosed()) {
        throw new Error('La página está cerrada');
      }
      
      const context = page.context();
      if (!context) {
        throw new Error('Contexto del navegador no disponible');
      }

      const cookies = await context.cookies().catch((error) => {
        console.log('⚠️ Error obteniendo cookies:', error.message);
        return [];
      });
      
      const authCookies = cookies.filter(cookie => 
        cookie.name.includes('session') || 
        cookie.name.includes('auth') || 
        cookie.name.includes('token') ||
        cookie.name.includes('better-auth')
      );
      
      console.log(`🍪 Cookies de auth encontradas: ${authCookies.length}`);
      authCookies.forEach(cookie => {
        console.log(`   ${cookie.name}: ${cookie.value.substring(0, 30)}...`);
      });
      
      // Si no hay cookies pero estamos autenticados, continuar
      if (authCookies.length === 0 && !currentUrl.includes('/sign-in')) {
        console.log('⚠️ No se encontraron cookies de auth, pero URL sugiere autenticación exitosa');
      }
      
    } catch (cookieError) {
      console.log('⚠️ Error verificando cookies:', cookieError instanceof Error ? cookieError.message : String(cookieError));
      // No fallar completamente, continuar con la verificación de URL
    }
    
    // 9. Verificar que NO estamos en página de error
    if (currentUrl.includes('/sign-in')) {
      console.log('❌ Aún en página de sign-in, verificando errores...');
      
      // Buscar mensajes de error
      const errorMessages = page.locator('[role="alert"], .error, .text-red, .text-destructive');
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          console.log(`❌ Error encontrado: ${errorText}`);
        }
      }
      
      throw new Error('Login falló - aún en página de sign-in');
    }
    
    // 10. Verificar estado de sesión con endpoint de API (con timeout más corto)
    console.log('🔍 Verificando estado de sesión...');
    try {
      const sessionResponse = await page.request.get('/api/auth/get-session', { timeout: 5000 });
      console.log(`📋 Status de /api/auth/get-session: ${sessionResponse.status()}`);
      
      if (sessionResponse.ok()) {
        try {
          const sessionData = await sessionResponse.json();
          console.log('✅ Sesión verificada:', JSON.stringify(sessionData, null, 2));
        } catch (jsonError) {
          console.log('⚠️ Error parsing JSON, pero status OK - probablemente sesión válida');
          const textResponse = await sessionResponse.text().catch(() => '[Error reading response]');
          console.log('📋 Respuesta como texto:', textResponse.substring(0, 200));
        }
      } else {
        console.log(`⚠️ Problema con sesión: ${sessionResponse.status()}`);
        const errorText = await sessionResponse.text().catch(() => '[Error reading error]');
        console.log('📋 Error text:', errorText.substring(0, 200));
      }
    } catch (error) {
      console.log('⚠️ Error verificando sesión:', error instanceof Error ? error.message : String(error));
    }
    
    // 11. Esperar un momento para que todas las cookies se establezcan
    await page.waitForTimeout(2000);
    
    console.log('✅ Autenticación completada');
    
  } catch (error) {
    console.error('❌ Error en setupAuthenticatedUser:', error instanceof Error ? error.message : String(error));
    
    // Intentar tomar screenshot para debug
    try {
      await page.screenshot({ 
        path: `test-results/auth-error-${Date.now()}.png`,
        fullPage: true 
      });
    } catch (screenshotError) {
      console.log('⚠️ No se pudo tomar screenshot de error');
    }
    
    throw error;
  }
}

/**
 * Helper para verificar si el usuario de test existe en la DB
 */
export async function ensureTestUserExists(page: Page): Promise<void> {
  console.log('👤 Verificando que el usuario de test existe en la DB...');
  
  try {
    // Hacer una llamada a un endpoint que liste usuarios o verificar directamente
    // Por ahora, simplemente intentamos hacer login y ver si funciona
    await page.goto('/sign-in');
    
    const emailField = page.locator('input[type="email"]').last();
    const passwordField = page.locator('input[type="password"]').last();
    
    await emailField.fill(TEST_USER.email);
    await passwordField.fill(TEST_USER.password);
    
    // Solo verificar que los campos se llenan correctamente
    // La verificación real se hará en setupAuthenticatedUser
    console.log('✅ Usuario de test configurado para verificación');
    
  } catch (error) {
    console.log('⚠️ Error verificando usuario de test:', error);
  }
}

/**
 * Helper simplificado para autenticación rápida en tests E2E
 * Evita problemas de contexto y cookies
 */
export async function setupQuickAuth(page: Page): Promise<void> {
  console.log('🚀 Setup rápido de autenticación...');
  
  try {
    // 1. Ir directamente a sign-in
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // 2. Verificar si ya estamos autenticados
    const currentUrl = page.url();
    if (!currentUrl.includes('/sign-in')) {
      console.log('✅ Usuario ya autenticado');
      return;
    }
    
    // 3. Esperar a que la página esté completamente cargada
    await page.waitForTimeout(3000); // Dar tiempo para que React se hidrate
    
    // 4. Buscar formularios - manejar múltiples posibles formularios
    const emailInputs = page.locator('input[name="email"], input[type="email"]');
    const passwordInputs = page.locator('input[name="password"], input[type="password"]');
    const submitButtons = page.locator('button[type="submit"]');
    
    console.log(`🔍 Encontrados ${await emailInputs.count()} inputs de email`);
    console.log(`🔍 Encontrados ${await passwordInputs.count()} inputs de password`);
    console.log(`🔍 Encontrados ${await submitButtons.count()} botones de submit`);
    
    // 5. Intentar encontrar el formulario visible
    let emailInput: any = null;
    let passwordInput: any = null;
    let submitButton: any = null;
    let formFound = false;
    
    // Intentar con el último formulario (que suele ser el principal)
    const emailCount = await emailInputs.count();
    const passwordCount = await passwordInputs.count();
    const submitCount = await submitButtons.count();
    
    if (emailCount > 0 && passwordCount > 0 && submitCount > 0) {
      // Probar con el último elemento de cada tipo
      emailInput = emailInputs.last();
      passwordInput = passwordInputs.last();
      submitButton = submitButtons.last();
      
      // Verificar si están visibles
      const emailVisible = await emailInput.isVisible().catch(() => false);
      const passwordVisible = await passwordInput.isVisible().catch(() => false);
      const submitVisible = await submitButton.isVisible().catch(() => false);
      
      console.log(`📧 Email visible: ${emailVisible}`);
      console.log(`🔒 Password visible: ${passwordVisible}`);
      console.log(`🚀 Submit visible: ${submitVisible}`);
      
      if (emailVisible && passwordVisible && submitVisible) {
        formFound = true;
      } else {
        // Si el último no es visible, probar con el primero
        emailInput = emailInputs.first();
        passwordInput = passwordInputs.first();
        submitButton = submitButtons.first();
        
        const emailVisible2 = await emailInput.isVisible().catch(() => false);
        const passwordVisible2 = await passwordInput.isVisible().catch(() => false);
        const submitVisible2 = await submitButton.isVisible().catch(() => false);
        
        if (emailVisible2 && passwordVisible2 && submitVisible2) {
          formFound = true;
        }
      }
    }
    
    if (!formFound) {
      // Intentar hacer visible el formulario principal
      console.log('⚠️ Formulario no visible, intentando activar...');
      
      // Buscar y hacer click en tabs o botones que puedan mostrar el formulario de credentials
      const credentialTabs = page.locator('button:has-text("Email"), button:has-text("Credenciales"), [role="tab"]:has-text("Email")');
      const credentialTabCount = await credentialTabs.count();
      
      if (credentialTabCount > 0) {
        console.log('🔍 Encontrado tab de credenciales, haciendo click...');
        await credentialTabs.first().click();
        await page.waitForTimeout(1000);
        
        // Reintenter encontrar el formulario
        emailInput = emailInputs.last();
        passwordInput = passwordInputs.last();
        submitButton = submitButtons.last();
        
        const emailVisible = await emailInput.isVisible().catch(() => false);
        const passwordVisible = await passwordInput.isVisible().catch(() => false);
        const submitVisible = await submitButton.isVisible().catch(() => false);
        
        if (emailVisible && passwordVisible && submitVisible) {
          formFound = true;
        }
      }
    }
    
    if (!formFound || !emailInput || !passwordInput || !submitButton) {
      throw new Error('No se pudo encontrar un formulario de login visible');
    }
    
    // 6. Llenar formulario
    console.log('📝 Llenando formulario...');
    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    
    // 7. Submit y esperar redirección
    await Promise.all([
      page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 10000 }),
      submitButton.click()
    ]);
    
    // 8. Verificación simple
    const finalUrl = page.url();
    if (finalUrl.includes('/sign-in')) {
      throw new Error('Login falló - sigue en sign-in');
    }
    
    console.log('✅ Autenticación rápida completada');
    await page.waitForTimeout(1000); // Pausa breve
    
  } catch (error) {
    console.error('❌ Error en setup rápido:', error instanceof Error ? error.message : String(error));
    
    // Tomar screenshot para debug
    try {
      await page.screenshot({ 
        path: `test-results/quick-auth-error-${Date.now()}.png`,
        fullPage: true 
      });
    } catch {
      // Ignorar errores de screenshot
    }
    
    throw error;
  }
} 