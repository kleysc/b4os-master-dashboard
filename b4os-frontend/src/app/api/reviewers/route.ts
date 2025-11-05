import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import type { StudentReviewer } from '@/lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ReviewerUpdateData {
  status?: string
  completed_at?: string
  code_quality_score?: number
  updated_at: string
}

// GET - Get reviewers for a student or all reviewers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentUsername = searchParams.get('student')
    const reviewerUsername = searchParams.get('reviewer')
    const available = searchParams.get('available') === 'true'

    if (available) {
      // Get available reviewers (admins)
      const { data, error } = await supabase
        .from('authorized_users')
        .select('github_username, full_name, email')
        .eq('role', 'admin')
        .eq('status', 'active')
        .order('github_username')

      if (error) throw error
      return NextResponse.json(data || [])
    }

    if (studentUsername) {
      const { data, error } = await supabase
        .from('student_reviewers')
        .select('*')
        .eq('student_username', studentUsername)
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data || [])
    }

    if (reviewerUsername) {
      const { data, error } = await supabase
        .from('student_reviewers')
        .select('*')
        .eq('reviewer_username', reviewerUsername)
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data || [])
    }

    // Get all reviewers grouped
    const { data, error } = await supabase
      .from('student_reviewers')
      .select('*')
      .order('student_username')
      .order('created_at', { ascending: false })

    if (error) throw error

    const reviewerMap: Record<string, StudentReviewer[]> = {}
    data?.forEach(reviewer => {
      const username = reviewer.student_username
      if (!reviewerMap[username]) {
        reviewerMap[username] = []
      }
      reviewerMap[username].push(reviewer)
    })

    return NextResponse.json(reviewerMap)
  } catch (error) {
    console.error('Error fetching reviewers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviewers' },
      { status: 500 }
    )
  }
}

// POST - Assign a reviewer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentUsername, reviewerUsername, assignmentName } = body

    if (!studentUsername || !reviewerUsername || !assignmentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

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
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error assigning reviewer:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to assign reviewer'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// PATCH - Update reviewer status or quality score
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, code_quality_score } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing reviewer ID' },
        { status: 400 }
      )
    }

    const updateData: ReviewerUpdateData = {
      updated_at: new Date().toISOString()
    }
    if (status) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
    }
    if (code_quality_score !== undefined) {
      if (code_quality_score < 1 || code_quality_score > 10) {
        return NextResponse.json(
          { error: 'Code quality score must be between 1 and 10' },
          { status: 400 }
        )
      }
      updateData.code_quality_score = code_quality_score
    }

    const { error } = await supabase
      .from('student_reviewers')
      .update(updateData)
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating reviewer:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update reviewer'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE - Remove a reviewer
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing reviewer ID' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('student_reviewers')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing reviewer:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove reviewer'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

