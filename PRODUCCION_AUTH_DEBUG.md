# Debug de Autenticación en Producción

## Problema
El middleware y la autenticación funcionan perfecto en local pero fallan en producción (Vercel), no permitiendo el login de usuarios existentes.

## Soluciones Implementadas

### 1. Endpoint de Debug
**URL**: `/api/debug/production-auth?key=DEBUG_KEY`

Este endpoint te ayudará a identificar qué está fallando:
- Variables de entorno faltantes
- Configuración de URLs incorrecta
- Problemas con cookies
- Estado de la sesión

### 2. Middleware Mejorado
El middleware ahora:
- ✅ Es más estricto en producción
- ✅ Valida cookies de autenticación en rutas protegidas
- ✅ Redirige automáticamente al sign-in si no hay autenticación
- ✅ Agrega headers de seguridad en producción
- ✅ Solo hace logging extensivo en desarrollo

### 3. Configuración de Auth Robusta
La configuración de `better-auth` ahora:
- ✅ Detecta automáticamente la URL base según el entorno
- ✅ Configura orígenes confiables dinámicamente
- ✅ Incluye soporte específico para Vercel
- ✅ Rate limiting más estricto en producción

## Variables de Entorno Requeridas para Producción

### Obligatorias
```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=tu-secret-super-secreto
BETTER_AUTH_URL=https://tu-dominio.vercel.app
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

### Opcionales para Debug
```bash
DEBUG_MIDDLEWARE=true  # Habilita logging del middleware en producción
DEBUG_AUTH=true        # Habilita logging de auth en producción
DEBUG_KEY=mi-clave-secreta  # Para acceder al endpoint de debug
```

## Checklist de Troubleshooting

### 1. Variables de Entorno
- [ ] `DATABASE_URL` configurada y accesible
- [ ] `BETTER_AUTH_SECRET` configurado (mínimo 32 caracteres)
- [ ] `BETTER_AUTH_URL` apunta al dominio correcto
- [ ] `NEXT_PUBLIC_APP_URL` coincide con `BETTER_AUTH_URL`

### 2. Dominio y URLs
- [ ] El dominio de producción está en `trustedOrigins`
- [ ] Las URLs no tienen trailing slash
- [ ] HTTPS está habilitado en producción

### 3. Base de Datos
- [ ] La base de datos de producción es accesible
- [ ] Los usuarios existen en la BD de producción
- [ ] Las tablas de autenticación están migradas

### 4. Cookies
- [ ] Las cookies se están enviando correctamente
- [ ] `sameSite` y `secure` están configurados para HTTPS
- [ ] No hay conflictos de dominio/subdominios

## Comandos de Debug

### 1. Verificar Configuración
```bash
# En tu aplicación desplegada, visita:
https://tu-dominio.vercel.app/api/debug/production-auth?key=TU_DEBUG_KEY
```

### 2. Habilitar Logging
Agrega estas variables en Vercel:
```bash
DEBUG_MIDDLEWARE=true
DEBUG_AUTH=true
```

### 3. Revisar Logs de Vercel
```bash
vercel logs
```

## Soluciones Comunes

### Error: "No se puede conectar a la base de datos"
- Verifica que `DATABASE_URL` esté configurada en Vercel
- Asegúrate de que la BD de producción esté corriendo
- Verifica que no haya espacios en blanco en la URL

### Error: "Trusted origins mismatch"
- Agrega tu dominio de producción a `BETTER_AUTH_URL`
- Verifica que `NEXT_PUBLIC_APP_URL` sea correcto
- No uses `http://` en producción, solo `https://`

### Error: "Session not found"
- Verifica que `BETTER_AUTH_SECRET` esté configurado
- Asegúrate de que sea el mismo en todos los deploys
- Revisa que las cookies se estén enviando con HTTPS

### Error: "Middleware redirect loop"
- Verifica que `/sign-in` no esté en rutas protegidas
- Asegúrate de que las rutas de auth (`/api/auth/*`) estén excluidas
- Revisa el matcher del middleware

## Archivos Modificados

1. `src/middleware.ts` - Middleware más robusto
2. `src/auth.ts` - Configuración mejorada
3. `src/app/api/debug/production-auth/route.ts` - Endpoint de debug

## Próximos Pasos

1. **Verificar Variables**: Usar el endpoint de debug para confirmar configuración
2. **Habilitar Logs**: Temporalmente habilitar logging en producción
3. **Probar Gradualmente**: Testear login paso a paso
4. **Revisar Logs**: Verificar logs de Vercel para errores específicos 