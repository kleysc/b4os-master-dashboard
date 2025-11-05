import GithubProvider from 'next-auth/providers/github'
import { AuthorizationService } from './authorization'
import { type UserRole } from '@/types/common'
import { logger } from '@/lib/logger'

export const authOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
  // Configuración para producción
  debug: process.env.NODE_ENV === 'development',
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
      // Solo verificar para GitHub OAuth
      if (account.provider === 'github') {
        try {
          // Bypass para admin inicial en desarrollo
          const initialAdmin = process.env.INITIAL_ADMIN_USERNAME
          if (process.env.NODE_ENV === 'development' && profile.login === initialAdmin) {
            logger.info(`Development bypass: Admin user ${profile.login} allowed`)
            return true
          }

          const githubId = parseInt(profile.id || '0')
          const authResult = await AuthorizationService.checkUserAuthorization(githubId)

          if (!authResult.isAuthorized) {
            logger.warn(`Unauthorized access attempt by GitHub user: ${profile.login} (ID: ${githubId})`)
            return false // Esto impedirá el login
          }

          logger.info(`User ${profile.login} pre-authorized successfully`)
          return true
        } catch (error) {
          logger.error('Error checking user authorization during signIn:', error)

          // En desarrollo, permitir admin inicial si hay error de DB
          const initialAdmin = process.env.INITIAL_ADMIN_USERNAME
          if (process.env.NODE_ENV === 'development' && profile.login === initialAdmin) {
            logger.info(`Development bypass: Admin user ${profile.login} allowed due to DB error`)
            return true
          }
          return false
        }
      }
      return true
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, profile }: any) {
      // En el primer login (account existe)
      if (account) {
        token.accessToken = account.access_token
        token.githubId = (profile as { id?: string })?.id
        token.username = (profile as { login?: string })?.login

        // Verificar autorización en base de datos
        try {
          const githubId = parseInt((profile as { id?: string })?.id || '0')
          const authResult = await AuthorizationService.checkUserAuthorization(githubId)

          if (!authResult.isAuthorized) {
            logger.warn(`Unauthorized access attempt by GitHub user: ${token.username} (ID: ${githubId})`)
            throw new Error('Usuario no autorizado')
          }

          token.role = authResult.role as UserRole
          token.isAuthorized = true
          token.lastValidated = Date.now()
          logger.info(`User ${token.username} authorized with role: ${token.role}`)
        } catch (error) {
          logger.error('Error checking user authorization', error)
          throw new Error('Usuario no autorizado para acceder al sistema')
        }
      } else {
        // En requests subsecuentes, revalidar cada 5 minutos
        const lastValidated = token.lastValidated as number || 0
        const fiveMinutes = 5 * 60 * 1000

        if (Date.now() - lastValidated > fiveMinutes) {
          try {
            const githubId = parseInt(token.githubId as string || '0')
            const authResult = await AuthorizationService.checkUserAuthorization(githubId)

            if (!authResult.isAuthorized) {
              logger.warn(`User ${token.username} authorization revoked`)
              throw new Error('Usuario no autorizado')
            }

            // Actualizar rol por si cambió
            token.role = authResult.role as UserRole
            token.lastValidated = Date.now()
            logger.info(`User ${token.username} revalidated successfully`)
          } catch (error) {
            logger.error('Error revalidating user authorization', error)
            throw new Error('Usuario no autorizado para acceder al sistema')
          }
        }
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      // Send properties to the client
      // NOTE: accessToken is NOT sent to client for security reasons
      // It remains only in the server-side JWT token
      if (session.user) {
        session.user.githubId = token.githubId
        session.user.username = token.username
        session.user.role = token.role as UserRole
        session.user.isAuthorized = token.isAuthorized
        // accessToken is intentionally NOT included here - it stays server-side only
      }
      return session
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
    }
  },
}
