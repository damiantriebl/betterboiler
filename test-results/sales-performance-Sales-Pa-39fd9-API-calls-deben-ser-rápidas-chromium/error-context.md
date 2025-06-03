# Test info

- Name: Sales Page Performance >> ⚡ API calls deben ser rápidas
- Location: C:\proyectos2025\better\e2e\sales-performance.spec.ts:178:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
    at setupQuickAuth (C:\proyectos2025\better\e2e\helpers\auth-helper.ts:448:12)
    at C:\proyectos2025\better\e2e\sales-performance.spec.ts:62:5
```

# Page snapshot

```yaml
- img "Nebulosa background"
- img "Apex Logo": APEX
- text: Iniciar Sesión
- button "Continuar con Google":
  - img
  - text: Continuar con Google
- text: O continúa con Email
- textbox "Email": damianplay@gmail.com
- text: Contraseña
- textbox "Contraseña": "123456789"
- button "Iniciar Sesión"
- text: O puedes crear una cuenta nueva
- link "🆕 Crear cuenta nueva":
  - /url: /sign-up
- text: ¿Olvidaste tu contraseña?
- link "Recupérala aquí":
  - /url: /forgot-password
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  348 |     if (!currentUrl.includes('/sign-in')) {
  349 |       console.log('✅ Usuario ya autenticado');
  350 |       return;
  351 |     }
  352 |     
  353 |     // 3. Esperar a que la página esté completamente cargada
  354 |     await page.waitForTimeout(3000); // Dar tiempo para que React se hidrate
  355 |     
  356 |     // 4. Buscar formularios - manejar múltiples posibles formularios
  357 |     const emailInputs = page.locator('input[name="email"], input[type="email"]');
  358 |     const passwordInputs = page.locator('input[name="password"], input[type="password"]');
  359 |     const submitButtons = page.locator('button[type="submit"]');
  360 |     
  361 |     console.log(`🔍 Encontrados ${await emailInputs.count()} inputs de email`);
  362 |     console.log(`🔍 Encontrados ${await passwordInputs.count()} inputs de password`);
  363 |     console.log(`🔍 Encontrados ${await submitButtons.count()} botones de submit`);
  364 |     
  365 |     // 5. Intentar encontrar el formulario visible
  366 |     let emailInput: any = null;
  367 |     let passwordInput: any = null;
  368 |     let submitButton: any = null;
  369 |     let formFound = false;
  370 |     
  371 |     // Intentar con el último formulario (que suele ser el principal)
  372 |     const emailCount = await emailInputs.count();
  373 |     const passwordCount = await passwordInputs.count();
  374 |     const submitCount = await submitButtons.count();
  375 |     
  376 |     if (emailCount > 0 && passwordCount > 0 && submitCount > 0) {
  377 |       // Probar con el último elemento de cada tipo
  378 |       emailInput = emailInputs.last();
  379 |       passwordInput = passwordInputs.last();
  380 |       submitButton = submitButtons.last();
  381 |       
  382 |       // Verificar si están visibles
  383 |       const emailVisible = await emailInput.isVisible().catch(() => false);
  384 |       const passwordVisible = await passwordInput.isVisible().catch(() => false);
  385 |       const submitVisible = await submitButton.isVisible().catch(() => false);
  386 |       
  387 |       console.log(`📧 Email visible: ${emailVisible}`);
  388 |       console.log(`🔒 Password visible: ${passwordVisible}`);
  389 |       console.log(`🚀 Submit visible: ${submitVisible}`);
  390 |       
  391 |       if (emailVisible && passwordVisible && submitVisible) {
  392 |         formFound = true;
  393 |       } else {
  394 |         // Si el último no es visible, probar con el primero
  395 |         emailInput = emailInputs.first();
  396 |         passwordInput = passwordInputs.first();
  397 |         submitButton = submitButtons.first();
  398 |         
  399 |         const emailVisible2 = await emailInput.isVisible().catch(() => false);
  400 |         const passwordVisible2 = await passwordInput.isVisible().catch(() => false);
  401 |         const submitVisible2 = await submitButton.isVisible().catch(() => false);
  402 |         
  403 |         if (emailVisible2 && passwordVisible2 && submitVisible2) {
  404 |           formFound = true;
  405 |         }
  406 |       }
  407 |     }
  408 |     
  409 |     if (!formFound) {
  410 |       // Intentar hacer visible el formulario principal
  411 |       console.log('⚠️ Formulario no visible, intentando activar...');
  412 |       
  413 |       // Buscar y hacer click en tabs o botones que puedan mostrar el formulario de credentials
  414 |       const credentialTabs = page.locator('button:has-text("Email"), button:has-text("Credenciales"), [role="tab"]:has-text("Email")');
  415 |       const credentialTabCount = await credentialTabs.count();
  416 |       
  417 |       if (credentialTabCount > 0) {
  418 |         console.log('🔍 Encontrado tab de credenciales, haciendo click...');
  419 |         await credentialTabs.first().click();
  420 |         await page.waitForTimeout(1000);
  421 |         
  422 |         // Reintenter encontrar el formulario
  423 |         emailInput = emailInputs.last();
  424 |         passwordInput = passwordInputs.last();
  425 |         submitButton = submitButtons.last();
  426 |         
  427 |         const emailVisible = await emailInput.isVisible().catch(() => false);
  428 |         const passwordVisible = await passwordInput.isVisible().catch(() => false);
  429 |         const submitVisible = await submitButton.isVisible().catch(() => false);
  430 |         
  431 |         if (emailVisible && passwordVisible && submitVisible) {
  432 |           formFound = true;
  433 |         }
  434 |       }
  435 |     }
  436 |     
  437 |     if (!formFound || !emailInput || !passwordInput || !submitButton) {
  438 |       throw new Error('No se pudo encontrar un formulario de login visible');
  439 |     }
  440 |     
  441 |     // 6. Llenar formulario
  442 |     console.log('📝 Llenando formulario...');
  443 |     await emailInput.fill(TEST_USER.email);
  444 |     await passwordInput.fill(TEST_USER.password);
  445 |     
  446 |     // 7. Submit y esperar redirección
  447 |     await Promise.all([
> 448 |       page.waitForURL(url => !url.toString().includes('/sign-in'), { timeout: 10000 }),
      |            ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  449 |       submitButton.click()
  450 |     ]);
  451 |     
  452 |     // 8. Verificación simple
  453 |     const finalUrl = page.url();
  454 |     if (finalUrl.includes('/sign-in')) {
  455 |       throw new Error('Login falló - sigue en sign-in');
  456 |     }
  457 |     
  458 |     console.log('✅ Autenticación rápida completada');
  459 |     await page.waitForTimeout(1000); // Pausa breve
  460 |     
  461 |   } catch (error) {
  462 |     console.error('❌ Error en setup rápido:', error instanceof Error ? error.message : String(error));
  463 |     
  464 |     // Tomar screenshot para debug
  465 |     try {
  466 |       await page.screenshot({ 
  467 |         path: `test-results/quick-auth-error-${Date.now()}.png`,
  468 |         fullPage: true 
  469 |       });
  470 |     } catch {
  471 |       // Ignorar errores de screenshot
  472 |     }
  473 |     
  474 |     throw error;
  475 |   }
  476 | } 
```