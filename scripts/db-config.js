#!/usr/bin/env node

/**
 * Configuración de branches de base de datos para Neon
 * Actualiza este archivo con tus URLs reales de Neon
 */

export const dbConfig = {
  // URLs de conexión reales de Neon
  production: {
    DATABASE_URL: "postgresql://apex_owner:npg_idQR6OE7SVkI@ep-yellow-truth-acv73fs3.sa-east-1.aws.neon.tech/apex?sslmode=require",
    DIRECT_URL: "postgresql://apex_owner:npg_idQR6OE7SVkI@ep-yellow-truth-acv73fs3.sa-east-1.aws.neon.tech/apex?sslmode=require",
    branch: "production",
    branchId: "br-withered-pine-acicklii",
    projectId: "aged-term-74077078"
  },
  
  development: {
    DATABASE_URL: "postgresql://apex_owner:npg_idQR6OE7SVkI@ep-yellow-truth-acv73fs3.sa-east-1.aws.neon.tech/apex?sslmode=require", 
    DIRECT_URL: "postgresql://apex_owner:npg_idQR6OE7SVkI@ep-yellow-truth-acv73fs3.sa-east-1.aws.neon.tech/apex?sslmode=require",
    branch: "development", 
    branchId: "br-yellow-lake-ac8l5zz9",
    projectId: "aged-term-74077078"
  }
};

export const environments = {
  production: {
    ...dbConfig.production,
    envFile: '.env.production',
    description: 'Base de datos de producción - datos reales'
  },
  
  development: {
    ...dbConfig.development, 
    envFile: '.env.local',
    description: 'Base de datos de desarrollo - datos de prueba'
  }
};

// Variables de entorno adicionales por ambiente
export const envConfig = {
  development: {
    NODE_ENV: 'development',
    NEXT_PUBLIC_ENV: 'development',
    // Agregar más variables específicas de desarrollo aquí
  },
  
  production: {
    NODE_ENV: 'production', 
    NEXT_PUBLIC_ENV: 'production',
    // Agregar más variables específicas de producción aquí
  }
};

// Helper para obtener configuración
export function getBranchConfig(branch) {
  const config = dbConfig[branch];
  if (!config) {
    throw new Error(`Branch '${branch}' no encontrada. Branches disponibles: ${Object.keys(dbConfig).join(', ')}`);
  }
  return config;
}

// Helper para obtener variables de entorno
export function getEnvConfig(branch) {
  return envConfig[branch] || {};
} 