import { betterAuth, BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from './lib/prisma';
import { sendEmail } from './actions/email';
import { openAPI, admin } from 'better-auth/plugins'

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "mongodb"
    }
    ),
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60 // Cache duration in seconds
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
    plugins: [openAPI(), admin()],
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