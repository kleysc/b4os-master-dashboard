import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Get review comments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentUsername = searchParams.get('student')
    const assignmentName = searchParams.get('assignment')

    if (!studentUsername) {
      return NextResponse.json(
        { error: 'Missing student username' },
        { status: 400 }
      )
    }

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
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST - Add a review comment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentUsername, reviewerUsername, assignmentName, comment, commentType, priority } = body

    if (!studentUsername || !reviewerUsername || !assignmentName || !comment) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('review_comments')
      .insert({
        student_username: studentUsername,
        reviewer_username: reviewerUsername,
        assignment_name: assignmentName,
        comment,
        comment_type: commentType || 'general',
        priority: priority || 'medium'
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding comment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to add comment'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

