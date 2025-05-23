import { PrismaClient, Prisma } from "@prisma/client";

const prismaClientSingleton = () => {
  const prisma = new PrismaClient({
    // 🚀 OPTIMIZACIONES DE THROUGHPUT - DATABASE
    log: process.env.NODE_ENV === 'development' ? ["warn", "error"] : [],
    
    // Connection pooling optimizado para throughput
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    
    // Configuración optimizada
    errorFormat: 'minimal',
    
    // Optimizar para performance
    transactionOptions: {
      maxWait: 5000,      // Tiempo máximo de espera: 5s
      timeout: 10000,     // Timeout de transacción: 10s
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    },
  });

  // 🚀 Middleware optimizado para throughput
  prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
    const start = performance.now();
    
    try {
      const result = await next(params);
      
      // Solo logging en desarrollo para queries lentas
      if (process.env.NODE_ENV === 'development') {
        const duration = performance.now() - start;
        if (duration > 100) { // Solo queries > 100ms
          console.log(`🐌 Slow Query: ${params.model}.${params.action} - ${duration.toFixed(2)}ms`);
        }
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`❌ DB Error: ${params.model}.${params.action} - ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  });

  return prisma;
};

// biome-ignore lint/suspicious/noShadowRestrictedNames: Prisma singleton pattern
declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
