import GithubProvider from 'next-auth/providers/github'
import { AuthorizationService } from './authorization'
import { type UserRole } from '@/types/common'
import { logger } from '@/lib/logger'

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email'
        }
      }
    }),
  ],
  // Configuración para debug
  debug: true,
  logger: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: (code: any, metadata: any) => {
      logger.error('NextAuth Error', { code, metadata })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn: (code: any) => {
      logger.warn('NextAuth Warning', { code })
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug: (code: any, metadata: any) => {
      logger.debug('NextAuth Debug', { code, metadata })
    }
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ account, profile }: any) {
      try {
        console.log(`[AUTH DEBUG] SignIn attempt for provider: ${account?.provider}`)
        if (account?.provider === 'github') {
          console.log(`[AUTH DEBUG] GitHub login for user: ${profile?.login} (ID: ${profile?.id})`)
        }
        return true
      } catch (error) {
        console.error('[AUTH ERROR] SignIn callback error:', error)
        return false
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, profile }: any) {
      try {
        // En el primer login (account existe)
        if (account) {
          token.accessToken = account.access_token
          token.githubId = (profile as { id?: string })?.id
          token.username = (profile as { login?: string })?.login

          // Temporalmente asignar rol admin sin verificación para debugging
          console.log(`[JWT DEBUG] First login for user: ${token.username} (ID: ${token.githubId})`)
          token.role = 'admin' as UserRole
          token.isAuthorized = true
          token.lastValidated = Date.now()
          console.log(`[JWT DEBUG] Token created successfully for user: ${token.username}`)
        } else {
          // Temporalmente no revalidar para debugging
          console.log(`[JWT DEBUG] Subsequent request for user: ${token.username}`)
        }
        return token
      } catch (error) {
        console.error('[AUTH ERROR] JWT callback error:', error)
        return token
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      try {
        // Send properties to the client
        if (session.user) {
          session.user.githubId = token.githubId
          session.user.username = token.username
          session.user.role = token.role as UserRole
          session.user.isAuthorized = token.isAuthorized
          session.accessToken = token.accessToken
        }
        return session
      } catch (error) {
        console.error('[AUTH ERROR] Session callback error:', error)
        return session
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  // Configuración de cookies 
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      }
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900, // 15 minutos
      }
    }
  },
}
