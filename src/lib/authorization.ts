import { supabase } from './supabase'
import { logger } from './logger'

export interface AuthorizedUser {
  id: string
  github_id: number
  github_username: string
  email?: string
  full_name?: string
  role: 'admin' | 'instructor' | 'student'
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  updated_at: string
  last_login?: string
  notes?: string
}

export interface AuthorizationResult {
  isAuthorized: boolean
  user?: AuthorizedUser
  role?: string
  error?: string
}

export class AuthorizationService {
  /**
   * Verifica si un usuario de GitHub está autorizado para acceder al dashboard
   */
  static async checkUserAuthorization(githubId: number): Promise<AuthorizationResult> {
    try {
      logger.info(`Checking authorization for GitHub user ID: ${githubId}`)

      const { data, error } = await supabase
        .from('authorized_users')
        .select('*')
        .eq('github_id', githubId)
        .eq('status', 'active')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró el usuario
          logger.warn(`User with GitHub ID ${githubId} not found in authorized users`)
          return {
            isAuthorized: false,
            error: 'Usuario no autorizado'
          }
        }
        
        logger.error('Error checking user authorization:', error)
        return {
          isAuthorized: false,
          error: 'Error verificando autorización'
        }
      }

      if (!data) {
        logger.warn(`User with GitHub ID ${githubId} not authorized`)
        return {
          isAuthorized: false,
          error: 'Usuario no autorizado'
        }
      }

      // Actualizar último login
      await this.updateLastLogin(githubId)

      logger.info(`User ${data.github_username} authorized with role: ${data.role}`)
      
      return {
        isAuthorized: true,
        user: data as AuthorizedUser,
        role: data.role
      }

    } catch (error) {
      logger.error('Error in checkUserAuthorization:', error)
      return {
        isAuthorized: false,
        error: 'Error interno del servidor'
      }
    }
  }

  /**
   * Verifica autorización por username de GitHub
   */
  static async checkUserAuthorizationByUsername(githubUsername: string): Promise<AuthorizationResult> {
    try {
      logger.info(`Checking authorization for GitHub username: ${githubUsername}`)

      const { data, error } = await supabase
        .from('authorized_users')
        .select('*')
        .eq('github_username', githubUsername)
        .eq('status', 'active')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          logger.warn(`User with GitHub username ${githubUsername} not found in authorized users`)
          return {
            isAuthorized: false,
            error: 'Usuario no autorizado'
          }
        }
        
        logger.error('Error checking user authorization by username:', error)
        return {
          isAuthorized: false,
          error: 'Error verificando autorización'
        }
      }

      if (!data) {
        logger.warn(`User with GitHub username ${githubUsername} not authorized`)
        return {
          isAuthorized: false,
          error: 'Usuario no autorizado'
        }
      }

      // Actualizar último login
      await this.updateLastLogin(data.github_id)

      logger.info(`User ${data.github_username} authorized with role: ${data.role}`)
      
      return {
        isAuthorized: true,
        user: data as AuthorizedUser,
        role: data.role
      }

    } catch (error) {
      logger.error('Error in checkUserAuthorizationByUsername:', error)
      return {
        isAuthorized: false,
        error: 'Error interno del servidor'
      }
    }
  }

  /**
   * Actualiza el último login del usuario
   */
  static async updateLastLogin(githubId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('authorized_users')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('github_id', githubId)

      if (error) {
        logger.error('Error updating last login:', error)
      }
    } catch (error) {
      logger.error('Error in updateLastLogin:', error)
    }
  }

  /**
   * Obtiene estadísticas de usuarios autorizados
   */
  static async getAuthorizationStats() {
    try {
      const { data, error } = await supabase
        .from('authorized_users_stats')
        .select('*')
        .single()

      if (error) {
        logger.error('Error getting authorization stats:', error)
        return null
      }

      return data
    } catch (error) {
      logger.error('Error in getAuthorizationStats:', error)
      return null
    }
  }

  /**
   * Obtiene todos los usuarios autorizados (solo para admins)
   */
  static async getAllAuthorizedUsers(): Promise<AuthorizedUser[]> {
    try {
      const { data, error } = await supabase
        .from('authorized_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        logger.error('Error getting all authorized users:', error)
        return []
      }

      return data as AuthorizedUser[]
    } catch (error) {
      logger.error('Error in getAllAuthorizedUsers:', error)
      return []
    }
  }

  /**
   * Agrega un nuevo usuario autorizado (solo para admins)
   */
  static async addAuthorizedUser(userData: {
    github_id: number
    github_username: string
    email?: string
    full_name?: string
    role: 'admin' | 'instructor' | 'student'
    notes?: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('authorized_users')
        .insert([userData])

      if (error) {
        logger.error('Error adding authorized user:', error)
        return {
          success: false,
          error: error.message
        }
      }

      logger.info(`Added authorized user: ${userData.github_username}`)
      return { success: true }
    } catch (error) {
      logger.error('Error in addAuthorizedUser:', error)
      return {
        success: false,
        error: 'Error interno del servidor'
      }
    }
  }

  /**
   * Actualiza el estado de un usuario autorizado (solo para admins)
   */
  static async updateUserStatus(
    githubId: number, 
    status: 'active' | 'inactive' | 'pending'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('authorized_users')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('github_id', githubId)

      if (error) {
        logger.error('Error updating user status:', error)
        return {
          success: false,
          error: error.message
        }
      }

      logger.info(`Updated user status for GitHub ID ${githubId} to ${status}`)
      return { success: true }
    } catch (error) {
      logger.error('Error in updateUserStatus:', error)
      return {
        success: false,
        error: 'Error interno del servidor'
      }
    }
  }
}
