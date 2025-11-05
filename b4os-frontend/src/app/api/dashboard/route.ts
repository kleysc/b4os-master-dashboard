import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Use service role key for server-side operations (bypasses RLS)
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

export async function GET() {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role - only admins and instructors can see full leaderboard
    const userRole = session.user?.role
    const isAdminOrInstructor = userRole === 'admin' || userRole === 'instructor'

    // Verify Supabase client is initialized
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseServiceKey
      })
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get leaderboard first as we need it for stats calculation
    // Only admins/instructors get full leaderboard, students get filtered/anonymized data
    const leaderboardResult = await Promise.allSettled([
      isAdminOrInstructor ? getLeaderboard() : getAnonymizedLeaderboard(session.user?.username)
    ])
    const leaderboard = leaderboardResult[0].status === 'fulfilled' ? leaderboardResult[0].value : []
    
    if (leaderboardResult[0].status === 'rejected') {
      console.error('Failed to fetch leaderboard:', leaderboardResult[0].reason)
    }
    
    // Get remaining data in parallel
    const results = await Promise.allSettled([
      getAssignments(),
      getStudentStats(leaderboard), // Pass leaderboard to stats calculation
      isAdminOrInstructor ? getAllStudentReviewersGrouped() : Promise.resolve(new Map())
    ])

    // Check for any failures
    const failed = results.find(r => r.status === 'rejected')
    if (failed && failed.status === 'rejected') {
      console.error('Dashboard data fetch failed:', failed.reason)
      return NextResponse.json(
        { 
          error: 'Failed to fetch dashboard data',
          details: failed.reason?.message || String(failed.reason)
        },
        { status: 500 }
      )
    }

    const [assignmentsData, statsData, reviewersData] = results.map(r => 
      r.status === 'fulfilled' ? r.value : []
    )

    return NextResponse.json({
      leaderboard: leaderboard || [],
      assignments: assignmentsData || [],
      stats: statsData || {
        totalStudents: 0,
        totalAssignments: 0,
        totalGrades: 0,
        avgScore: 0,
        completionRate: 0
      },
      reviewersGrouped: reviewersData ? Object.fromEntries(reviewersData) : {}
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}

async function getLeaderboard() {
  try {
    const { data: allStudents, error: studentsError } = await supabase
      .from('students')
      .select('github_username')

    if (studentsError) {
      console.warn('Error fetching students:', studentsError)
    }

    const { data: adminData, error: adminError } = await supabase
      .from('admin_leaderboard')
      .select('*')
      .limit(1000)
      .order('ranking_position')

    if (adminError) {
      console.warn('Admin leaderboard not available, using fallback:', adminError.message)
    }

    if (adminData && adminData.length > 0) {
      const leaderboardMap = new Map(
        adminData.map(student => [student.github_username, {
          github_username: student.github_username,
          total_score: student.total_score,
          total_possible: student.total_possible,
          percentage: student.percentage,
          assignments_completed: student.assignments_completed,
          // Only include resolution_time if it exists and is meaningful
          resolution_time_hours: student.resolution_time_hours || undefined,
          // Only include has_fork flag (boolean, not full timestamp)
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
    const { data: gradesData, error: gradesError } = await supabase
      .from('consolidated_grades')
      .select('*')

    if (gradesError) {
      console.warn('Error fetching consolidated_grades:', gradesError)
      return []
    }

    if (!gradesData || gradesData.length === 0) {
      return []
    }

    const { data: gradesWithFork, error: forkError } = await supabase
      .from('grades')
      .select('github_username, assignment_name, fork_created_at')

    if (forkError) {
      console.warn('Error fetching fork data:', forkError)
    }

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
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to get leaderboard: ${errorMessage}`)
  }
}

async function getAssignments() {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('id, name, points_available, updated_at')
      .order('name')

    if (error) {
      console.error('Error fetching assignments:', error)
      throw error
    }
    return data || []
  } catch (error) {
    console.error('Error in getAssignments:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to get assignments: ${errorMessage}`)
  }
}

async function getStudentStats(leaderboard: LeaderboardEntry[] = []) {
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

    // Fallback: Calculate from actual data
    const [assignmentsResult, gradesResult] = await Promise.all([
      supabase.from('assignments').select('id'),
      supabase.from('grades').select('points_awarded, github_username')
    ])

    const assignments = assignmentsResult
    const grades = gradesResult

    // Count students from leaderboard (more accurate) or from grades
    const totalStudents = leaderboard.length > 0 
      ? leaderboard.length 
      : (grades.data ? new Set(grades.data.map(g => g.github_username)).size : 0)
    
    const totalAssignments = assignments.data?.length || 0
    const totalGrades = grades.data?.length || 0

    const validGrades = grades.data?.filter(g => g.points_awarded !== null && g.points_awarded > 0) || []
    
    // Calculate average score from valid grades
    const avgScore = validGrades.length > 0
      ? Math.round(validGrades.reduce((sum, g) => sum + (g.points_awarded || 0), 0) / validGrades.length)
      : 0

    // Calculate completion rate: students with at least one grade / total students
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to get student stats: ${errorMessage}`)
  }
}

// Get anonymized leaderboard for students (only their own data + aggregated stats)
async function getAnonymizedLeaderboard(currentUsername?: string) {
  try {
    // Students can only see:
    // 1. Their own data (if they're in the leaderboard)
    // 2. Aggregated statistics (no individual scores)
    
    const fullLeaderboard = await getLeaderboard()
    
    if (!currentUsername) {
      // If no username, return empty array
      return []
    }
    
    // Find the current user's data
    const userData = fullLeaderboard.find(s => s.github_username === currentUsername)
    
    if (!userData) {
      // User not in leaderboard, return empty
      return []
    }
    
    // Return only the current user's data
    return [userData]
  } catch (error) {
    console.error('Error in getAnonymizedLeaderboard:', error)
    return []
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
      console.error('Error fetching student reviewers:', error)
      // Return empty map if table doesn't exist or error occurs
      return new Map()
    }

    const reviewerMap = new Map()
    data?.forEach(reviewer => {
      const username = reviewer.student_username
      if (!reviewerMap.has(username)) {
        reviewerMap.set(username, [])
      }
      reviewerMap.get(username).push(reviewer)
    })

    return reviewerMap
  } catch (error) {
    console.error('Error in getAllStudentReviewersGrouped:', error)
    // Return empty map instead of throwing to prevent dashboard from failing
    return new Map()
  }
}

