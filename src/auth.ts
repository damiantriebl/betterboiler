import { type BetterAuthOptions, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, openAPI, organization } from "better-auth/plugins";
import { jwt } from "better-auth/plugins";
import { sendEmail } from "./actions/auth/email";
import prisma from "./lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
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
      adminRole: ["admin", "root"],
    }),
    nextCookies(),
    jwt({
      jwt: {
        definePayload: async (user) => {
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
            organizationName: user.organizationName,
            organization: org,
          };
        },
      },
    }),
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Resetear el password",
        text: `dirigete a esta url ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      const verificationUrl = `${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=${token}&callbackURL=${process.env.EMAIL_VERIFICATION_CALLBACK_URL}`;
      await sendEmail({
        to: user.email,
        subject: "Verificar direccion de mail",
        text: `Click en el link para verificar la url: ${verificationUrl}`,
      });
    },
  },
} satisfies BetterAuthOptions);

export type Session = typeof auth.$Infer.Session;
