import autocannon from 'autocannon';
import { runSpeedTests } from './speed-test.js';

// 🚀 BENCHMARK DE THROUGHPUT - ANTES Y DESPUÉS
const baseUrl = 'http://localhost:3000';

// Configuraciones de test más intensivas
const benchmarkConfigs = {
  light: {
    connections: 10,
    duration: 15,
    description: 'Light Load'
  },
  medium: {
    connections: 25,
    duration: 30,
    description: 'Medium Load'
  },
  heavy: {
    connections: 50,
    duration: 45,
    description: 'Heavy Load'
  },
  extreme: {
    connections: 100,
    duration: 60,
    description: 'Extreme Load'
  }
};

async function runThroughputBenchmark() {
  console.log('🚀 INICIANDO BENCHMARK DE THROUGHPUT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Target: ${baseUrl}`);
  console.log('📊 Ejecutando múltiples niveles de carga...\n');

  const results = [];

  for (const [level, config] of Object.entries(benchmarkConfigs)) {
    console.log(`🔥 ${config.description} (${config.connections} conexiones, ${config.duration}s)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const result = await autocannon({
        url: baseUrl,
        connections: config.connections,
        duration: config.duration,
        headers: {
          'content-type': 'application/json',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      results.push({
        level,
        config,
        ...result
      });

      // Mostrar resultados inmediatos
      console.log(`📈 RPS Promedio: ${result.requests.average}`);
      console.log(`🎯 RPS Máximo: ${result.requests.max}`);
      console.log(`⏱️  Latencia Promedio: ${result.latency.average}ms`);
      console.log(`🏃 Latencia Mínima: ${result.latency.min}ms`);
      console.log(`🐌 Latencia Máxima: ${result.latency.max}ms`);
      console.log(`📡 Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
      console.log(`❌ Errores: ${result.errors}`);
      
      // Análisis de nivel
      const rpsRating = getRpsRating(result.requests.average);
      const latencyRating = getLatencyRating(result.latency.average);
      
      console.log(`🎖️  RPS Rating: ${rpsRating.emoji} ${rpsRating.description}`);
      console.log(`⚡ Latency Rating: ${latencyRating.emoji} ${latencyRating.description}`);
      console.log('');

    } catch (error) {
      console.error(`❌ Error en ${config.description}: ${error.message}\n`);
      results.push({
        level,
        config,
        error: error.message
      });
    }
  }

  // Reporte consolidado
  generateThroughputReport(results);
  
  return results;
}

function getRpsRating(rps) {
  if (rps >= 1000) return { emoji: '🥇', description: 'EXCELENTE (1000+ RPS)' };
  if (rps >= 500) return { emoji: '🥈', description: 'BUENO (500+ RPS)' };
  if (rps >= 200) return { emoji: '🥉', description: 'ACEPTABLE (200+ RPS)' };
  return { emoji: '🔴', description: 'NECESITA MEJORAS (< 200 RPS)' };
}

function getLatencyRating(latency) {
  if (latency <= 50) return { emoji: '🚀', description: 'ULTRA RÁPIDO (≤50ms)' };
  if (latency <= 100) return { emoji: '⚡', description: 'RÁPIDO (≤100ms)' };
  if (latency <= 200) return { emoji: '🟡', description: 'ACEPTABLE (≤200ms)' };
  return { emoji: '🐌', description: 'LENTO (>200ms)' };
}

function generateThroughputReport(results) {
  console.log('\n📊 REPORTE CONSOLIDADO DE THROUGHPUT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const validResults = results.filter(r => !r.error);
  
  if (validResults.length === 0) {
    console.log('❌ No se obtuvieron resultados válidos');
    return;
  }

  // Métricas por nivel
  console.log('\n🏆 PERFORMANCE POR NIVEL:');
  validResults.forEach(result => {
    const rpsRating = getRpsRating(result.requests.average);
    console.log(`${rpsRating.emoji} ${result.config.description}: ${result.requests.average} RPS (${result.latency.average}ms latencia)`);
  });

  // Estadísticas generales
  const avgRps = validResults.reduce((sum, r) => sum + r.requests.average, 0) / validResults.length;
  const maxRps = Math.max(...validResults.map(r => r.requests.average));
  const avgLatency = validResults.reduce((sum, r) => sum + r.latency.average, 0) / validResults.length;
  const minLatency = Math.min(...validResults.map(r => r.latency.average));

  console.log('\n📈 ESTADÍSTICAS GENERALES:');
  console.log(`⚡ RPS Promedio: ${avgRps.toFixed(1)}`);
  console.log(`🎯 RPS Máximo: ${maxRps}`);
  console.log(`⏱️  Latencia Promedio: ${avgLatency.toFixed(1)}ms`);
  console.log(`🏃 Latencia Mínima: ${minLatency}ms`);

  // Capacidad estimada
  console.log('\n🎯 CAPACIDAD ESTIMADA:');
  console.log(`👥 Usuarios concurrentes soportados: ~${Math.floor(maxRps * 0.7)}`);
  console.log(`📊 Requests por minuto: ~${Math.floor(maxRps * 60)}`);
  console.log(`🕐 Requests por hora: ~${Math.floor(maxRps * 3600)}`);

  // Recomendaciones específicas
  console.log('\n💡 RECOMENDACIONES ESPECÍFICAS:');
  
  if (avgRps < 500) {
    console.log('🔧 PRIORIDAD ALTA:');
    console.log('   - Implementar connection pooling');
    console.log('   - Optimizar queries de base de datos');
    console.log('   - Configurar caching de respuestas');
    console.log('   - Habilitar compresión gzip/brotli');
  } else if (avgRps < 1000) {
    console.log('⚡ PRIORIDAD MEDIA:');
    console.log('   - Implementar CDN para assets estáticos');
    console.log('   - Optimizar bundle size');
    console.log('   - Configurar HTTP/2');
    console.log('   - Implementar lazy loading');
  } else {
    console.log('✅ PERFORMANCE EXCELENTE:');
    console.log('   - Monitorear y mantener métricas');
    console.log('   - Preparar para escalamiento horizontal');
    console.log('   - Implementar alertas de performance');
  }

  // Comparación con baseline
  console.log('\n📐 COMPARACIÓN CON BASELINE:');
  console.log('   Target RPS para BUENO: 500+ RPS');
  console.log('   Target RPS para EXCELENTE: 1000+ RPS');
  
  const improvement = avgRps >= 500 ? '✅ OBJETIVO ALCANZADO' : `🎯 Necesitas ${(500 - avgRps).toFixed(0)} RPS más`;
  console.log(`   Estado actual: ${improvement}`);
}

// Tests específicos de rutas críticas
async function benchmarkCriticalRoutes() {
  const routes = [
    { path: '/', name: 'Homepage' },
    { path: '/api/auth/session', name: 'Auth API' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/sales', name: 'Sales' },
  ];

  console.log('\n🎯 BENCHMARK DE RUTAS CRÍTICAS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const route of routes) {
    console.log(`\n📍 Testing: ${route.name} (${route.path})`);
    
    try {
      const result = await autocannon({
        url: `${baseUrl}${route.path}`,
        connections: 20,
        duration: 15,
      });

      const rpsRating = getRpsRating(result.requests.average);
      console.log(`   ${rpsRating.emoji} ${result.requests.average} RPS - ${result.latency.average}ms`);
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Ejecutar benchmark completo
const isMainModule = import.meta.url.startsWith('file:') && 
  (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
   import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`);

if (isMainModule) {
  console.log('🚀 Iniciando benchmark completo de throughput...\n');
  
  runThroughputBenchmark()
    .then(() => benchmarkCriticalRoutes())
    .then(() => {
      console.log('\n🏁 Benchmark de throughput completado!');
      console.log('💡 Usa estos datos para comparar antes/después de optimizaciones');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { runThroughputBenchmark, benchmarkCriticalRoutes }; 