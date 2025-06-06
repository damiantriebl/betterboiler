# Solución para Errores de Extensiones Chrome

## Problema
Las extensiones de Chrome están intentando inyectar código en tu aplicación Next.js, causando errores como:

```
Denying load of chrome-extension://... Resources must be listed in the web_accessible_resources manifest key
GET chrome-extension://invalid/ net::ERR_FAILED
Failed to fetch dynamically imported module: chrome-extension://...
```

## Soluciones Implementadas

### 1. Headers de Seguridad Mejorados
- ✅ Se agregaron headers CSP más estrictos en `next.config.mjs`
- ✅ Se incluyeron headers anti-extensión en el middleware
- ✅ Se añadió `Cross-Origin-Embedder-Policy` para bloquear inyección

### 2. Script de Bloqueo en Runtime
- ✅ Se intercepta `window.fetch` para bloquear solicitudes a `chrome-extension://`
- ✅ Se manejan errores de módulos dinámicos relacionados con extensiones
- ✅ Se previenen promesas rechazadas por extensiones

### 3. Soluciones Adicionales para el Desarrollador

#### Opción A: Usar un Perfil de Chrome Limpio
```bash
# Crear un nuevo perfil de Chrome sin extensiones
chrome --user-data-dir="/tmp/chrome-clean" --disable-extensions
```

#### Opción B: Deshabilitar Extensiones Específicas
1. Ve a `chrome://extensions/`
2. Busca las extensiones que aparecen en los errores:
   - `jggapkmopfnbcolaeiigmammeiodbglc`
   - `e8f0dade-b5a4-4193-8b40-e371afd40c5b`
3. Deshabílitalas temporalmente

#### Opción C: Usar Modo Incógnito
- Las extensiones no suelen ejecutarse en modo incógnito
- Útil para testing sin interferencia

### 4. Variables de Entorno para Debugging

Puedes añadir estas variables a tu `.env.local`:

```env
# Habilitar logs detallados de extensiones
DEBUG_CHROME_EXTENSIONS=true

# Mostrar todos los errores interceptados
SHOW_EXTENSION_ERRORS=true
```

### 5. Configuración de Desarrollo Mejorada

Para evitar estos problemas en el futuro, considera:

1. **Usar Brave Browser** (bloquea extensiones automáticamente)
2. **Firefox Developer Edition** (menos problemas con extensiones)
3. **Chrome con --disable-extensions** para desarrollo

## Scripts Útiles

### Reiniciar Servidor con Configuración Limpia
```bash
pnpm run dev --port 3001
```

### Comprobar Extensiones Activas
```javascript
// En DevTools Console
console.log('Extensiones detectadas:', Object.keys(window.chrome?.runtime || {}));
```

### Limpiar Cache y Reiniciar
```bash
# Limpiar cache de Next.js
rm -rf .next

# Reinstalar dependencias
pnpm install

# Reiniciar servidor
pnpm run dev
```

## Verificación

Después de aplicar las soluciones, deberías ver en la consola:
- ✅ `🚫 Bloqueando solicitud a extensión Chrome`
- ✅ `🚫 Error de extensión Chrome manejado`
- ✅ Menos errores relacionados con `chrome-extension://`

## Notas Importantes

- ⚠️ Estas soluciones solo afectan el desarrollo, no la producción
- ⚠️ Los usuarios finales no verán estos errores en producción
- ⚠️ Es seguro ignorar estos errores si la funcionalidad principal funciona
- ✅ La aplicación seguirá funcionando normalmente a pesar de los errores

## Debugging Avanzado

Si los problemas persisten:

1. **Revisar Network Tab**: Buscar solicitudes fallidas a `chrome-extension://`
2. **Console Errors**: Filtrar por "extension" para ver errores específicos
3. **Sources Tab**: Verificar si hay scripts de extensiones inyectados
4. **Application Tab**: Revisar Storage y Service Workers de extensiones

---

**Autor**: Sistema de Protección contra Extensiones Chrome
**Fecha**: Automático
**Versión**: 1.0 