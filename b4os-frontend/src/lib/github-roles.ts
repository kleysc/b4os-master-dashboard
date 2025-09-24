// GitHub Teams role management

import { type UserRole } from '@/types/common'
import { logger } from '@/lib/logger'

// Team mapping configuration - customize these team names
const ROLE_TEAM_MAPPING: Record<string, UserRole> = {
  // Admin teams
  'admins': 'admin',
  'administrators': 'admin',
  'b4os-admins': 'admin',

  // Instructor teams
  'instructors': 'instructor',
  'teachers': 'instructor',
  'b4os-instructors': 'instructor',

  // Student teams (any other team defaults to student)
  // Teams like: galileo, Newton, Tesla, Watson from your screenshot
}

// Hardcoded admin users for testing
const ADMIN_USERS = ['kleysc']

export async function getUserRoleFromGitHubTeams(
  accessToken: string,
  orgName: string = 'B4OS-Dev'
): Promise<UserRole> {
  try {
    // First fetch user info to check hardcoded admins
    const userResponse = await fetch(`https://api.github.com/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (userResponse.ok) {
      const userInfo = await userResponse.json()
      const username = userInfo.login

      // Check hardcoded admin users
      if (ADMIN_USERS.includes(username)) {
        logger.debug(`User ${username} is hardcoded admin`)
        return 'admin'
      }
    }

    // Fetch user's teams from the organization
    const response = await fetch(`https://api.github.com/user/teams`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!response.ok) {
      logger.warn('Failed to fetch user teams, defaulting to student role')
      return 'student'
    }

    const teams = await response.json()

    // Filter teams for the specific organization
    const orgTeams = teams.filter((team: { organization?: { login?: string } }) =>
      team.organization?.login?.toLowerCase() === orgName.toLowerCase()
    )

    logger.debug('User teams in organization:', orgTeams.map((t: { name: string }) => t.name))

    // Check team membership for role assignment
    for (const team of orgTeams) {
      const teamName = team.name.toLowerCase()
      const role = ROLE_TEAM_MAPPING[teamName]

      if (role) {
        logger.debug(`User assigned role '${role}' from team '${team.name}'`)
        return role
      }
    }

    // If user is in any team but no specific role mapping, they're a student
    if (orgTeams.length > 0) {
      logger.debug('User is in teams but no role mapping found, defaulting to student')
      return 'student'
    }

    // If no teams found, default to student
    logger.debug('No teams found for user, defaulting to student')
    return 'student'

  } catch (error) {
    logger.error('Error fetching user teams:', error)
    return 'student' // Safe default
  }
}

export async function checkUserTeamMembership(
  accessToken: string,
  orgName: string,
  teamSlug: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.github.com/orgs/${orgName}/teams/${teamSlug}/memberships/user`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    return response.ok
  } catch (error) {
    logger.error('Error checking team membership:', error)
    return false
  }
}

// Helper to check if user has admin privileges
export function isAdmin(role?: UserRole): boolean {
  return role === 'admin'
}

// Helper to check if user has instructor privileges or higher
export function isInstructorOrHigher(role?: UserRole): boolean {
  return role === 'admin' || role === 'instructor'
}

// Helper to get role display name
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator'
    case 'instructor':
      return 'Instructor'
    case 'student':
      return 'Student'
    default:
      return 'Student'
  }
}