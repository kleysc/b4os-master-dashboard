'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Tipos para las traducciones
type TranslationKeys = {
  common: {
    loading: string
    error: string
    retry: string
    cancel: string
    save: string
    delete: string
    edit: string
    close: string
    back: string
    next: string
    previous: string
    search: string
    filter: string
    sort: string
    reset: string
    show: string
    hide: string
    add: string
    remove: string
    assign: string
    complete: string
    start: string
    view: string
    review: string
    actions: string
    progress: string
    status: string
    score: string
    points: string
    percentage: string
    time: string
    date: string
    name: string
    username: string
    email: string
    description: string
    type: string
    priority: string
    quality: string
    comments: string
    reviews: string
    assignments: string
    students: string
    active: string
    inactive: string
    completed: string
    incomplete: string
    pending: string
    in_progress: string
    excellent: string
    good: string
    needs_improvement: string
    no_data: string
    no_reviewers: string
    no_comments: string
    no_repositories: string
    no_activity: string
    loading_repositories: string
    loading_grades: string
    verifying_auth: string
    loading_data: string
    failed_to_load: string
    failed_to_load_grades: string
    sign_in: string
    sign_out: string
    continue_with: string
    by_signing_in: string
    agreement: string
  }
  navigation: {
    dashboard: string
    leaderboard: string
    filters: string
    profile: string
    settings: string
  }
  dashboard: {
    title: string
    subtitle: string
    description: string
    stats: {
      students: string
      assignments: string
      average_score: string
      completion_rate: string
    }
    showing: string
    students_count: string
    no_data_description: string
  }
  filters: {
    title: string
    search_placeholder: string
    search_label: string
    sort_by: string
    filter_by_status: string
    show_filters: string
    hide_filters: string
    reset_filters: string
    sort_options: {
      resolution_time: {
        label: string
        description: string
        asc: string
        desc: string
      }
      percentage: {
        label: string
        description: string
        asc: string
        desc: string
      }
      assignments: {
        label: string
        description: string
        asc: string
        desc: string
      }
      username: {
        label: string
        description: string
      }
      total_score: {
        label: string
        description: string
      }
      quality_score: {
        label: string
        description: string
      }
      review_status: {
        label: string
        description: string
      }
    }
    status_options: {
      all: string
      completed: string
      partial: string
      incomplete: string
    }
  }
  leaderboard: {
    title: string
    columns: {
      students: string
      assignments: string
      resolution_time: string
      points: string
      percentage: string
      quality_score: string
      review_status: string
    }
    actions: {
      view_progress: string
      review_work: string
      view_actions: string
      view_github_profile: string
      view_assignments: string
      view_github_actions: string
      review_student_work: string
      show_grades_breakdown: string
      hide_grades_breakdown: string
    }
    status: {
      active: string
      inactive: string
      active_user: string
      active_description: string
      inactive_user: string
      inactive_description: string
      no_reviewer: string
      reviewed: string
      in_review: string
      pending_review: string
    }
    time_format: {
      days_hours: string
      not_available: string
    }
    progress_labels: {
      excellent: string
      good: string
      needs_improvement: string
      no_pow: string
    }
    quality_score: {
      title: string
      evaluations: string
    }
    review_info: {
      more_reviewers: string
    }
    evaluations: string
    more_reviewers: string
  }
  grades_breakdown: {
    title: string
    assignments_count: string
    loading_grades: string
    no_grades: string
    retry_button: string
    actions: {
      view_github_actions: string
      review_assignment: string
      view_reviewers_comments: string
      view_review_comments: string
    }
    status: {
      no_reviewer: string
      reviewed: string
      in_review: string
      pending: string
    }
    progress_labels: {
      excellent: string
      good: string
      needs_improvement: string
      no_pow: string
    }
  }
  github_actions_modal: {
    title: string
    repository: string
    open_repository: string
    description: string
    view_actions_button: string
  }
  github_tooltip: {
    collaboration_activity: string
    recent_repositories: string
    recent_repos: string
    loading_repos: string
    error_loading_repos: string
    no_recent_repos: string
    no_activity_30_days: string
    last_30_days: string
    view_all: string
    time_ago: {
      hours: string
      days: string
    }
  }
  review_system: {
    title: string
    repository_student: string
    assigned_reviewers: string
    comments_observations: string
    actions: {
      add_reviewer: string
      assign_reviewer: string
      add_comment: string
      add_comment_button: string
      remove_reviewer: string
      start_review: string
      complete_review: string
    }
    forms: {
      assigning_as: string
      commenting_as: string
      select_reviewer: string
      select_reviewer_placeholder: string
      comment: string
      comment_placeholder: string
      type: string
      priority: string
      multiple_reviewers_tip: string
    }
    types: {
      general: string
      code_quality: string
      functionality: string
      documentation: string
      suggestion: string
    }
    priorities: {
      low: string
      medium: string
      high: string
    }
    status: {
      pending: string
      in_progress: string
      completed: string
    }
    quality_score: {
      label: string
      title: string
    }
    assigned_on: string
    no_reviewers: string
    no_comments: string
    confirm_remove: string
    options_menu: string
  }
  assignment_selector: {
    title: string
    description: string
    points_available: string
    no_points: string
  }
  user_profile: {
    sign_in_button: string
    user_role: string
    close_session: string
  }
  auth: {
    title: string
    subtitle: string
    unauthorized_title: string
    unauthorized_subtitle: string
    unauthorized_description: string
    unauthorized_contact: string
    close_session_button: string
  }
  footer: {
    title: string
    description: string
  }
  metadata: {
    title: string
    description: string
  }
}

type Language = 'es' | 'en'

interface TranslationContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  translations: TranslationKeys | null
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

// Función para obtener traducciones anidadas
function getNestedTranslation(obj: Record<string, unknown>, path: string): string {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && current !== null && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return path
  }, obj as unknown) as string
}

// Función para formatear strings con variables
function formatString(template: string, variables: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? String(variables[key]) : match
  })
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('es')
  const [translations, setTranslations] = useState<TranslationKeys | null>(null)

  // Cargar traducciones
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch(`/i18n/${language}.json`)
        if (response.ok) {
          const data = await response.json()
          setTranslations(data)
        } else {
          console.error('Failed to load translations')
        }
      } catch (error) {
        console.error('Error loading translations:', error)
      }
    }

    loadTranslations()
  }, [language])

  // Función de traducción
  const t = (key: string, variables?: Record<string, string | number>): string => {
    if (!translations) return key
    
    const translation = getNestedTranslation(translations, key)
    
    if (typeof translation === 'string') {
      return variables ? formatString(translation, variables) : translation
    }
    
    return key
  }

  // Persistir idioma en localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('b4os-language') as Language
    if (savedLanguage && (savedLanguage === 'es' || savedLanguage === 'en')) {
      setLanguage(savedLanguage)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('b4os-language', language)
  }, [language])

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}
