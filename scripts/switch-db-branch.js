#!/usr/bin/env node

/**
 * Script para cambiar entre branches de desarrollo y producción en Neon
 * Uso: node scripts/switch-db-branch.js [dev|prod]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { environments, envConfig } from './db-config.js';

const branch = process.argv[2];

if (!branch || !['dev', 'prod'].includes(branch)) {
  console.error('❌ Uso: node scripts/switch-db-branch.js [dev|prod]');
  console.error('   dev  - Branch de desarrollo');
  console.error('   prod - Branch de producción'); 
  process.exit(1);
}

// Mapear comando a configuración
const branchMap = {
  dev: 'development',
  prod: 'production'
};

const configKey = branchMap[branch];
const config = environments[configKey];
const additionalEnv = envConfig[configKey];

if (!config) {
  console.error(`❌ Configuración no encontrada para: ${configKey}`);
  process.exit(1);
}

console.log(`🔄 Cambiando a: ${config.description}`);

// Verificar archivo .env
const envFile = config.envFile;
if (!existsSync(envFile)) {
  console.log(`📝 Creando archivo ${envFile}...`);
  
  // Crear archivo con configuración básica
  const envContent = `# Configuración automática para ${config.branch}
# Generado por: npm run db:${branch}

DATABASE_URL="${config.DATABASE_URL}"
DIRECT_URL="${config.DIRECT_URL}"

# Variables adicionales
${Object.entries(additionalEnv).map(([key, value]) => `${key}="${value}"`).join('\n')}

# Better Auth (agregar tu propia configuración)
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3000"
`;

  writeFileSync(envFile, envContent);
  console.log(`✅ Archivo ${envFile} creado`);
} else {
  // Actualizar archivo existente
  let envContent = readFileSync(envFile, 'utf8');

  // Actualizar DATABASE_URL
  const urlPattern = /DATABASE_URL="[^"]*"/;
  const newDatabaseUrl = `DATABASE_URL="${config.DATABASE_URL}"`;

  if (urlPattern.test(envContent)) {
    envContent = envContent.replace(urlPattern, newDatabaseUrl);
    console.log('✅ DATABASE_URL actualizada');
  } else {
    // Si no existe, agregarla al final
    envContent += `\n${newDatabaseUrl}\n`;
    console.log('✅ DATABASE_URL agregada');
  }

  // Actualizar DIRECT_URL
  const directUrlPattern = /DIRECT_URL="[^"]*"/;
  const newDirectUrl = `DIRECT_URL="${config.DIRECT_URL}"`;

  if (directUrlPattern.test(envContent)) {
    envContent = envContent.replace(directUrlPattern, newDirectUrl);
    console.log('✅ DIRECT_URL actualizada');
  } else {
    envContent += `\n${newDirectUrl}\n`;
    console.log('✅ DIRECT_URL agregada');
  }

  // Actualizar variables adicionales
  Object.entries(additionalEnv).forEach(([key, value]) => {
    const pattern = new RegExp(`${key}="[^"]*"`);
    const newVar = `${key}="${value}"`;
    
    if (pattern.test(envContent)) {
      envContent = envContent.replace(pattern, newVar);
      console.log(`✅ ${key} actualizada`);
    } else {
      envContent += `\n${newVar}\n`;
      console.log(`✅ ${key} agregada`);
    }
  });

  // Escribir archivo actualizado
  writeFileSync(envFile, envContent);
  console.log(`✅ Configuración actualizada en ${envFile}`);
}

// Regenerar cliente de Prisma
console.log('\n🔄 Regenerando cliente de Prisma...');
try {
  execSync('pnpm prisma generate', { stdio: 'inherit' });
  console.log('✅ Cliente de Prisma regenerado');
} catch (error) {
  console.error('❌ Error regenerando cliente de Prisma:', error.message);
  console.log('💡 Intenta ejecutar manualmente: pnpm prisma generate');
}

// Mostrar información
console.log('\n📊 Estado actual:');
console.log(`   🌿 Branch: ${config.branch}`);
console.log(`   🌍 Entorno: ${configKey}`);
console.log(`   📁 Archivo: ${config.envFile}`);
console.log(`   🔗 Endpoint: ${config.DATABASE_URL.split('@')[1]?.split('/')[0] || 'URL configurada'}`);

console.log('\n💡 Comandos útiles:');
console.log('   📊 Ver estado:        pnpm run db:status');
console.log('   🔄 Verificar conexión: pnpm run db:pull');
console.log('   🚀 Aplicar migraciones: pnpm run db:deploy');
console.log('   💾 Abrir Prisma Studio: pnpm run db:studio');

if (configKey === 'development') {
  console.log('\n🛠️  Comandos de desarrollo:');
  console.log('   🔄 Crear migración:   pnpm prisma migrate dev --name nueva-feature');
  console.log('   🗑️  Reset BD (⚠️):      pnpm run db:reset:dev');
}

console.log('\n⚠️  Recordatorio:');
console.log('   - Verifica siempre la branch antes de ejecutar migraciones');
console.log('   - Mantén backups de producción');
console.log(`   - Configuración para: Neon Project ${config.projectId}`); 