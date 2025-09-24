'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Trophy, WorkflowIcon, UserCheck, MessageSquare } from 'lucide-react'
import { SupabaseService } from '@/lib/supabase'

interface GradesBreakdownProps {
  username: string
  isExpanded: boolean
  onOpenActions?: (username: string, assignmentName: string) => void
  onOpenReview?: (username: string, assignmentName: string) => void
}

interface GradeBreakdown {
  assignment_name: string
  points_awarded: number | null
  points_available: number | null
  percentage: number | null
}

export default function GradesBreakdown({ username, isExpanded, onOpenActions, onOpenReview }: GradesBreakdownProps) {
  const [grades, setGrades] = useState<GradeBreakdown[]>([])
  const [reviewData, setReviewData] = useState<{[key: string]: {reviewers: any[], comments: any[]}}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isExpanded && grades.length === 0) {
      loadGradesBreakdown()
    }
  }, [isExpanded, username])

  useEffect(() => {
    if (isExpanded && grades.length > 0) {
      loadReviewData()
    }
  }, [isExpanded, grades, username])

  const loadGradesBreakdown = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const breakdown = await SupabaseService.getStudentGradesBreakdown(username)
      setGrades(breakdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading grades')
    } finally {
      setIsLoading(false)
    }
  }

  const loadReviewData = async () => {
    try {
      const reviewers = await SupabaseService.getStudentReviewersByStudent(username)
      const comments = await SupabaseService.getReviewComments(username)
      
      const reviewDataMap: {[key: string]: {reviewers: any[], comments: any[]}} = {}
      
      grades.forEach(grade => {
        reviewDataMap[grade.assignment_name] = {
          reviewers: reviewers.filter(r => r.assignment_name === grade.assignment_name),
          comments: comments.filter(c => c.assignment_name === grade.assignment_name)
        }
      })
      
      setReviewData(reviewDataMap)
    } catch (err) {
      console.error('Error loading review data:', err)
    }
  }

  const getStatusIcon = (percentage: number | null) => {
    if (percentage === null || percentage === 0) {
      return <Clock className="w-4 h-4 text-gray-400" />
    } else if (percentage >= 80) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    } else if (percentage >= 60) {
      return <Trophy className="w-4 h-4 text-yellow-500" />
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (percentage: number | null) => {
    if (percentage === null || percentage === 0) {
      return 'text-gray-500'
    } else if (percentage >= 80) {
      return 'text-green-600'
    } else if (percentage >= 60) {
      return 'text-yellow-600'
    } else {
      return 'text-red-600'
    }
  }

  const getProgressColor = (percentage: number | null) => {
    if (percentage === null || percentage === 0) {
      return 'bg-gray-200'
    } else if (percentage >= 80) {
      return 'bg-green-500'
    } else if (percentage >= 60) {
      return 'bg-yellow-500'
    } else {
      return 'bg-red-500'
    }
  }

  const getReviewStatus = (assignmentName: string) => {
    const data = reviewData[assignmentName]
    if (!data || data.reviewers.length === 0) {
      return { status: 'none', text: 'Sin revisor', color: 'text-gray-500' }
    }
    
    const hasInProgress = data.reviewers.some(r => r.status === 'in_progress')
    const hasCompleted = data.reviewers.some(r => r.status === 'completed')
    
    if (hasCompleted) {
      return { status: 'completed', text: 'Revisado', color: 'text-green-600' }
    } else if (hasInProgress) {
      return { status: 'in_progress', text: 'En revisión', color: 'text-amber-600' }
    } else {
      return { status: 'pending', text: 'Pendiente', color: 'text-blue-600' }
    }
  }

  const getReviewCounts = (assignmentName: string) => {
    const data = reviewData[assignmentName]
    if (!data) return { reviewers: 0, comments: 0 }
    
    return {
      reviewers: data.reviewers.length,
      comments: data.comments.length
    }
  }

  if (!isExpanded) return null

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900">Desglose de Calificaciones</h4>
        <div className="text-sm text-gray-500">
          {grades.length} assignments
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Cargando calificaciones...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={loadGradesBreakdown}
            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">No hay calificaciones disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {grades.map((grade) => {
            const reviewStatus = getReviewStatus(grade.assignment_name)
            const reviewCounts = getReviewCounts(grade.assignment_name)
            
            return (
              <div key={grade.assignment_name} className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(grade.percentage)}
                    <h5 className="font-medium text-gray-900 text-sm truncate">
                      {grade.assignment_name}
                    </h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-right ${getStatusColor(grade.percentage)}`}>
                      <div className="text-lg font-bold">
                        {grade.percentage || 0}%
                      </div>
                      <div className="text-xs text-gray-500">
                        {grade.points_awarded || 0}/{grade.points_available || 0}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {onOpenActions && (
                        <button
                          onClick={() => onOpenActions(username, grade.assignment_name)}
                          className="w-6 h-6 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded-full flex items-center justify-center cursor-pointer transition-colors group"
                          title="Ver GitHub Actions para este assignment"
                        >
                          <WorkflowIcon className="w-3 h-3 text-gray-500 group-hover:text-orange-600" />
                        </button>
                      )}
                      {onOpenReview && (
                        <button
                          onClick={() => onOpenReview(username, grade.assignment_name)}
                          className="w-6 h-6 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-full flex items-center justify-center cursor-pointer transition-colors group"
                          title="Revisar este assignment"
                        >
                          <UserCheck className="w-3 h-3 text-gray-500 group-hover:text-blue-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(grade.percentage)}`}
                    style={{ width: `${Math.min(grade.percentage || 0, 100)}%` }}
                  />
                </div>
                
                {/* Status and Review Info */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    {grade.percentage === null || grade.percentage === 0 ? (
                      <span className="text-gray-500">Sin calificar</span>
                    ) : grade.percentage >= 80 ? (
                      <span className="text-green-600 font-medium">Excelente</span>
                    ) : grade.percentage >= 60 ? (
                      <span className="text-yellow-600 font-medium">Bueno</span>
                    ) : (
                      <span className="text-red-600 font-medium">Necesita mejorar</span>
                    )}
                  </div>
                  
                  {/* Review Status */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${reviewStatus.color}`}>
                      {reviewStatus.text}
                    </span>
                    {(reviewCounts.reviewers > 0 || reviewCounts.comments > 0) && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {reviewCounts.reviewers > 0 && (
                          <div className="flex items-center gap-0.5">
                            <UserCheck className="w-3 h-3" />
                            <span>{reviewCounts.reviewers}</span>
                          </div>
                        )}
                        {reviewCounts.comments > 0 && (
                          <div className="flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3" />
                            <span>{reviewCounts.comments}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
