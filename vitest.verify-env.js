import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Este script verifica que los aliases se estén resolviendo correctamente.
 * Se puede ejecutar como parte del CI para detectar problemas de configuración.
 */

// Verificar existencia de archivos en rutas comunes
const filesToCheck = [
  'components/custom/LoadingButton',
  'components/ui/button',
  'hooks/use-toast',
];

console.log('🔍 Verificando resolución de aliases...');

// Obtener la raíz del proyecto
const srcPath = resolve(__dirname, 'src');

// Verificar si los archivos existen
for (const file of filesToCheck) {
  const basePath = resolve(srcPath, file);
  
  // Intentar ambas extensiones comunes
  const pathWithTsx = `${basePath}.tsx`;
  const pathWithTs = `${basePath}.ts`;
  
  const existsTsx = fs.existsSync(pathWithTsx);
  const existsTs = fs.existsSync(pathWithTs);
  
  if (existsTsx || existsTs) {
    console.log(`✅ @/${file} -> ${existsTsx ? pathWithTsx : pathWithTs}`);
  } else {
    console.error(`❌ No se pudo resolver: @/${file}`);
    console.error(`   Intentado como: ${pathWithTsx}`);
    console.error(`   Intentado como: ${pathWithTs}`);
    process.exit(1);
  }
}

console.log('✅ Todos los aliases se resuelven correctamente.');
process.exit(0); 