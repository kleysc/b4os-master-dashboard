import { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ account, profile }) {
      console.log('[SIMPLE AUTH] SignIn callback called', { 
        provider: account?.provider, 
        user: profile?.login 
      })
      return true
    },
    async jwt({ token, account, profile }) {
      console.log('[SIMPLE AUTH] JWT callback called', { 
        hasAccount: !!account, 
        user: token?.name 
      })
      
      if (account) {
        token.role = 'admin'
        token.username = profile?.login
        console.log('[SIMPLE AUTH] Token created for:', token.username)
      }
      return token
    },
    async session({ session, token }) {
      console.log('[SIMPLE AUTH] Session callback called for:', token?.username)
      session.user.role = token.role
      session.user.username = token.username
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: true,
  session: {
    strategy: 'jwt',
  },
}
