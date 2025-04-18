import { resolve } from 'path';
import fs from 'fs';

/**
 * Este script verifica que los aliases se estén resolviendo correctamente.
 * Se puede ejecutar como parte del CI para detectar problemas de configuración.
 */

// Verificar existencia de archivos en rutas comunes
const filesToCheck = [
  '@/components/custom/LoadingButton',
  '@/components/ui/button',
  '@/hooks/use-toast',
];

console.log('🔍 Verificando resolución de aliases...');

// Obtener la raíz del proyecto
const projectRoot = process.cwd();
const srcPath = resolve(projectRoot, 'src');

// Función para convertir un alias a una ruta absoluta
function resolveAlias(path: string): string {
  return path.replace('@/', `${srcPath}/`);
}

// Verificar si los archivos existen
for (const file of filesToCheck) {
  const resolvedPath = resolveAlias(file);
  
  // Intentar ambas extensiones comunes
  const pathWithTsx = `${resolvedPath}.tsx`;
  const pathWithTs = `${resolvedPath}.ts`;
  
  const existsTsx = fs.existsSync(pathWithTsx);
  const existsTs = fs.existsSync(pathWithTs);
  
  if (existsTsx || existsTs) {
    console.log(`✅ ${file} -> ${existsTsx ? pathWithTsx : pathWithTs}`);
  } else {
    console.error(`❌ No se pudo resolver: ${file}`);
    console.error(`   Intentado como: ${pathWithTsx}`);
    console.error(`   Intentado como: ${pathWithTs}`);
    process.exit(1);
  }
}

console.log('✅ Todos los aliases se resuelven correctamente.');
process.exit(0); 