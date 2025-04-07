import { PrismaClient, Prisma } from '@prisma/client';

const prismaClientSingleton = () => {
  const prisma = new PrismaClient({
   // log: ['query', 'info', 'warn', 'error']
   log: ['warn', 'error']
  });

  prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
    const user = params.args?.context?.user || 'anon';
   /*  console.log(`[DB] User: ${user} | Model: ${params.model} | Action: ${params.action}`);
    console.log(`[DB] Args: ${JSON.stringify(params.args)}`); */
    const start = Date.now();
    const result = await next(params);
/*     console.log(`[DB] Duration: ${Date.now() - start}ms`);
 */    return result;
  });

  return prisma;
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
