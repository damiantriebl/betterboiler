import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';
import fs from 'fs';
import path from 'path';

// Configuración de Lighthouse simplificada
const lighthouseConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    }
  }
};

async function runLighthouseTest(url = 'http://localhost:3000') {
  console.log('🔍 Iniciando Lighthouse Performance Test...');
  console.log(`🌐 URL: ${url}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let chrome;
  
  try {
    // Lanzar Chrome
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
    });
    
    // Ejecutar Lighthouse
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance']
    }, lighthouseConfig);

    const report = runnerResult.report;
    const results = JSON.parse(report);
    
    // Extraer métricas clave
    const metrics = results.audits;
    const performanceScore = results.categories.performance.score * 100;
    
    console.log('\n📊 CORE WEB VITALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // First Contentful Paint
    if (metrics['first-contentful-paint']) {
      const fcp = metrics['first-contentful-paint'];
      console.log(`🎨 First Contentful Paint: ${fcp.displayValue} ${getScoreEmoji(fcp.score)}`);
    }
    
    // Largest Contentful Paint
    if (metrics['largest-contentful-paint']) {
      const lcp = metrics['largest-contentful-paint'];
      console.log(`🖼️  Largest Contentful Paint: ${lcp.displayValue} ${getScoreEmoji(lcp.score)}`);
    }
    
    // Speed Index
    if (metrics['speed-index']) {
      const si = metrics['speed-index'];
      console.log(`⚡ Speed Index: ${si.displayValue} ${getScoreEmoji(si.score)}`);
    }
    
    // Time to Interactive
    if (metrics['interactive']) {
      const tti = metrics['interactive'];
      console.log(`🖱️  Time to Interactive: ${tti.displayValue} ${getScoreEmoji(tti.score)}`);
    }

    console.log('\n🏆 PERFORMANCE SCORE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📈 Score General: ${performanceScore.toFixed(0)}/100 ${getPerformanceEmoji(performanceScore)}`);
    
    // Recomendaciones
    console.log('\n💡 RECOMENDACIONES:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (performanceScore >= 90) {
      console.log('✅ Excelente performance! Tu sitio está optimizado.');
    } else if (performanceScore >= 70) {
      console.log('🟡 Buena performance, pero hay oportunidades de mejora.');
    } else {
      console.log('🔴 Performance necesita mejoras significativas.');
    }
    
    // Guardar reporte completo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), 'performance-tests', `lighthouse-report-${timestamp}.json`);
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Reporte completo guardado en: ${reportPath}`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Error durante el test de Lighthouse:', error.message);
    throw error;
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

function getScoreEmoji(score) {
  if (score >= 0.9) return '✅';
  if (score >= 0.5) return '🟡';
  return '🔴';
}

function getPerformanceEmoji(score) {
  if (score >= 90) return '🚀';
  if (score >= 70) return '⚡';
  if (score >= 50) return '🟡';
  return '🐌';
}

// Test de múltiples páginas (simplificado)
async function testMultiplePages() {
  const pages = [
    { url: 'http://localhost:3000', name: 'Homepage' }
  ];

  console.log('\n🎯 TESTING PÁGINAS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results = [];

  for (const page of pages) {
    console.log(`\n📍 Testing: ${page.name} (${page.url})`);
    try {
      const result = await runLighthouseTest(page.url);
      results.push({
        name: page.name,
        url: page.url,
        score: result.categories.performance.score * 100
      });
    } catch (error) {
      console.log(`❌ Error testing ${page.name}: ${error.message}`);
      results.push({
        name: page.name,
        url: page.url,
        score: 0,
        error: error.message
      });
    }
  }

  console.log('\n📊 RESUMEN FINAL:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.name}: Error`);
    } else {
      console.log(`${getPerformanceEmoji(result.score)} ${result.name}: ${result.score.toFixed(0)}/100`);
    }
  });
}

// Ejecutar test
const isMainModule = import.meta.url.startsWith('file:') && 
  (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
   import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`);

if (isMainModule) {
  const testSingle = process.argv.includes('--single');
  
  if (testSingle) {
    runLighthouseTest()
      .then(() => {
        console.log('\n🏁 Test de Lighthouse completado!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
      });
  } else {
    testMultiplePages()
      .then(() => {
        console.log('\n🏁 Tests de Lighthouse completados!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
      });
  }
}

export { runLighthouseTest, testMultiplePages }; 