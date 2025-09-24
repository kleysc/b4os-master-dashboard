import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for GitHub Classroom data
export interface Student {
  id: number
  github_username: string
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: number
  name: string
  points_available: number | null
  created_at: string
  updated_at: string
}

export interface Grade {
  id: number
  github_username: string
  assignment_name: string
  points_awarded: number | null
  created_at: string
  updated_at: string
}

export interface ConsolidatedGrade {
  github_username: string
  assignment_name: string
  points_awarded: number | null
  points_available: number | null
  percentage: number | null
}

export interface StudentReviewer {
  id: number
  student_username: string
  reviewer_username: string
  assignment_name: string
  status: 'pending' | 'in_progress' | 'completed'
  code_quality_score?: number
  assigned_at: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface ReviewComment {
  id: number
  student_username: string
  reviewer_username: string
  assignment_name: string
  comment: string
  comment_type: 'general' | 'code_quality' | 'functionality' | 'documentation' | 'suggestion'
  priority: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
}

// Database functions
export class SupabaseService {
  // Get all students
  static async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('github_username')
    
    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`)
    }
    
    return data || []
  }

  // Get all assignments
  static async getAssignments(): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('name')
    
    if (error) {
      throw new Error(`Failed to fetch assignments: ${error.message}`)
    }
    
    return data || []
  }

  // Get all grades
  static async getGrades(): Promise<Grade[]> {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .order('github_username')
    
    if (error) {
      throw new Error(`Failed to fetch grades: ${error.message}`)
    }
    
    return data || []
  }

  // Get consolidated grades (students with their grades for all assignments)
  static async getConsolidatedGrades(): Promise<ConsolidatedGrade[]> {
    const { data, error } = await supabase
      .from('consolidated_grades')
      .select('*')
      .order('github_username')
    
    if (error) {
      throw new Error(`Failed to fetch consolidated grades: ${error.message}`)
    }
    
    return data || []
  }

  // Get student statistics
  static async getStudentStats() {
    const [students, assignments, grades] = await Promise.all([
      this.getStudents(),
      this.getAssignments(),
      this.getGrades()
    ])

    const totalStudents = students.length
    const totalAssignments = assignments.length
    const totalGrades = grades.length
    
    // Calculate average score
    const validGrades = grades.filter(g => g.points_awarded !== null)
    const avgScore = validGrades.length > 0 
      ? Math.round(validGrades.reduce((sum, g) => sum + (g.points_awarded || 0), 0) / validGrades.length)
      : 0

    // Calculate completion rate
    const completionRate = totalStudents > 0 
      ? Math.round((validGrades.length / (totalStudents * totalAssignments)) * 100)
      : 0

    return {
      totalStudents,
      totalAssignments,
      totalGrades,
      avgScore,
      completionRate
    }
  }

  // Get leaderboard data (admin view with time-based ranking)
  static async getLeaderboard(): Promise<Array<{
    github_username: string
    total_score: number
    total_possible: number
    percentage: number
    assignments_completed: number
    fork_created_at?: string
    last_updated_at?: string
    resolution_time_hours?: number
    ranking_position?: number
    has_fork?: boolean
  }>> {
    // Try to get from admin_leaderboard first (time-based ranking)
    const { data: adminData, error: adminError } = await supabase
      .from('admin_leaderboard')
      .select('*')
      .order('ranking_position')
    
    if (!adminError && adminData && adminData.length > 0) {
      return adminData.map(student => ({
        github_username: student.github_username,
        total_score: student.total_score,
        total_possible: student.total_possible,
        percentage: student.percentage,
        assignments_completed: student.assignments_completed,
        fork_created_at: student.fork_created_at,
        last_updated_at: student.last_updated_at,
        resolution_time_hours: student.resolution_time_hours,
        ranking_position: student.ranking_position,
        has_fork: student.has_fork
      }))
    }
    
    // Fallback to consolidated_grades if admin_leaderboard is not available
    logger.warn('Admin leaderboard not available, falling back to consolidated_grades')
    const { data: gradesData, error: gradesError } = await supabase
      .from('consolidated_grades')
      .select('*')
    
    if (gradesError) {
      throw new Error(`Failed to fetch consolidated grades: ${gradesError.message}`)
    }
    
    if (!gradesData || gradesData.length === 0) {
      return []
    }
    
    // Group by student and calculate totals
    const studentMap = new Map<string, {
      github_username: string
      total_score: number
      total_possible: number
      assignments_completed: number
      grades: ConsolidatedGrade[]
    }>()
    
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
      
      const student = studentMap.get(username)!
      student.total_score += grade.points_awarded || 0
      student.total_possible += grade.points_available || 0
      if (grade.points_awarded && grade.points_awarded > 0) {
        student.assignments_completed++
      }
      student.grades.push(grade)
    })
    
    // Convert to array and calculate percentages
    const leaderboard = Array.from(studentMap.values()).map(student => ({
      github_username: student.github_username,
      total_score: student.total_score,
      total_possible: student.total_possible,
      percentage: student.total_possible > 0 
        ? Math.round((student.total_score / student.total_possible) * 100)
        : 0,
      assignments_completed: student.assignments_completed
    }))
    
    // Sort by percentage descending (fallback behavior)
    return leaderboard.sort((a, b) => b.percentage - a.percentage)
  }

  // Search students by username
  static async searchStudents(query: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .ilike('github_username', `%${query}%`)
      .order('github_username')
    
    if (error) {
      throw new Error(`Failed to search students: ${error.message}`)
    }
    
    return data || []
  }

  // Get grades for specific assignment
  static async getGradesByAssignment(assignmentName: string): Promise<Grade[]> {
    const { data, error } = await supabase
      .from('grades')
      .select('*')
      .eq('assignment_name', assignmentName)
      .order('github_username')
    
    if (error) {
      throw new Error(`Failed to fetch grades for assignment: ${error.message}`)
    }
    
    return data || []
  }

  // Get detailed grades breakdown for a specific student
  static async getStudentGradesBreakdown(username: string): Promise<Array<{
    assignment_name: string
    points_awarded: number | null
    points_available: number | null
    percentage: number | null
  }>> {
    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('assignment_name, points_awarded')
      .eq('github_username', username)
      .order('assignment_name')
    
    if (gradesError) {
      throw new Error(`Failed to fetch grades for student: ${gradesError.message}`)
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('name, points_available')
      .order('name')
    
    if (assignmentsError) {
      throw new Error(`Failed to fetch assignments: ${assignmentsError.message}`)
    }

    // Create assignment lookup
    const assignmentMap = new Map<string, number>()
    assignments.forEach(assignment => {
      assignmentMap.set(assignment.name, assignment.points_available || 0)
    })

    // Create grades lookup
    const gradesMap = new Map<string, number>()
    grades.forEach(grade => {
      gradesMap.set(grade.assignment_name, grade.points_awarded || 0)
    })

    // Create breakdown for all assignments
    const breakdown = assignments.map(assignment => {
      const pointsAwarded = gradesMap.get(assignment.name) || 0
      const pointsAvailable = assignment.points_available || 0
      const percentage = pointsAvailable > 0 ? Math.round((pointsAwarded / pointsAvailable) * 100) : 0

      return {
        assignment_name: assignment.name,
        points_awarded: pointsAwarded,
        points_available: pointsAvailable,
        percentage: percentage
      }
    })

    return breakdown
  }

  // Review System Methods

  // Get all student reviewers
  static async getStudentReviewers(): Promise<StudentReviewer[]> {
    const { data, error } = await supabase
      .from('student_reviewers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch student reviewers: ${error.message}`)
    }
    
    return data || []
  }

  // Get reviewers for a specific student
  static async getStudentReviewersByStudent(studentUsername: string): Promise<StudentReviewer[]> {
    const { data, error } = await supabase
      .from('student_reviewers')
      .select('*')
      .eq('student_username', studentUsername)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch reviewers for student: ${error.message}`)
    }
    
    return data || []
  }

  // Get assignments assigned to a reviewer
  static async getReviewerAssignments(reviewerUsername: string): Promise<StudentReviewer[]> {
    const { data, error } = await supabase
      .from('student_reviewers')
      .select('*')
      .eq('reviewer_username', reviewerUsername)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch reviewer assignments: ${error.message}`)
    }
    
    return data || []
  }

  // Assign a reviewer to a student
  static async assignReviewer(
    studentUsername: string,
    reviewerUsername: string,
    assignmentName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('student_reviewers')
        .insert({
          student_username: studentUsername,
          reviewer_username: reviewerUsername,
          assignment_name: assignmentName,
          status: 'pending',
          assigned_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(`Failed to assign reviewer: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Update reviewer status
  static async updateReviewerStatus(
    id: number,
    status: 'pending' | 'in_progress' | 'completed'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: { status: string; completed_at?: string } = { status }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('student_reviewers')
        .update(updateData)
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update reviewer status: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Update code quality score
  static async updateCodeQualityScore(
    id: number,
    score: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (score < 1 || score > 10) {
        throw new Error('Code quality score must be between 1 and 10')
      }

      const { error } = await supabase
        .from('student_reviewers')
        .update({ 
          code_quality_score: score,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update code quality score: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Get review comments for a student
  static async getReviewComments(
    studentUsername: string,
    assignmentName?: string
  ): Promise<ReviewComment[]> {
    let query = supabase
      .from('review_comments')
      .select('*')
      .eq('student_username', studentUsername)
      .order('created_at', { ascending: false })

    if (assignmentName) {
      query = query.eq('assignment_name', assignmentName)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch review comments: ${error.message}`)
    }
    
    return data || []
  }

  // Add a review comment
  static async addReviewComment(
    studentUsername: string,
    reviewerUsername: string,
    assignmentName: string,
    comment: string,
    commentType: 'general' | 'code_quality' | 'functionality' | 'documentation' | 'suggestion',
    priority: 'low' | 'medium' | 'high'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('review_comments')
        .insert({
          student_username: studentUsername,
          reviewer_username: reviewerUsername,
          assignment_name: assignmentName,
          comment,
          comment_type: commentType,
          priority
        })

      if (error) {
        throw new Error(`Failed to add review comment: ${error.message}`)
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Get available reviewers (admins from authorized_users)
  static async getAvailableReviewers(): Promise<Array<{
    github_username: string
    full_name?: string
    email?: string
  }>> {
    const { data, error } = await supabase
      .from('authorized_users')
      .select('github_username, full_name, email')
      .eq('role', 'admin')
      .eq('status', 'active')
      .order('github_username')
    
    if (error) {
      throw new Error(`Failed to fetch available reviewers: ${error.message}`)
    }
    
    return data || []
  }
}
