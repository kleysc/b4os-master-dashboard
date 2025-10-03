'use client'

import { useState, useEffect } from 'react'
import { ExternalLinkIcon, Github, Calendar } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface GitHubTooltipProps {
  username: string
  children: React.ReactNode
  index?: number
}

interface GitHubRepo {
  name: string
  full_name: string
  description: string
  stargazers_count: number
  forks_count: number
  language: string
  updated_at: string
  html_url: string
}

export default function GitHubTooltip({ username, children, index }: GitHubTooltipProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (showTooltip && repos.length === 0) {
      fetchGitHubData()
    }
  }, [showTooltip, username])

  const fetchGitHubData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch recent repos (only those with activity)
      const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5&type=all`)
      if (!reposResponse.ok) throw new Error('Failed to fetch repositories')
      const reposData = await reposResponse.json()
      
      // Filter repos that have been updated recently (last 30 days)
      const recentRepos = reposData.filter((repo: GitHubRepo) => {
        const lastUpdate = new Date(repo.updated_at)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return lastUpdate > thirtyDaysAgo
      })
      
      setRepos(recentRepos.slice(0, 3))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `hace ${diffInHours}h`
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24)
      return `hace ${days}d`
    } else {
      return formatDate(dateString)
    }
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}

      {showTooltip && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 ml-8 ${
          index !== undefined && index < 4 
            ? 'top-full mt-3' 
            : 'bottom-full mb-3'
        }`} style={{ zIndex: 99999 }}>
          <div className="bg-white text-gray-900 text-sm rounded-lg py-3 px-4 shadow-lg border border-gray-200 min-w-80 max-w-96">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
              <img
                src={`https://github.com/${username}.png`}
                alt={username}
                className="w-8 h-8 rounded-full border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">@{username}</div>
                <div className="text-xs text-gray-500">{t('github_tooltip.collaboration_activity')}</div>
              </div>
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </div>

            {/* Recent Repositories */}
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <div className="text-xs text-gray-500">{t('github_tooltip.loading_repos')}</div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <div className="text-red-500 text-xs mb-2">⚠️</div>
                <div className="text-xs text-gray-500">{t('github_tooltip.error_loading_repos')}</div>
              </div>
            ) : repos.length > 0 ? (
              <div>
                <div className="text-xs font-medium text-gray-700 mb-3">{t('github_tooltip.recent_repos')}</div>
                <div className="space-y-2">
                  {repos.map((repo) => (
                    <div key={repo.name} className="p-2 bg-gray-50 rounded-md border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Github className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate block"
                          >
                            {repo.name}
                          </a>
                          <div className="text-xs text-gray-500 mt-1">
                            {getTimeAgo(repo.updated_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-gray-400 text-2xl mb-2">📁</div>
                <div className="text-xs text-gray-500">{t('github_tooltip.no_recent_repos')}</div>
                <div className="text-xs text-gray-400 mt-1">{t('github_tooltip.no_activity_30_days')}</div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t('github_tooltip.last_30_days')}
                </div>
                <a
                  href={`https://github.com/${username}?tab=repositories`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  {t('github_tooltip.view_all')}
                </a>
              </div>
            </div>

            {/* Arrow */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 ${
              index !== undefined && index < 4 
                ? 'bottom-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white' 
                : 'top-full border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white'
            }`}></div>
          </div>
        </div>
      )}
    </div>
  )
}