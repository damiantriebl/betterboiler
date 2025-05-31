#!/usr/bin/env node

/**
 * Script para verificar qué branch de base de datos está configurada
 * Uso: node scripts/check-db-branch.js
 */

import { readFileSync, existsSync } from 'fs';
import { dbConfig } from './db-config.js';

const envFile = '.env.local';

console.log('🔍 Verificando configuración de base de datos...\n');

if (!existsSync(envFile)) {
  console.error('❌ No se encontró .env.local');
  console.log('💡 Ejecuta: node scripts/switch-db-branch.js [dev|prod]');
  process.exit(1);
}

const envContent = readFileSync(envFile, 'utf8');
const lines = envContent.split('\n');

// Buscar DATABASE_URL
const dbUrlLine = lines.find(line => line.startsWith('DATABASE_URL='));
if (!dbUrlLine) {
  console.error('❌ No se encontró DATABASE_URL en .env.local');
  process.exit(1);
}

const currentUrl = dbUrlLine.split('=')[1]?.replace(/"/g, '');
if (!currentUrl) {
  console.error('❌ DATABASE_URL está vacía');
  process.exit(1);
}

// Determinar qué branch está configurada
let currentBranch = null;
let currentConfig = null;

for (const [key, config] of Object.entries(dbConfig)) {
  if (currentUrl === config.url) {
    currentBranch = key;
    currentConfig = config;
    break;
  }
}

// Mostrar información
console.log('📊 Estado actual:');

if (currentBranch) {
  console.log(`✅ Branch configurada: ${currentConfig.description}`);
  console.log(`   🌿 Nombre: ${currentConfig.name}`);
  console.log(`   🌍 Entorno: ${currentConfig.env}`);
} else {
  console.log('⚠️  Branch no reconocida (configuración personalizada)');
}

console.log(`   🔗 URL: ${currentUrl.split('@')[1]?.split('/')[0] || 'URL configurada'}`);

// Verificar otras variables de entorno importantes
console.log('\n🔧 Variables de entorno:');

const importantVars = ['NODE_ENV', 'NEXT_PUBLIC_ENV', 'BETTER_AUTH_SECRET'];
importantVars.forEach(varName => {
  const varLine = lines.find(line => line.startsWith(`${varName}=`));
  if (varLine) {
    const value = varLine.split('=')[1]?.replace(/"/g, '');
    console.log(`   ${varName}: ${value || '(vacía)'}`);
  } else {
    console.log(`   ${varName}: ❌ No configurada`);
  }
});

// Comandos útiles
console.log('\n💡 Comandos útiles:');
console.log('   🔄 Cambiar a desarrollo: pnpm run db:dev');
console.log('   🚀 Cambiar a producción: pnpm run db:prod');
console.log('   📊 Ver migraciones:     pnpm run db:status');
console.log('   🔍 Verificar conexión:  pnpm run db:pull');

if (currentBranch === 'development') {
  console.log('\n🛠️  Estás en DESARROLLO - Comandos disponibles:');
  console.log('   ✨ Crear migración:     pnpm prisma migrate dev --name feature-name');
  console.log('   🗑️  Reset BD (⚠️):       pnpm run db:reset:dev');
} else if (currentBranch === 'production') {
  console.log('\n🚨 Estás en PRODUCCIÓN - ¡Ten cuidado!');
  console.log('   ⚠️  Solo aplica migraciones: pnpm run db:deploy');
  console.log('   ❌ NO ejecutes: migrate dev, reset, etc.');
} 