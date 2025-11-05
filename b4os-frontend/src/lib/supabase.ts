import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production') {
    console.error('Missing Supabase environment variables')
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
)

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

// Database functions - Now using API routes to keep data secure
export class SupabaseService {
  // Get all students
  static async getStudents(): Promise<Student[]> {
    // This method is kept for backward compatibility but should use API routes
    // For now, we'll use a minimal approach - students are loaded via dashboard
    return []
  }

  // Get all assignments
  static async getAssignments(): Promise<Assignment[]> {
    // This method is kept for backward compatibility but should use API routes
    // For now, we'll use a minimal approach - assignments are loaded via dashboard
    return []
  }

  // Get all grades
  static async getGrades(): Promise<Grade[]> {
    const response = await fetch('/api/grades')
    if (!response.ok) {
      throw new Error(`Failed to fetch grades: ${response.statusText}`)
    }
    const data = await response.json()
    return data || []
  }

  // Get consolidated grades (students with their grades for all assignments)
  static async getConsolidatedGrades(): Promise<ConsolidatedGrade[]> {
    // This method is kept for backward compatibility
    // Consolidated grades are now loaded via dashboard API
    return []
  }

  // Get student statistics (optimized with single query when possible)
  static async getStudentStats() {
    // This method is kept for backward compatibility
    // Stats are now loaded via dashboard API
    return {
      totalStudents: 0,
      totalAssignments: 0,
      totalGrades: 0,
      avgScore: 0,
      completionRate: 0
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
    // This method is kept for backward compatibility
    // Leaderboard is now loaded via dashboard API
    return []
  }

  // Search students by username
  static async searchStudents(query: string): Promise<Student[]> {
    // This method is kept for backward compatibility
    // Students are now loaded via dashboard API and filtered client-side
    return []
  }

  // Get grades for specific assignment
  static async getGradesByAssignment(assignmentName: string): Promise<Grade[]> {
    const response = await fetch(`/api/grades?assignment=${encodeURIComponent(assignmentName)}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch grades for assignment: ${response.statusText}`)
    }
    const data = await response.json()
    return data || []
  }

  // Get detailed grades breakdown for a specific student
  static async getStudentGradesBreakdown(username: string): Promise<Array<{
    assignment_name: string
    points_awarded: number | null
    points_available: number | null
    percentage: number | null
    fork_created_at?: string | null
    fork_updated_at?: string | null
  }>> {
    const response = await fetch(`/api/students/${encodeURIComponent(username)}/grades`)
    if (!response.ok) {
      throw new Error(`Failed to fetch student grades: ${response.statusText}`)
    }
    const data = await response.json()
    return data || []
  }

  // Review System Methods

  // Get all student reviewers
  static async getStudentReviewers(): Promise<StudentReviewer[]> {
    const response = await fetch('/api/reviewers')
    if (!response.ok) {
      throw new Error(`Failed to fetch student reviewers: ${response.statusText}`)
    }
    const data = await response.json()
    // Convert object to array if needed
    if (Array.isArray(data)) {
      return data
    }
    // If it's grouped by student, flatten it
    return Object.values(data).flat() as StudentReviewer[]
  }

  // Get all student reviewers grouped by student (optimized for batch loading)
  static async getAllStudentReviewersGrouped(): Promise<Map<string, StudentReviewer[]>> {
    const response = await fetch('/api/reviewers')
    if (!response.ok) {
      throw new Error(`Failed to fetch student reviewers: ${response.statusText}`)
    }
    const data = await response.json()
    
    // Convert object to Map
    const reviewerMap = new Map<string, StudentReviewer[]>()
    if (typeof data === 'object' && !Array.isArray(data)) {
      Object.entries(data).forEach(([username, reviewers]) => {
        reviewerMap.set(username, reviewers as StudentReviewer[])
      })
    }
    
    return reviewerMap
  }

  // Get reviewers for a specific student
  static async getStudentReviewersByStudent(studentUsername: string): Promise<StudentReviewer[]> {
    const response = await fetch(`/api/reviewers?student=${encodeURIComponent(studentUsername)}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch reviewers for student: ${response.statusText}`)
    }
    const data = await response.json()
    return data || []
  }

  // Get assignments assigned to a reviewer
  static async getReviewerAssignments(reviewerUsername: string): Promise<StudentReviewer[]> {
    const response = await fetch(`/api/reviewers?reviewer=${encodeURIComponent(reviewerUsername)}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch reviewer assignments: ${response.statusText}`)
    }
    const data = await response.json()
    return data || []
  }

  // Assign a reviewer to a student
  static async assignReviewer(
    studentUsername: string,
    reviewerUsername: string,
    assignmentName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/reviewers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentUsername,
          reviewerUsername,
          assignmentName
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign reviewer')
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
      const response = await fetch('/api/reviewers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update reviewer status')
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

      const response = await fetch('/api/reviewers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, code_quality_score: score })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update code quality score')
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
    let url = `/api/comments?student=${encodeURIComponent(studentUsername)}`
    if (assignmentName) {
      url += `&assignment=${encodeURIComponent(assignmentName)}`
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch review comments: ${response.statusText}`)
    }
    
    const data = await response.json()
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
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentUsername,
          reviewerUsername,
          assignmentName,
          comment,
          commentType,
          priority
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add review comment')
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
    const response = await fetch('/api/reviewers?available=true')
    if (!response.ok) {
      throw new Error(`Failed to fetch available reviewers: ${response.statusText}`)
    }
    const data = await response.json()
    return data || []
  }

  // Optimized data loading for dashboard initialization
  static async getDashboardData(): Promise<{
    leaderboard: Array<{
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
    }>
    assignments: Assignment[]
    stats: {
      totalStudents: number
      totalAssignments: number
      totalGrades: number
      avgScore: number
      completionRate: number
    }
    reviewersGrouped: Map<string, StudentReviewer[]>
  }> {
    // Fetch all dashboard data from API route
    const response = await fetch('/api/dashboard')
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Convert reviewersGrouped object back to Map
    const reviewersGrouped = new Map<string, StudentReviewer[]>()
    if (data.reviewersGrouped && typeof data.reviewersGrouped === 'object') {
      Object.entries(data.reviewersGrouped).forEach(([username, reviewers]) => {
        reviewersGrouped.set(username, reviewers as StudentReviewer[])
      })
    }

    return {
      leaderboard: data.leaderboard || [],
      assignments: data.assignments || [],
      stats: data.stats || {
        totalStudents: 0,
        totalAssignments: 0,
        totalGrades: 0,
        avgScore: 0,
        completionRate: 0
      },
      reviewersGrouped
    }
  }
}
