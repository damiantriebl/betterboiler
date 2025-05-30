import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import fs from 'fs';

// 🎯 Configuración de Lighthouse para testing de Sales
const lighthouseConfig = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
    emulatedUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};

async function runPerformanceAudit() {
  console.log('🚀 Iniciando análisis de performance con Lighthouse...\n');
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    const cdpSession = await page.context().newCDPSession(page);
    
    // URL a testear
    const url = 'http://localhost:3001/sales';
    
    console.log(`🔍 Analizando: ${url}`);
    console.log('⏳ Esto puede tomar unos minutos...\n');

    // Ejecutar Lighthouse
    const result = await lighthouse(url, {
      port: new URL(cdpSession.targetId).port,
      output: 'html',
      logLevel: 'info',
    }, lighthouseConfig);

    if (!result) {
      throw new Error('Error al ejecutar Lighthouse');
    }

    // Extraer métricas clave
    const { lhr } = result;
    const { audits } = lhr;

    // 📊 RESULTADOS DE PERFORMANCE
    console.log('🎯 ═══════════════════════════════════════════════════');
    console.log('📊 RESULTADOS DE LIGHTHOUSE - SALES PAGE PERFORMANCE');
    console.log('🎯 ═══════════════════════════════════════════════════');
    
    // Score general
    const performanceScore = Math.round(lhr.categories.performance.score * 100);
    console.log(`🏆 SCORE DE PERFORMANCE: ${performanceScore}/100`);
    
    // Core Web Vitals
    console.log('\n🎨 CORE WEB VITALS:');
    console.log(`📏 First Contentful Paint: ${audits['first-contentful-paint'].displayValue}`);
    console.log(`📊 Largest Contentful Paint: ${audits['largest-contentful-paint'].displayValue}`);
    console.log(`⚡ Total Blocking Time: ${audits['total-blocking-time'].displayValue}`);
    console.log(`📈 Cumulative Layout Shift: ${audits['cumulative-layout-shift'].displayValue}`);
    console.log(`🔄 Speed Index: ${audits['speed-index'].displayValue}`);

    // Métricas adicionales
    console.log('\n⚡ MÉTRICAS ADICIONALES:');
    console.log(`🚀 Time to Interactive: ${audits['interactive'].displayValue}`);
    console.log(`📱 First Meaningful Paint: ${audits['first-meaningful-paint'].displayValue}`);
    
    // Oportunidades de mejora
    console.log('\n🔧 OPORTUNIDADES DE MEJORA:');
    const opportunities = Object.values(audits).filter(audit => 
      audit.scoreDisplayMode === 'numeric' && 
      audit.score !== null && 
      audit.score < 0.9 &&
      audit.details &&
      audit.details.overallSavingsMs > 100
    );

    if (opportunities.length > 0) {
      opportunities.slice(0, 5).forEach(audit => {
        console.log(`💡 ${audit.title}: ${audit.displayValue || 'Necesita optimización'}`);
      });
    } else {
      console.log('✅ No se encontraron oportunidades de mejora significativas');
    }

    // Guardar reporte HTML
    const reportPath = './test-results/lighthouse-sales-report.html';
    
    // Crear directorio si no existe
    if (!fs.existsSync('./test-results')) {
      fs.mkdirSync('./test-results', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, result.report);
    
    console.log(`\n📄 Reporte completo guardado en: ${reportPath}`);
    console.log('🎯 ═══════════════════════════════════════════════════\n');

    // 🎯 VERIFICACIONES
    console.log('🧪 VERIFICANDO UMBRALES DE PERFORMANCE...');
    
    const checks = {
      'Performance Score >= 75': performanceScore >= 75,
      'FCP < 1.5s': parseFloat(audits['first-contentful-paint'].numericValue) < 1500,
      'LCP < 2.5s': parseFloat(audits['largest-contentful-paint'].numericValue) < 2500,
      'TBT < 200ms': parseFloat(audits['total-blocking-time'].numericValue) < 200,
      'CLS < 0.1': parseFloat(audits['cumulative-layout-shift'].numericValue) < 0.1
    };

    let passedChecks = 0;
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
      if (passed) passedChecks++;
    });

    const successRate = (passedChecks / Object.keys(checks).length) * 100;
    console.log(`\n📊 CHECKS APROBADOS: ${passedChecks}/${Object.keys(checks).length} (${successRate}%)`);

    if (successRate >= 80) {
      console.log('🌟 EXCELENTE: Performance optimizada correctamente!');
    } else if (successRate >= 60) {
      console.log('✅ BUENO: Performance aceptable con margen de mejora');
    } else {
      console.log('⚠️ NECESITA TRABAJO: Performance por debajo del estándar');
    }

    return {
      score: performanceScore,
      metrics: {
        fcp: audits['first-contentful-paint'].numericValue,
        lcp: audits['largest-contentful-paint'].numericValue,
        tbt: audits['total-blocking-time'].numericValue,
        cls: audits['cumulative-layout-shift'].numericValue,
        si: audits['speed-index'].numericValue
      },
      passed: successRate >= 75
    };

  } catch (error) {
    console.error('❌ Error durante el análisis de Lighthouse:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runPerformanceAudit()
    .then(result => {
      console.log('\n🎉 Análisis completado exitosamente!');
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

export { runPerformanceAudit }; 