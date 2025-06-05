# Tests E2E - Configuración de Producción

## 🎯 Objetivo

Todos los tests E2E están configurados para correr **EXCLUSIVAMENTE en el servidor de producción** para obtener métricas reales de performance y comportamiento de cache.

## 🏗️ Configuración Actual

### Playwright Config
- **Puerto**: 3000 (producción)
- **Comando**: `pnpm run start` (NO `pnpm dev`)
- **Reuso de servidor**: `true` (siempre reutiliza servidor existente)

### ⚠️ IMPORTANTE: Flujo Requerido

1. **Construir el build de producción** (solo una vez):
   ```bash
   pnpm run build
   ```

2. **Iniciar servidor de producción** (mantener corriendo):
   ```bash
   pnpm run start
   ```

3. **Ejecutar tests** (en otra terminal):
   ```bash
   # Tests de cache effectiveness
   pnpm run test:cache-effectiveness
   
   # Tests de performance general  
   pnpm run test:performance
   
   # Tests de benchmark
   pnpm run test:benchmark
   ```

## 📋 Scripts Disponibles

### Verificación y Validación
```bash
# Verifica que el build esté listo
pnpm run test:production:check
```

### Tests Individuales
```bash
# Cache effectiveness (más importante)
pnpm run test:cache-effectiveness

# Performance de sales
pnpm run test:performance

# Benchmark comparison  
pnpm run test:benchmark

# Test rápido de auth
pnpm run test:quick
```

### Tests Grupales
```bash
# Todos los tests de performance
pnpm run test:performance:all

# Build completo + test (automático)
pnpm run test:production-full
```

## 🚨 Problemas Comunes

### Error: "Server not ready"
- **Causa**: El servidor de producción no está corriendo
- **Solución**: 
  ```bash
  # Terminal 1
  pnpm run start
  
  # Terminal 2 (después de 10-15 segundos)
  pnpm run test:cache-effectiveness
  ```

### Error: "Build not found"
- **Causa**: No existe el directorio `.next`
- **Solución**:
  ```bash
  pnpm run build
  ```

### Error: "Port 3000 in use"
- **Causa**: Otro proceso está usando el puerto 3000
- **Solución**:
  ```bash
  # Matar procesos en puerto 3000
  pkill -f "next start"
  # o
  lsof -ti:3000 | xargs kill -9
  ```

## 🔧 Por Qué Solo Producción

1. **Cache Real**: El comportamiento de cache de Next.js es diferente en desarrollo vs producción
2. **Performance Real**: Los tiempos de respuesta en desarrollo no reflejan la realidad
3. **Optimizaciones**: Solo en producción se activan todas las optimizaciones de Next.js
4. **Bundle Size**: Los assets están minificados y optimizados
5. **SSR/ISR**: El server-side rendering funciona diferente

## 📊 Métricas Clave

Los tests miden:
- **First Load Time**: Tiempo de carga inicial
- **Page Navigation**: Tiempo de cambio de página  
- **Cache Hit Rate**: Efectividad del cache
- **Database Query Time**: Tiempo de consultas optimizadas
- **Bundle Load Time**: Tiempo de carga de JavaScript
- **LCP (Largest Contentful Paint)**: Métrica Web Vital

## 🎛️ Variables de Entorno

Para tests de producción, asegúrate de tener:
```env
NODE_ENV=production
DATABASE_URL=tu_database_url
# Otras variables necesarias...
```

## 🏁 Flujo Recomendado

1. **Una vez por sesión**:
   ```bash
   pnpm run build
   ```

2. **Mantener corriendo** (en terminal dedicada):
   ```bash
   pnpm run start
   ```

3. **Ejecutar tests** (en otra terminal):
   ```bash
   pnpm run test:cache-effectiveness
   ```

4. **Para cambios de código**:
   - Parar servidor (`Ctrl+C`)
   - Rebuild (`pnpm run build`)  
   - Reiniciar servidor (`pnpm run start`)
   - Re-ejecutar tests

---

**🎯 Recuerda**: Los tests E2E NUNCA deben usar el servidor de desarrollo para obtener métricas precisas de producción. 