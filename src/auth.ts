import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, openAPI, organization } from "better-auth/plugins";
import { jwt } from "better-auth/plugins";
import { sendEmail } from "./actions/auth/email";
import prisma from "./lib/prisma";

// Helper para determinar la URL base
function getBaseUrl() {
  // En producción, usar variables de entorno específicas
  if (process.env.NODE_ENV === 'production') {
    return process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
  }
  // En desarrollo, usar localhost
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// Configurar orígenes confiables de manera más robusta
function getTrustedOrigins() {
  const origins = [
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  // Agregar URLs de producción
  if (process.env.BETTER_AUTH_URL) {
    origins.push(process.env.BETTER_AUTH_URL);
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Para Vercel, agregar wildcards y URL específica
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  // Wildcards para todos los dominios de Vercel
  origins.push("https://*.vercel.app");

  // Eliminar duplicados y valores undefined/null
  return [...new Set(origins.filter(Boolean))];
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: getBaseUrl(),
  
  trustedOrigins: getTrustedOrigins(),
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // 1 día
    cookieCache: {
      enabled: true,
      maxAge: 10 * 60, // 10 minutos
    },
  },

  user: {
    additionalFields: {
      organizationId: { type: "string", required: false },
      profileOriginal: { type: "string", required: false },
      profileCrop: { type: "string", required: false },
    },
  },

  plugins: [
    openAPI(),
    admin({
      adminRoles: ["admin", "root"],
    }),
    nextCookies(),
    jwt({
      jwt: {
        definePayload: async ({ user }) => {
          const org = user?.organizationId
            ? await prisma.organization.findUnique({
                where: { id: user?.organizationId },
                select: { id: true, name: true, slug: true, logo: true },
              })
            : null;
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: org?.name,
            organization: org,
          };
        },
      },
    }),
  ],
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // TEMPORALMENTE DESHABILITADO para debugging
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Resetear el password",
        text: `dirigete a esta url ${url}`,
      });
    },
  },
  
  emailVerification: {
    sendOnSignUp: false, // TEMPORALMENTE DESHABILITADO
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      const baseUrl = getBaseUrl();
      const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}&callbackURL=${baseUrl}/dashboard`;
      await sendEmail({
        to: user.email,
        subject: "Verificar direccion de mail",
        text: `Click en el link para verificar la url: ${verificationUrl}`,
      });
    },
  },

  // Configuración adicional para debugging en producción
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    disabled: false,
  },

  // Rate limiting más estricto en producción
  rateLimit: {
    window: 60, // 1 minuto
    max: process.env.NODE_ENV === 'production' ? 10 : 100, // Más estricto en producción
  },

} satisfies BetterAuthOptions);

export type Session = typeof auth.$Infer.Session;

// Log de configuración para debugging
if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
  console.log('🔐 [AUTH CONFIG] Configuración de autenticación:', {
    baseURL: getBaseUrl(),
    trustedOrigins: getTrustedOrigins(),
    nodeEnv: process.env.NODE_ENV,
    hasSecret: !!process.env.BETTER_AUTH_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  });
}