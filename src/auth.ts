import { betterAuth, BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from './lib/prisma';
import { sendEmail } from './actions/auth/email';
import { openAPI, admin, organization } from 'better-auth/plugins'
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }
    ),
    session: {
        expiresIn: 60 * 60 * 24 * 7, 
        updateAge: 60 * 60 * 24,
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60 
        }
    },
   
    user: {
        additionalFields: {
            premium: {
                type: "boolean",
                required: false,
            },
        },
    },
    plugins: [openAPI(), admin({
        adminRole: ["admin", "root"]
    }), nextCookies(), jwt(), organization()],
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            await sendEmail({
                to: user.email,
                subject: "Resetear el password",
                text: `dirigete a esta url ${url}`
            })
        }
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, token }) => {
            const verificationUrl = `${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=${token}&callbackURL=${process.env.EMAIL_VERIFICATION_CALLBACK_URL}`;
            await sendEmail({
                to: user.email,
                subject: "Verificar direccion de mail",
                text: `Click en el link para verificar la url: ${verificationUrl}`
            })
        }
    }
} satisfies BetterAuthOptions)

export type Session = typeof auth.$Infer.Session;
export type Organization = typeof auth.$Infer.Organization;