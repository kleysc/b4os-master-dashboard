"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { SupabaseService, type StudentReviewer, type ReviewComment } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { 
  UserCheck, 
  MessageSquare, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ExternalLink,
  User,
  Calendar,
  Flag,
  MoreVertical,
  Trash2
} from "lucide-react";

interface ReviewSystemProps {
  studentUsername: string;
  assignmentName: string;
  repositoryUrl?: string;
  onClose?: () => void;
}

export default function ReviewSystem({ 
  studentUsername, 
  assignmentName, 
  repositoryUrl,
  onClose 
}: ReviewSystemProps) {
  const { data: session } = useSession();
  const [reviewers, setReviewers] = useState<StudentReviewer[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [availableReviewers, setAvailableReviewers] = useState<Array<{
    github_username: string;
    full_name?: string;
    email?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [selectedReviewer, setSelectedReviewer] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState<"general" | "code_quality" | "functionality" | "documentation" | "suggestion">("general");
  const [commentPriority, setCommentPriority] = useState<"low" | "medium" | "high">("medium");
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [studentUsername, assignmentName]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reviewersData, commentsData, availableReviewersData] = await Promise.all([
        SupabaseService.getStudentReviewersByStudent(studentUsername),
        SupabaseService.getReviewComments(studentUsername, assignmentName),
        SupabaseService.getAvailableReviewers()
      ]);

      setReviewers(reviewersData.filter(r => r.assignment_name === assignmentName));
      setComments(commentsData);
      setAvailableReviewers(availableReviewersData);

      console.log("Review data loaded:", {
        reviewers: reviewersData.length,
        comments: commentsData.length,
        availableReviewers: availableReviewersData.length,
        availableReviewersData
      });
    } catch (error) {
      console.error("Error loading review data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignReviewer = async () => {
    console.log("Attempting to assign reviewer:", {
      selectedReviewer,
      studentUsername,
      assignmentName
    });

    if (!selectedReviewer) {
      console.log("No reviewer selected");
      return;
    }

    if (!session?.user?.username) {
      alert("Error: No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente.");
      return;
    }

    try {
      const result = await SupabaseService.assignReviewer(
        studentUsername,
        selectedReviewer,
        assignmentName
      );

      console.log("Assignment result:", result);

      if (result.success) {
        setShowAssignForm(false);
        setSelectedReviewer("");
        loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error in handleAssignReviewer:", error);
      alert(`Error: ${error}`);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    if (!session?.user?.username) {
      alert("Error: No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente.");
      return;
    }

    const result = await SupabaseService.addReviewComment(
      studentUsername,
      session.user.username,
      assignmentName,
      newComment,
      commentType,
      commentPriority
    );

    if (result.success) {
      setNewComment("");
      setCommentType("general");
      setCommentPriority("medium");
      setShowCommentForm(false);
      loadData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleStatusUpdate = async (reviewerId: number, status: "pending" | "in_progress" | "completed") => {
    const result = await SupabaseService.updateReviewerStatus(reviewerId, status);
    if (result.success) {
      loadData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleQualityScoreUpdate = async (reviewerId: number, score: number) => {
    const result = await SupabaseService.updateCodeQualityScore(reviewerId, score);
    if (result.success) {
      loadData();
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleRemoveReviewer = async (reviewerId: number) => {
    if (confirm('¿Estás seguro de que quieres remover este revisor?')) {
      try {
        const { error } = await supabase
          .from('student_reviewers')
          .delete()
          .eq('id', reviewerId);

        if (error) {
          throw new Error(`Failed to remove reviewer: ${error.message}`);
        }

        loadData();
      } catch (error) {
        console.error("Error removing reviewer:", error);
        alert(`Error: ${error}`);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <Clock className="w-4 h-4" />;
      case "pending":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500 text-white";
      case "in_progress":
        return "bg-cyan-500 text-white";
      case "pending":
        return "bg-amber-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-rose-500 text-white";
      case "medium":
        return "bg-orange-500 text-white";
      case "low":
        return "bg-lime-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case "code_quality":
        return "bg-sky-500 text-white";
      case "functionality":
        return "bg-violet-500 text-white";
      case "documentation":
        return "bg-indigo-500 text-white";
      case "suggestion":
        return "bg-emerald-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Sistema de Revisión
          </h3>
          <p className="text-sm text-gray-600">
            {studentUsername} - {assignmentName}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Repository Link */}
      {repositoryUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Repositorio del Estudiante:</span>
          </div>
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm font-medium break-all"
          >
            {repositoryUrl}
          </a>
        </div>
      )}

      {/* Reviewers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Revisores Asignados
          </h4>
          <button
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded flex items-center gap-1.5 transition-colors mr-4"
          >
            <Plus className="w-3.5 h-3.5" />
            {reviewers.length > 0 ? 'Agregar Revisor' : 'Asignar Revisor'}
          </button>
        </div>

        {/* Assign Reviewer Form */}
        {showAssignForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Asignando como: <span className="text-blue-600 font-semibold">{session?.user?.username || 'Cargando...'}</span>
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seleccionar Revisor
                </label>
                <select
                  value={selectedReviewer}
                  onChange={(e) => setSelectedReviewer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                >
                  <option value="">Seleccionar revisor...</option>
                  {availableReviewers
                    .filter(reviewer => !reviewers.some(r => r.reviewer_username === reviewer.github_username))
                    .map((reviewer) => (
                      <option key={reviewer.github_username} value={reviewer.github_username}>
                        {reviewer.github_username} {reviewer.full_name && `(${reviewer.full_name})`}
                      </option>
                    ))}
                </select>
                {reviewers.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Puedes asignar múltiples revisores al mismo assignment
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAssignReviewer}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded transition-colors"
                >
                  {reviewers.length > 0 ? 'Agregar' : 'Asignar'}
                </button>
                <button
                  onClick={() => setShowAssignForm(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reviewers List */}
        <div className="space-y-3">
          {reviewers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <UserCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay revisores asignados</p>
            </div>
          ) : (
            reviewers.map((reviewer) => (
              <div key={reviewer.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative">
                {/* Options Menu - Top Right */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === reviewer.id ? null : reviewer.id)}
                    className="w-6 h-6 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 rounded-full flex items-center justify-center transition-colors"
                    title="Opciones del revisor"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {openMenuId === reviewer.id && (
                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                      <button
                        onClick={() => {
                          handleRemoveReviewer(reviewer.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover Revisor
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pr-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-semibold text-gray-900 truncate">{reviewer.reviewer_username}</h5>
                      <p className="text-sm text-gray-500">
                        Asignado el {new Date(reviewer.assigned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(reviewer.status)}`}>
                      <span className="capitalize whitespace-nowrap">{reviewer.status.replace('_', ' ')}</span>
                    </span>
                    
                    {/* Quality Score Section */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 font-medium">Puntaje:</span>
                        {/* Interactive Score Bar */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              onClick={() => handleQualityScoreUpdate(reviewer.id, num)}
                              className={`w-3 h-3 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer ${
                                num <= (reviewer.code_quality_score || 0)
                                  ? num <= 6
                                    ? 'bg-red-400 hover:bg-red-500'
                                    : num <= 8
                                    ? 'bg-yellow-400 hover:bg-yellow-500'
                                    : 'bg-green-400 hover:bg-green-500'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                              title={`Puntaje ${num}/10`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {reviewer.status === "pending" && (
                        <button
                          onClick={() => handleStatusUpdate(reviewer.id, "in_progress")}
                          className="px-3 py-1 text-xs font-medium text-amber-700 hover:text-amber-800 border border-amber-300 hover:border-amber-400 rounded transition-colors"
                        >
                          Iniciar
                        </button>
                      )}
                      {reviewer.status === "in_progress" && (
                        <button
                          onClick={() => handleStatusUpdate(reviewer.id, "completed")}
                          className="px-3 py-1 text-xs font-medium text-green-700 hover:text-green-800 border border-green-300 hover:border-green-400 rounded transition-colors"
                        >
                          Completar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pl-1">
          <h4 className="text-md font-medium text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comentarios y Observaciones
          </h4>
          <button
            onClick={() => setShowCommentForm(!showCommentForm)}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded flex items-center gap-1.5 transition-colors mr-5"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar
          </button>
        </div>

        {/* Add Comment Form */}
        {showCommentForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Comentando como: <span className="text-green-600 font-semibold">{session?.user?.username || 'Cargando...'}</span>
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentario
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 resize-none"
                  placeholder="Escribe tu comentario u observación..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as 'general' | 'code_quality' | 'functionality' | 'documentation' | 'suggestion')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  >
                    <option value="general">General</option>
                    <option value="code_quality">Calidad de Código</option>
                    <option value="functionality">Funcionalidad</option>
                    <option value="documentation">Documentación</option>
                    <option value="suggestion">Sugerencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={commentPriority}
                    onChange={(e) => setCommentPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddComment}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 rounded transition-colors"
                >
                  Agregar Comentario
                </button>
                <button
                  onClick={() => setShowCommentForm(false)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay comentarios</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{comment.reviewer_username}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()} • {new Date(comment.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCommentTypeColor(comment.comment_type)}`}>
                      {comment.comment_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(comment.priority)}`}>
                      {comment.priority}
                    </span>
                  </div>
                </div>
                <div className="ml-11">
                  <p className="text-gray-700 leading-relaxed">{comment.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
