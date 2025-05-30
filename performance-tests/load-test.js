import autocannon from 'autocannon';

// Configuración del test de carga
const loadTestConfig = {
  url: 'http://localhost:3000',
  connections: 10,        // Número de conexiones concurrentes
  pipelining: 1,         // Requests por conexión
  duration: 30,          // Duración en segundos
  headers: {
    'content-type': 'application/json'
  }
};

async function runLoadTest() {
  console.log('🚀 Iniciando Load Test...');
  console.log(`URL: ${loadTestConfig.url}`);
  console.log(`Conexiones: ${loadTestConfig.connections}`);
  console.log(`Duración: ${loadTestConfig.duration}s`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const result = await autocannon(loadTestConfig);
    
    console.log('\n📊 RESULTADOS DEL LOAD TEST:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📈 Requests totales: ${result.requests.total}`);
    console.log(`⚡ Requests/segundo promedio: ${result.requests.average}`);
    console.log(`🎯 Requests/segundo máximo: ${result.requests.max}`);
    console.log(`⏱️  Latencia promedio: ${result.latency.average}ms`);
    console.log(`🏃 Latencia mínima: ${result.latency.min}ms`);
    console.log(`🐌 Latencia máxima: ${result.latency.max}ms`);
    console.log(`📡 Throughput promedio: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`❌ Errores: ${result.errors}`);
    console.log(`⏳ Timeouts: ${result.timeouts}`);
    
    // Análisis de performance
    console.log('\n🔍 ANÁLISIS DE PERFORMANCE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (result.latency.average < 100) {
      console.log('✅ Latencia: EXCELENTE (< 100ms)');
    } else if (result.latency.average < 300) {
      console.log('🟡 Latencia: BUENA (100-300ms)');
    } else {
      console.log('🔴 Latencia: NECESITA MEJORAS (> 300ms)');
    }
    
    if (result.requests.average > 1000) {
      console.log('✅ Throughput: EXCELENTE (> 1000 req/s)');
    } else if (result.requests.average > 500) {
      console.log('🟡 Throughput: BUENO (500-1000 req/s)');
    } else {
      console.log('🔴 Throughput: NECESITA MEJORAS (< 500 req/s)');
    }
    
    if (result.errors === 0) {
      console.log('✅ Errores: PERFECTO (0 errores)');
    } else {
      console.log(`🔴 Errores: ${result.errors} errores detectados`);
    }

  } catch (error) {
    console.error('❌ Error durante el load test:', error.message);
    process.exit(1);
  }
}

// Test de rutas específicas
async function testSpecificRoutes() {
  const routes = [
    '/',
    '/api/auth/session',
    '/dashboard',
    '/sales',
    '/clients'
  ];

  console.log('\n🎯 TESTING RUTAS ESPECÍFICAS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  for (const route of routes) {
    console.log(`\n📍 Testing: ${route}`);
    try {
      const result = await autocannon({
        url: `http://localhost:3000${route}`,
        connections: 5,
        duration: 10,
        headers: loadTestConfig.headers
      });

      console.log(`  ⚡ ${result.requests.average} req/s`);
      console.log(`  ⏱️  ${result.latency.average}ms latencia`);
      console.log(`  ${result.errors === 0 ? '✅' : '❌'} ${result.errors} errores`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
}

// Ejecutar tests
const isMainModule = import.meta.url.startsWith('file:') && 
  (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
   import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`);

if (isMainModule) {
  runLoadTest()
    .then(() => testSpecificRoutes())
    .then(() => {
      console.log('\n🏁 Tests de performance completados!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { runLoadTest, testSpecificRoutes }; 