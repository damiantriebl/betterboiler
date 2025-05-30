# 🚀 Performance Tests

Esta carpeta contiene una suite completa de tests de performance para la aplicación Better.

## 📋 Tests Disponibles

### 1. **Speed Tests** (`speed-test.js`)
- ⏱️ Mide tiempo de respuesta de páginas y APIs
- 📊 Ejecuta 5 requests por ruta y calcula estadísticas
- 🎯 Analiza performance por tipo (página vs API)
- 📈 Genera métricas: promedio, mínimo, máximo, mediana

### 2. **Load Tests** (`load-test.js`)
- 🔥 Tests de carga con múltiples conexiones concurrentes
- ⚡ Mide throughput (requests/segundo)
- 🕒 Analiza latencia bajo carga
- 📦 Detecta errores y timeouts

### 3. **Lighthouse Tests** (`lighthouse-test.js`)
- 🔍 Analiza Core Web Vitals
- 📈 Mide Performance Score (0-100)
- 🎨 Evalúa FCP, LCP, TBT, CLS
- 💡 Genera recomendaciones específicas

## 🏃‍♂️ Cómo Ejecutar

### Prerequisitos
```bash
# Asegúrate de que el servidor esté corriendo
pnpm dev
```

### Tests Individuales
```bash
# Solo speed tests (rápido, ~30s)
pnpm perf:speed

# Solo load tests (moderado, ~1min)
pnpm perf:load

# Solo lighthouse tests (lento, ~2-3min)
pnpm perf:lighthouse

# Tests directos (sin verificación de servidor)
pnpm perf:speed-only
pnpm perf:load-only
pnpm perf:lighthouse-only
```

### Suite Completa
```bash
# Ejecutar todos los tests (~5-7min)
pnpm perf
```

## 📊 Interpretando Resultados

### Speed Tests
- **🚀 Excelente**: < 500ms (páginas), < 100ms (APIs)
- **⚡ Bueno**: 500-1500ms (páginas), 100-500ms (APIs)
- **🟡 Regular**: 1500-3000ms (páginas), 500-1000ms (APIs)
- **🐌 Lento**: > 3000ms (páginas), > 1000ms (APIs)

### Load Tests
- **Requests/segundo**: Más alto = mejor throughput
- **Latencia**: Más bajo = mejor experiencia usuario
- **Errores**: 0 = perfecto, > 0 = investigar

### Lighthouse
- **90-100**: 🚀 Excelente
- **70-89**: ⚡ Bueno
- **50-69**: 🟡 Necesita mejoras
- **< 50**: 🔴 Crítico

## 🔧 Configuración

### Modificar URLs de Test
Edita las rutas en `speed-test.js`:
```javascript
const routes = [
  { path: '/nueva-ruta', name: 'Nueva Página', type: 'page' },
  // ...
];
```

### Ajustar Parámetros de Load Test
Modifica `load-test.js`:
```javascript
const loadTestConfig = {
  connections: 10,    // Conexiones concurrentes
  duration: 30,       // Duración en segundos
  // ...
};
```

### Configurar Lighthouse
Personaliza `lighthouse-test.js`:
```javascript
const lighthouseConfig = {
  // Solo auditorías específicas
  onlyAudits: ['first-contentful-paint', 'largest-contentful-paint'],
  // ...
};
```

## 📁 Archivos Generados

- `lighthouse-report-*.json`: Reportes detallados de Lighthouse
- Logs de consola con análisis y recomendaciones
- Estadísticas comparativas entre tests

## 🎯 Mejores Prácticas

### Antes de Ejecutar Tests
1. **Servidor estable**: Asegúrate de que `pnpm dev` esté corriendo
2. **Base de datos**: Que esté poblada con datos de test
3. **Red estable**: Evita downloads grandes durante tests
4. **Recursos**: Cierra aplicaciones pesadas

### Interpretación de Resultados
1. **Baseline**: Ejecuta tests regularmente para establecer baseline
2. **Comparación**: Compara resultados antes/después de cambios
3. **Contexto**: Considera el entorno (desarrollo vs producción)
4. **Trends**: Busca tendencias, no valores absolutos

### Optimización Basada en Resultados
- **FCP alto**: Optimizar CSS crítico
- **LCP alto**: Optimizar imágenes y servidor
- **TBT alto**: Reducir JavaScript
- **Load test pobre**: Revisar queries de base de datos
- **Speed test lento**: Implementar caching

## ⚠️ Limitaciones

- **Desarrollo**: Tests en modo desarrollo (más lento que producción)
- **Local**: Red local (más rápido que internet real)
- **Datos**: Depende de datos de test (pueden variar)
- **Hardware**: Resultados dependen del hardware local

## 🚀 Próximos Pasos

Para tests más realistas:
1. Ejecutar en ambiente de staging
2. Usar datos reales (anonimizados)
3. Implementar CI/CD con performance budgets
4. Monitoreo continuo en producción

---

💡 **Tip**: Ejecuta `pnpm perf:speed` regularmente durante desarrollo para detectar regresiones temprano. 