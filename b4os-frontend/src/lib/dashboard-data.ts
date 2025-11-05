import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import type { StudentReviewer } from './supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface LeaderboardEntry {
  github_username: string
  total_score: number
  total_possible: number
  percentage: number
  assignments_completed: number
  resolution_time_hours?: number | null
  has_fork?: boolean
}

export interface DashboardData {
  leaderboard: Array<{
    github_username: string
    total_score: number
    total_possible: number
    percentage: number
    assignments_completed: number
    resolution_time_hours?: number
    has_fork?: boolean
  }>
  allGrades: Array<{ github_username: string; assignment_name: string; points_awarded: number | null }>
  assignments: Array<{
    id: number
    name: string
    points_available: number | null
    updated_at: string
  }>
  stats: {
    totalStudents: number
    totalAssignments: number
    totalGrades: number
    avgScore: number
    completionRate: number
  }
  reviewersGrouped: Record<string, StudentReviewer[]>
  allGrades: Array<{ github_username: string; assignment_name: string; points_awarded: number | null }>
}

export async function getDashboardData(): Promise<DashboardData> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error('Unauthorized')
  }

  const userRole = session.user?.role
  const isAdminOrInstructor = userRole === 'admin' || userRole === 'instructor'

  // Get leaderboard
  const leaderboard = isAdminOrInstructor 
    ? await getLeaderboard() 
    : await getAnonymizedLeaderboard(session.user?.username)

  // Get other data in parallel
  const [assignments, stats, reviewersGrouped, allGrades] = await Promise.all([
    getAssignments(),
    getStudentStats(leaderboard),
    isAdminOrInstructor ? getAllStudentReviewersGrouped() : Promise.resolve({}),
    getGrades()
  ])

  return {
    leaderboard,
    assignments,
    stats,
    reviewersGrouped,
    allGrades
  }
}

async function getLeaderboard() {
  try {
    const { data: allStudents } = await supabase
      .from('students')
      .select('github_username')

    const { data: adminData } = await supabase
      .from('admin_leaderboard')
      .select('*')
      .limit(1000)
      .order('ranking_position')

    if (adminData && adminData.length > 0) {
      const leaderboardMap = new Map(
        adminData.map(student => [student.github_username, {
          github_username: student.github_username,
          total_score: student.total_score,
          total_possible: student.total_possible,
          percentage: student.percentage,
          assignments_completed: student.assignments_completed,
          resolution_time_hours: student.resolution_time_hours || undefined,
          has_fork: !!student.has_fork
        }])
      )

      if (allStudents) {
        allStudents.forEach(student => {
          if (!leaderboardMap.has(student.github_username)) {
            leaderboardMap.set(student.github_username, {
              github_username: student.github_username,
              total_score: 0,
              total_possible: 0,
              percentage: 0,
              assignments_completed: 0,
              has_fork: false
            })
          }
        })
      }

      return Array.from(leaderboardMap.values())
    }

    // Fallback to consolidated_grades
    const { data: gradesData } = await supabase
      .from('consolidated_grades')
      .select('*')

    if (!gradesData || gradesData.length === 0) {
      return []
    }

    const { data: gradesWithFork } = await supabase
      .from('grades')
      .select('github_username, assignment_name, fork_created_at')

    const acceptedAssignments = new Map<string, Set<string>>()
    gradesWithFork?.forEach(grade => {
      if (grade.fork_created_at) {
        if (!acceptedAssignments.has(grade.github_username)) {
          acceptedAssignments.set(grade.github_username, new Set())
        }
        acceptedAssignments.get(grade.github_username)!.add(grade.assignment_name)
      }
    })

    const studentMap = new Map()
    gradesData.forEach(grade => {
      const username = grade.github_username
      if (!studentMap.has(username)) {
        studentMap.set(username, {
          github_username: username,
          total_score: 0,
          total_possible: 0,
          assignments_completed: 0,
          grades: []
        })
      }

      const student = studentMap.get(username)
      student.total_score += grade.points_awarded || 0
      student.total_possible += grade.points_available || 0
      student.grades.push(grade)
    })

    const leaderboard = Array.from(studentMap.values()).map(student => ({
      github_username: student.github_username,
      total_score: student.total_score,
      total_possible: student.total_possible,
      percentage: student.total_possible > 0
        ? Math.round((student.total_score / student.total_possible) * 100)
        : 0,
      assignments_completed: acceptedAssignments.get(student.github_username)?.size || 0
    }))

    if (allStudents) {
      const existingUsernames = new Set(leaderboard.map(s => s.github_username))
      allStudents.forEach(student => {
        if (!existingUsernames.has(student.github_username)) {
          leaderboard.push({
            github_username: student.github_username,
            total_score: 0,
            total_possible: 0,
            percentage: 0,
            assignments_completed: 0
          })
        }
      })
    }

    return leaderboard.sort((a, b) => b.percentage - a.percentage)
  } catch (error) {
    console.error('Error in getLeaderboard:', error)
    return []
  }
}

async function getAnonymizedLeaderboard(currentUsername?: string) {
  try {
    const fullLeaderboard = await getLeaderboard()
    
    if (!currentUsername) {
      return []
    }
    
    const userData = fullLeaderboard.find(s => s.github_username === currentUsername)
    
    if (!userData) {
      return []
    }
    
    return [userData]
  } catch (error) {
    console.error('Error in getAnonymizedLeaderboard:', error)
    return []
  }
}

async function getAssignments() {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, name, points_available, updated_at')
      .order('name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error in getAssignments:', error)
    return []
  }
}

async function getStudentStats(leaderboard: LeaderboardEntry[]) {
  try {
    const { data: statsData, error: statsError } = await supabase
      .from('dashboard_stats')
      .select('*')
      .single()

    if (!statsError && statsData) {
      return {
        totalStudents: statsData.total_students,
        totalAssignments: statsData.total_assignments,
        totalGrades: statsData.total_grades,
        avgScore: statsData.avg_score,
        completionRate: statsData.completion_rate
      }
    }

    // Fallback
    const [assignmentsResult, gradesResult] = await Promise.all([
      supabase.from('assignments').select('id'),
      supabase.from('grades').select('points_awarded, github_username')
    ])

    const assignments = assignmentsResult
    const grades = gradesResult

    const totalStudents = leaderboard.length > 0 
      ? leaderboard.length 
      : (grades.data ? new Set(grades.data.map(g => g.github_username)).size : 0)
    
    const totalAssignments = assignments.data?.length || 0
    const totalGrades = grades.data?.length || 0

    const validGrades = grades.data?.filter(g => g.points_awarded !== null && g.points_awarded > 0) || []
    
    const avgScore = validGrades.length > 0
      ? Math.round(validGrades.reduce((sum, g) => sum + (g.points_awarded || 0), 0) / validGrades.length)
      : 0

    const completionRate = totalStudents > 0 && totalAssignments > 0
      ? Math.round((validGrades.length / (totalStudents * totalAssignments)) * 100)
      : 0

    return {
      totalStudents,
      totalAssignments,
      totalGrades,
      avgScore,
      completionRate
    }
  } catch (error) {
    console.error('Error in getStudentStats:', error)
    return {
      totalStudents: 0,
      totalAssignments: 0,
      totalGrades: 0,
      avgScore: 0,
      completionRate: 0
    }
  }
}

async function getAllStudentReviewersGrouped() {
  try {
    const { data, error } = await supabase
      .from('student_reviewers')
      .select('*')
      .order('student_username')
      .order('created_at', { ascending: false })

    if (error) {
      return {}
    }

    const reviewerMap: Record<string, StudentReviewer[]> = {}
    data?.forEach(reviewer => {
      const username = reviewer.student_username
      if (!reviewerMap[username]) {
        reviewerMap[username] = []
      }
      reviewerMap[username].push(reviewer)
    })

    return reviewerMap
  } catch (error) {
    console.error('Error in getAllStudentReviewersGrouped:', error)
    return {}
  }
}

async function getGrades() {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select('github_username, assignment_name, points_awarded')
      .order('github_username')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching grades:', error)
    return []
  }
}

