import { runSpeedTests } from './speed-test.js';
import { spawn } from 'child_process';
import http from 'http';

// Función para ejecutar comandos de forma asíncrona
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

// Función para esperar que el servidor esté listo
async function waitForServer(url = 'http://localhost:3000', timeout = 60000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          resolve();
        });
        
        req.on('error', () => {
          reject();
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          reject();
        });
      });
      
      return true;
    } catch (error) {
      console.log('⏳ Esperando que el servidor esté listo...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Timeout esperando que el servidor esté listo');
}

async function checkServerStatus() {
  try {
    await waitForServer();
    console.log('✅ Servidor detectado en http://localhost:3000');
    return true;
  } catch (error) {
    console.log('❌ No se detectó el servidor en http://localhost:3000');
    console.log('💡 Asegúrate de ejecutar: pnpm dev');
    return false;
  }
}

async function runAllPerformanceTests() {
  console.log('🚀 INICIANDO SUITE COMPLETA DE PERFORMANCE TESTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const startTime = Date.now();
  
  // 1. Verificar que el servidor esté corriendo
  console.log('\n1️⃣ VERIFICANDO SERVIDOR...');
  const serverReady = await checkServerStatus();
  
  if (!serverReady) {
    console.log('\n❌ Tests cancelados: Servidor no disponible');
    process.exit(1);
  }

  try {
    // 2. Speed Tests (Response time)
    console.log('\n2️⃣ EJECUTANDO SPEED TESTS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await runSpeedTests();
    
    // 3. Load Tests (con autocannon)
    console.log('\n3️⃣ EJECUTANDO LOAD TESTS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      await runCommand('node', ['performance-tests/load-test.js']);
    } catch (error) {
      console.log('⚠️  Load tests fallaron:', error.message);
    }
    
    // 4. Lighthouse Tests (opcional, solo si está disponible)
    console.log('\n4️⃣ EJECUTANDO LIGHTHOUSE TESTS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      await runCommand('node', ['performance-tests/lighthouse-test.js', '--single']);
    } catch (error) {
      console.log('⚠️  Lighthouse tests fallaron:', error.message);
      console.log('💡 Nota: Lighthouse requiere Chrome/Chromium instalado');
    }
    
  } catch (error) {
    console.error('\n❌ Error durante los tests:', error.message);
    process.exit(1);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n🏁 RESUMEN FINAL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏰ Tiempo total: ${totalTime}s`);
  console.log('✅ Suite de performance tests completada!');
  console.log('\n📊 Para análisis detallado, revisa los reportes generados en ./performance-tests/');
  console.log('💡 Tip: Ejecuta tests individuales con:');
  console.log('   - pnpm perf:speed (solo speed tests)');
  console.log('   - pnpm perf:load (solo load tests)');
  console.log('   - pnpm perf:lighthouse (solo lighthouse)');
}

// Función para ejecutar tests individuales
async function runIndividualTest(testType) {
  console.log(`🚀 Ejecutando ${testType} tests...`);
  
  const serverReady = await checkServerStatus();
  if (!serverReady) {
    console.log('\n❌ Test cancelado: Servidor no disponible');
    process.exit(1);
  }
  
  try {
    switch (testType) {
      case 'speed':
        await runSpeedTests();
        break;
      case 'load':
        await runCommand('node', ['performance-tests/load-test.js']);
        break;
      case 'lighthouse':
        await runCommand('node', ['performance-tests/lighthouse-test.js', '--single']);
        break;
      default:
        console.log('❌ Tipo de test no válido. Usa: speed, load, o lighthouse');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error en ${testType} test:`, error.message);
    process.exit(1);
  }
  
  console.log(`✅ ${testType} test completado!`);
}

// Manejar argumentos de línea de comandos
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Ejecutar todos los tests
    runAllPerformanceTests()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('💥 Error fatal:', error.message);
        process.exit(1);
      });
  } else {
    // Ejecutar test específico
    const testType = args[0];
    runIndividualTest(testType)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('💥 Error fatal:', error.message);
        process.exit(1);
      });
  }
}

export { runAllPerformanceTests, runIndividualTest, checkServerStatus }; 