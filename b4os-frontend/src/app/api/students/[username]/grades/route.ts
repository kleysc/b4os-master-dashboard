import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username } = await params

    const { data: grades, error: gradesError } = await supabase
      .from('grades')
      .select('assignment_name, points_awarded, fork_created_at, fork_updated_at')
      .eq('github_username', username)
      .order('assignment_name')

    if (gradesError) {
      throw gradesError
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('name, points_available')
      .order('name')

    if (assignmentsError) {
      throw assignmentsError
    }

    // Create assignment lookup
    const assignmentMap = new Map<string, number>()
    assignments.forEach(assignment => {
      assignmentMap.set(assignment.name, assignment.points_available || 0)
    })

    // For assignments with no points_available, use max points_awarded
    const { data: allGrades } = await supabase
      .from('grades')
      .select('assignment_name, points_awarded')

    if (allGrades) {
      assignments.forEach(assignment => {
        if (!assignment.points_available || assignment.points_available === 0) {
          const assignmentGrades = allGrades.filter(g => g.assignment_name === assignment.name)
          const maxPoints = Math.max(...assignmentGrades.map(g => g.points_awarded || 0), 0)
          if (maxPoints > 0) {
            assignmentMap.set(assignment.name, maxPoints)
          }
        }
      })
    }

    // Create grades lookup with fork dates
    const gradesMap = new Map()
    grades.forEach(grade => {
      gradesMap.set(grade.assignment_name, {
        points: grade.points_awarded || 0,
        fork_created_at: grade.fork_created_at || null,
        fork_updated_at: grade.fork_updated_at || null
      })
    })

    // Create breakdown for all assignments
    const breakdown = assignments.map(assignment => {
      const gradeData = gradesMap.get(assignment.name)
      const pointsAwarded = gradeData?.points || 0
      const pointsAvailable = assignmentMap.get(assignment.name) || 0
      const percentage = pointsAvailable > 0 ? Math.round((pointsAwarded / pointsAvailable) * 100) : 0

      return {
        assignment_name: assignment.name,
        points_awarded: pointsAwarded,
        points_available: pointsAvailable,
        percentage: percentage,
        fork_created_at: gradeData?.fork_created_at || null,
        fork_updated_at: gradeData?.fork_updated_at || null
      }
    })

    return NextResponse.json(breakdown)
  } catch (error) {
    console.error('Error fetching student grades:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student grades' },
      { status: 500 }
    )
  }
}

