// NextAuth type definitions
import type { UserRole } from '@/types/common'

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      githubId?: string
      username?: string
      role?: UserRole
      isAuthorized?: boolean
    }
    // accessToken is intentionally NOT exposed to the client for security
    // It remains only in the server-side JWT token
  }

  interface User {
    githubId?: string
    username?: string
    role?: UserRole
    isAuthorized?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string
    username?: string
    accessToken?: string
    role?: UserRole
    isAuthorized?: boolean
  }
}
