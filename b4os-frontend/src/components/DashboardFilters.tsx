'use client'

import { useState, useEffect } from 'react'
import { Filter, SortAsc, SortDesc, RotateCcw, Search } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface DashboardFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  totalStudents: number
  filteredCount: number
}

export interface FilterState {
  sortBy: 'resolution_time' | 'percentage' | 'username' | 'assignments'
  sortOrder: 'asc' | 'desc'
  showOnly: 'all' | 'completed' | 'partial' | 'incomplete'
  timeRange: { min: number; max: number }
  percentageRange: { min: number; max: number }
  searchTerm: string
  selectedAssignment: string  // 'all' or assignment name
  showColumns: {
    resolutionTime: boolean
    percentage: boolean
    assignments: boolean
    score: boolean
  }
}

const defaultFilters: FilterState = {
  sortBy: 'username',
  sortOrder: 'asc',
  showOnly: 'all',
  timeRange: { min: 0, max: 10000 },
  percentageRange: { min: 0, max: 200 },
  searchTerm: '',
  selectedAssignment: 'all',
  showColumns: {
    resolutionTime: true,
    percentage: true,
    assignments: true,
    score: true
  }
}

export default function DashboardFilters({ onFiltersChange, totalStudents, filteredCount }: DashboardFiltersProps) {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [isExpanded, setIsExpanded] = useState(false)
  const [assignments, setAssignments] = useState<Array<{ name: string; points_available: number | null }>>([])

  // Load assignments on mount
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const { SupabaseService } = await import('@/lib/supabase')
        const data = await SupabaseService.getAssignments()
        setAssignments(data)
      } catch (error) {
        console.error('Error loading assignments:', error)
      }
    }
    loadAssignments()
  }, [])

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const handleSortChange = (sortBy: FilterState['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleShowOnlyChange = (showOnly: FilterState['showOnly']) => {
    setFilters(prev => ({ ...prev, showOnly }))
  }

  const handleSearchChange = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }))
  }

  const handleAssignmentChange = (selectedAssignment: string) => {
    setFilters(prev => ({ ...prev, selectedAssignment }))
  }

  const resetFilters = () => {
    setFilters(defaultFilters)
  }

  const getSortIcon = (field: FilterState['sortBy']) => {
    if (filters.sortBy !== field) return null
    return filters.sortOrder === 'asc' ? 
      <SortAsc className="w-4 h-4" /> : 
      <SortDesc className="w-4 h-4" />
  }

  const getShowOnlyLabel = (type: FilterState['showOnly']) => {
    const labels = {
      all: t('filters.status_options.all'),
      completed: t('filters.status_options.completed'),
      partial: t('filters.status_options.partial'),
      incomplete: t('filters.status_options.incomplete')
    }
    return labels[type]
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">{t('filters.title')}</h3>
          <span className="text-sm text-gray-500">
            {t('dashboard.showing').replace('{filteredCount}', filteredCount.toString()).replace('{totalStudents}', totalStudents.toString())}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetFilters}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1"
          >
            <RotateCcw className='w-4 h-4' />
            {t('filters.reset_filters')}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 text-sm bg-orange-500 text-white hover:bg-orange-600 rounded-md transition-colors"
          >
            {isExpanded ? t('filters.hide_filters') : t('filters.show_filters')}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Búsqueda */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">{t('filters.search_label')}</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-800" />
              <input
                type="text"
                placeholder={t('filters.search_placeholder')}
                value={filters.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-800"
              />
            </div>
          </div>

          {/* Filtro por Assignment */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Filtrar por Challenge</h4>
            <select
              value={filters.selectedAssignment}
              onChange={(e) => handleAssignmentChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-800 bg-white"
            >
              <option value="all">Todos los challenges</option>
              {assignments.map((assignment) => (
                <option key={assignment.name} value={assignment.name}>
                  {assignment.name} ({assignment.points_available || 0} pts)
                </option>
              ))}
            </select>
          </div>

          {/* Ordenamiento */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">{t('filters.sort_by')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { key: 'resolution_time', label: t('filters.sort_options.resolution_time.label'), desc: t('filters.sort_options.resolution_time.description') },
                { key: 'percentage', label: t('filters.sort_options.percentage.label'), desc: t('filters.sort_options.percentage.description') },
                { key: 'assignments', label: t('filters.sort_options.assignments.label'), desc: t('filters.sort_options.assignments.description') }
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => handleSortChange(key as FilterState['sortBy'])}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors flex flex-col items-center justify-center gap-1 ${
                    filters.sortBy === key
                      ? 'bg-orange-50 border-orange-200 text-orange-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                  title={`${desc} ${filters.sortBy === key ? (filters.sortOrder === 'asc' ? '(Ascendente)' : '(Descendente)') : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {getSortIcon(key as FilterState['sortBy'])}
                  </div>
                  <div className="text-xs text-gray-500 text-center leading-tight">
                    {filters.sortBy === key && (
                      <span className="font-medium">
                        {filters.sortOrder === 'asc' 
                          ? (key === 'resolution_time' ? 'Más rápido primero' : 
                             key === 'percentage' ? 'Menor puntaje primero' :
                             'Menos completados primero')
                          : (key === 'resolution_time' ? 'Más lento primero' : 
                             key === 'percentage' ? 'Mayor puntaje primero' :
                             'Más completados primero')
                        }
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filtros de Estado */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">{t('filters.filter_by_status')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['all', 'completed', 'partial', 'incomplete'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => handleShowOnlyChange(type)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    filters.showOnly === type
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {getShowOnlyLabel(type)}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
