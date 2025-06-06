# Test info

- Name: Sign-In Functionality Tests >> 📝 Probar formulario de credenciales (UI only)
- Location: C:\proyectos2025\better\e2e\signin-functionality.spec.ts:81:3

# Error details

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

    at C:\proyectos2025\better\e2e\signin-functionality.spec.ts:90:22
```

# Page snapshot

```yaml
- alert
- button "Open Next.js Dev Tools":
  - img
- button "Open issues overlay": 1 Issue
- button "Collapse issues badge":
  - img
- navigation:
  - button "previous" [disabled]:
    - img "previous"
  - text: 1/1
  - button "next" [disabled]:
    - img "next"
- img
- link "Next.js 15.3.1 (stale) Webpack":
  - /url: https://nextjs.org/docs/messages/version-staleness
  - img
  - text: Next.js 15.3.1 (stale) Webpack
- img
- dialog "Runtime Error":
  - text: Runtime Error
  - button "Copy Stack Trace":
    - img
  - button "No related documentation found" [disabled]:
    - img
  - link "Learn more about enabling Node.js inspector for server code with Chrome DevTools":
    - /url: https://nextjs.org/docs/app/building-your-application/configuring/debugging#server-side-code
    - img
  - paragraph: "Error: ENOENT: no such file or directory, open 'C:\\proyectos2025\\better\\.next\\server\\pages\\_document.js'"
  - paragraph: Call Stack 35
  - button "Show 35 ignore-listed frame(s)":
    - text: Show 35 ignore-listed frame(s)
    - img
- contentinfo:
  - paragraph: This error happened while generating the page. Any console logs will be displayed in the terminal window.
  - region "Error feedback":
    - paragraph:
      - link "Was this helpful?":
        - /url: https://nextjs.org/telemetry#error-feedback
    - button "Mark as helpful"
    - button "Mark as not helpful"
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 |
   3 | test.describe('Sign-In Functionality Tests', () => {
   4 |   test('🔍 Verificar que la página de sign-in carga correctamente', async ({ page }) => {
   5 |     console.log('🚀 Testing sign-in page load...');
   6 |     
   7 |     // Navegar a la página de sign-in
   8 |     await page.goto('/sign-in');
   9 |     await page.waitForLoadState('networkidle');
   10 |     
   11 |     // Verificar que la página carga sin errores JavaScript
   12 |     const jsErrors: string[] = [];
   13 |     page.on('pageerror', (error) => {
   14 |       jsErrors.push(error.message);
   15 |       console.error('❌ JavaScript Error:', error.message);
   16 |     });
   17 |     
   18 |     // Verificar que el título esté presente
   19 |     await expect(page.locator('h1, .text-2xl')).toContainText('Iniciar Sesión');
   20 |     
   21 |     // Verificar que no hay errores de "process is not defined"
   22 |     expect(jsErrors.filter(err => err.includes('process is not defined'))).toHaveLength(0);
   23 |     
   24 |     console.log('✅ Página de sign-in carga sin errores de process.env');
   25 |   });
   26 |
   27 |   test('📱 Verificar elementos de UI están presentes', async ({ page }) => {
   28 |     await page.goto('/sign-in');
   29 |     await page.waitForLoadState('networkidle');
   30 |     
   31 |     // Verificar Google Sign-In Button
   32 |     const googleButton = page.locator('button:has-text("Continuar con Google")');
   33 |     await expect(googleButton).toBeVisible();
   34 |     console.log('✅ Botón de Google visible');
   35 |     
   36 |     // Verificar formulario de email/password
   37 |     const emailInput = page.locator('input[name="email"]');
   38 |     const passwordInput = page.locator('input[name="password"]');
   39 |     const submitButton = page.locator('button:has-text("Iniciar Sesión")');
   40 |     
   41 |     await expect(emailInput).toBeVisible();
   42 |     await expect(passwordInput).toBeVisible();
   43 |     await expect(submitButton).toBeVisible();
   44 |     
   45 |     console.log('✅ Formulario de credenciales visible');
   46 |     
   47 |     // Verificar link de registro
   48 |     const signUpLink = page.locator('a[href="/sign-up"]');
   49 |     await expect(signUpLink).toBeVisible();
   50 |     
   51 |     console.log('✅ Link de registro visible');
   52 |   });
   53 |
   54 |   test('🌐 Probar Google OAuth (solo verificar que no falla)', async ({ page }) => {
   55 |     await page.goto('/sign-in');
   56 |     await page.waitForLoadState('networkidle');
   57 |     
   58 |     // Capturar errores de red
   59 |     const networkErrors: string[] = [];
   60 |     page.on('response', (response) => {
   61 |       if (!response.ok() && response.url().includes('google')) {
   62 |         networkErrors.push(`${response.status()}: ${response.url()}`);
   63 |       }
   64 |     });
   65 |     
   66 |     // Clickear el botón de Google (sin completar el OAuth)
   67 |     const googleButton = page.locator('button:has-text("Continuar con Google")');
   68 |     await googleButton.click();
   69 |     
   70 |     // Esperar un momento para ver si hay errores inmediatos
   71 |     await page.waitForTimeout(2000);
   72 |     
   73 |     // No esperamos que complete el OAuth, solo que no falle immediatamente
   74 |     console.log('✅ Google OAuth button clickeable sin errores inmediatos');
   75 |     
   76 |     if (networkErrors.length > 0) {
   77 |       console.warn('⚠️ Network errors detected:', networkErrors);
   78 |     }
   79 |   });
   80 |
   81 |   test('📝 Probar formulario de credenciales (UI only)', async ({ page }) => {
   82 |     await page.goto('/sign-in');
   83 |     await page.waitForLoadState('networkidle');
   84 |     
   85 |     const emailInput = page.locator('input[name="email"]');
   86 |     const passwordInput = page.locator('input[name="password"]');
   87 |     const submitButton = page.locator('button:has-text("Iniciar Sesión")');
   88 |     
   89 |     // Llenar formulario con datos de prueba
>  90 |     await emailInput.fill('test@example.com');
      |                      ^ Error: locator.fill: Test timeout of 30000ms exceeded.
   91 |     await passwordInput.fill('testpassword123');
   92 |     
   93 |     // Verificar que los valores se llenaron
   94 |     await expect(emailInput).toHaveValue('test@example.com');
   95 |     console.log('✅ Email field funciona correctamente');
   96 |     
   97 |     // Verificar que el botón está habilitado
   98 |     await expect(submitButton).toBeEnabled();
   99 |     console.log('✅ Submit button está habilitado');
  100 |     
  101 |     // Clickear submit (esperamos que falle porque no es un usuario real)
  102 |     await submitButton.click();
  103 |     
  104 |     // Esperar un momento para procesar
  105 |     await page.waitForTimeout(3000);
  106 |     
  107 |     // Verificar que seguimos en la página de sign-in (ya que el usuario no existe)
  108 |     expect(page.url()).toContain('/sign-in');
  109 |     console.log('✅ Formulario procesa correctamente (permanece en sign-in para usuario inexistente)');
  110 |   });
  111 |
  112 |   test('🔗 Verificar navegación entre páginas auth', async ({ page }) => {
  113 |     await page.goto('/sign-in');
  114 |     await page.waitForLoadState('networkidle');
  115 |     
  116 |     // Ir a sign-up
  117 |     const signUpLink = page.locator('a[href="/sign-up"]');
  118 |     await signUpLink.click();
  119 |     await page.waitForLoadState('networkidle');
  120 |     
  121 |     expect(page.url()).toContain('/sign-up');
  122 |     console.log('✅ Navegación a sign-up funciona');
  123 |     
  124 |     // Ir a forgot-password
  125 |     await page.goto('/sign-in');
  126 |     await page.waitForLoadState('networkidle');
  127 |     
  128 |     const forgotPasswordLink = page.locator('a[href="/forgot-password"]');
  129 |     await forgotPasswordLink.click();
  130 |     await page.waitForLoadState('networkidle');
  131 |     
  132 |     expect(page.url()).toContain('/forgot-password');
  133 |     console.log('✅ Navegación a forgot-password funciona');
  134 |   });
  135 |
  136 |   test('🛡️ Verificar AuthGuard funciona correctamente', async ({ page }) => {
  137 |     // Intentar acceder a una página protegida sin autenticación
  138 |     await page.goto('/dashboard');
  139 |     await page.waitForLoadState('networkidle');
  140 |     
  141 |     // Debería redirigir a sign-in
  142 |     expect(page.url()).toContain('/sign-in');
  143 |     console.log('✅ AuthGuard redirige correctamente a sign-in');
  144 |     
  145 |     // Verificar que aparece el mensaje de error apropiado
  146 |     const errorParam = new URL(page.url()).searchParams.get('error');
  147 |     expect(errorParam).toBe('not-logged');
  148 |     console.log('✅ Parámetro de error correcto en redirección');
  149 |   });
  150 |
  151 |   test('🎨 Verificar que los estilos cargan correctamente', async ({ page }) => {
  152 |     await page.goto('/sign-in');
  153 |     await page.waitForLoadState('networkidle');
  154 |     
  155 |     // Verificar que Tailwind está funcionando
  156 |     const card = page.locator('.max-w-sm').first();
  157 |     const cardStyles = await card.evaluate((el) => {
  158 |       const styles = window.getComputedStyle(el);
  159 |       return {
  160 |         maxWidth: styles.maxWidth,
  161 |         display: styles.display
  162 |       };
  163 |     });
  164 |     
  165 |     // max-w-sm en Tailwind debería ser 384px
  166 |     expect(cardStyles.maxWidth).toBe('384px');
  167 |     console.log('✅ Tailwind CSS está funcionando correctamente');
  168 |     
  169 |     // Verificar que la card es visible
  170 |     await expect(card).toBeVisible();
  171 |     console.log('✅ Card de sign-in es visible con estilos correctos');
  172 |   });
  173 | }); 
```