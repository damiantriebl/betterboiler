import https from 'https';
import http from 'http';

// Configuración de tests
const baseUrl = 'http://localhost:3000';

const routes = [
  // Páginas principales
  { path: '/', name: 'Homepage', type: 'page' },
  { path: '/dashboard', name: 'Dashboard', type: 'page' },
  { path: '/sales', name: 'Sales', type: 'page' },
  { path: '/clients', name: 'Clients', type: 'page' },
  { path: '/configuration', name: 'Configuration', type: 'page' },
  { path: '/reports', name: 'Reports', type: 'page' },
  
  // APIs críticas
  { path: '/api/auth/session', name: 'Auth Session', type: 'api' },
  { path: '/api/branches', name: 'Branches API', type: 'api' },
  { path: '/api/models', name: 'Models API', type: 'api' },
];

async function measureResponseTime(url) {
  return new Promise((resolve, reject) => {
    const startTime = process.hrtime.bigint();
    
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          responseTime: Math.round(responseTime),
          statusCode: res.statusCode,
          contentLength: data.length,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testRoute(route) {
  const url = `${baseUrl}${route.path}`;
  const attempts = 5;
  const results = [];
  
  console.log(`\n📍 Testing: ${route.name} (${route.type})`);
  console.log(`🌐 URL: ${url}`);
  
  for (let i = 1; i <= attempts; i++) {
    try {
      const result = await measureResponseTime(url);
      results.push(result);
      
      const statusEmoji = result.statusCode < 300 ? '✅' : result.statusCode < 400 ? '🟡' : '❌';
      console.log(`  ${i}/5: ${result.responseTime}ms ${statusEmoji} (${result.statusCode})`);
      
      // Pequeña pausa entre requests
      if (i < attempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.log(`  ${i}/5: ❌ Error - ${error.message}`);
      results.push({ error: error.message, responseTime: 0 });
    }
  }
  
  // Calcular estadísticas
  const validResults = results.filter(r => !r.error);
  if (validResults.length > 0) {
    const times = validResults.map(r => r.responseTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const median = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];
    
    const analysis = analyzePerformance(avg, route.type);
    
    console.log(`  📊 Promedio: ${Math.round(avg)}ms ${analysis.emoji}`);
    console.log(`  🏃 Mínimo: ${min}ms`);
    console.log(`  🐌 Máximo: ${max}ms`);
    console.log(`  📈 Mediana: ${median}ms`);
    console.log(`  🎯 Status: ${validResults[0].statusCode}`);
    console.log(`  💾 Tamaño: ${(validResults[0].contentLength / 1024).toFixed(2)}KB`);
    
    return {
      name: route.name,
      type: route.type,
      path: route.path,
      avg: Math.round(avg),
      min,
      max,
      median,
      analysis,
      statusCode: validResults[0].statusCode,
      size: validResults[0].contentLength,
      errors: results.length - validResults.length
    };
  } else {
    console.log('  ❌ Todos los requests fallaron');
    return {
      name: route.name,
      type: route.type,
      path: route.path,
      avg: 0,
      errors: results.length,
      allFailed: true
    };
  }
}

function analyzePerformance(avgTime, type) {
  const thresholds = {
    page: { excellent: 500, good: 1500, slow: 3000 },
    api: { excellent: 100, good: 500, slow: 1000 }
  };
  
  const threshold = thresholds[type] || thresholds.api;
  
  if (avgTime <= threshold.excellent) {
    return { level: 'excellent', emoji: '🚀', description: 'Excelente' };
  } else if (avgTime <= threshold.good) {
    return { level: 'good', emoji: '⚡', description: 'Bueno' };
  } else if (avgTime <= threshold.slow) {
    return { level: 'average', emoji: '🟡', description: 'Regular' };
  } else {
    return { level: 'slow', emoji: '🐌', description: 'Lento' };
  }
}

function generateSummaryReport(results) {
  console.log('\n📊 RESUMEN GENERAL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const validResults = results.filter(r => !r.allFailed);
  
  if (validResults.length === 0) {
    console.log('❌ No se pudieron completar tests exitosos');
    return;
  }
  
  // Estadísticas por tipo
  const pageResults = validResults.filter(r => r.type === 'page');
  const apiResults = validResults.filter(r => r.type === 'api');
  
  if (pageResults.length > 0) {
    console.log('\n📄 PÁGINAS:');
    const avgPageTime = pageResults.reduce((sum, r) => sum + r.avg, 0) / pageResults.length;
    console.log(`  Promedio general: ${Math.round(avgPageTime)}ms ${analyzePerformance(avgPageTime, 'page').emoji}`);
    
    pageResults.forEach(result => {
      console.log(`  ${result.analysis.emoji} ${result.name}: ${result.avg}ms`);
    });
  }
  
  if (apiResults.length > 0) {
    console.log('\n🔌 APIs:');
    const avgApiTime = apiResults.reduce((sum, r) => sum + r.avg, 0) / apiResults.length;
    console.log(`  Promedio general: ${Math.round(avgApiTime)}ms ${analyzePerformance(avgApiTime, 'api').emoji}`);
    
    apiResults.forEach(result => {
      console.log(`  ${result.analysis.emoji} ${result.name}: ${result.avg}ms`);
    });
  }
  
  // Top performers y slow performers
  console.log('\n🏆 TOP PERFORMERS:');
  const fastest = validResults.sort((a, b) => a.avg - b.avg).slice(0, 3);
  fastest.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.name}: ${result.avg}ms 🚀`);
  });
  
  console.log('\n🐌 NECESITAN ATENCIÓN:');
  const slowest = validResults.sort((a, b) => b.avg - a.avg).slice(0, 3);
  slowest.forEach((result, index) => {
    if (result.avg > (result.type === 'page' ? 1500 : 500)) {
      console.log(`  ${index + 1}. ${result.name}: ${result.avg}ms`);
    }
  });
  
  // Recomendaciones generales
  console.log('\n💡 RECOMENDACIONES:');
  const overallAvg = validResults.reduce((sum, r) => sum + r.avg, 0) / validResults.length;
  
  if (overallAvg < 500) {
    console.log('✅ Excelente performance general! Tu aplicación es muy rápida.');
  } else if (overallAvg < 1000) {
    console.log('⚡ Buena performance. Algunas optimizaciones menores podrían ayudar.');
  } else {
    console.log('🔧 Considera optimizaciones: caching, compresión, CDN, y code splitting.');
  }
}

export async function runSpeedTests() {
  console.log('🚀 INICIANDO SPEED TESTS');
  console.log(`🌐 Base URL: ${baseUrl}`);
  console.log(`📊 Testing ${routes.length} rutas con 5 requests cada una`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const results = [];
  const startTime = Date.now();
  
  for (const route of routes) {
    try {
      const result = await testRoute(route);
      results.push(result);
    } catch (error) {
      console.log(`❌ Error testing ${route.name}: ${error.message}`);
      results.push({
        name: route.name,
        type: route.type,
        path: route.path,
        error: error.message,
        allFailed: true
      });
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  generateSummaryReport(results);
  
  console.log(`\n⏰ Tests completados en ${totalTime}s`);
  console.log('🏁 Speed tests finalizados!');
  
  return results;
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url.startsWith('file:') && 
  (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
   import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`);

if (isMainModule) {
  runSpeedTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { measureResponseTime, testRoute }; 