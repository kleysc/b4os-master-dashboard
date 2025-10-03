'use client'

import { X, ExternalLink, Clock, WorkflowIcon } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface GitHubActionsModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  assignmentName: string
}

export default function GitHubActionsModal({ 
  isOpen, 
  onClose, 
  username, 
  assignmentName 
}: GitHubActionsModalProps) {
  const { t } = useTranslation()
  const repoName = `${assignmentName}-${username}`
  const repoUrl = `https://github.com/B4OS-Dev/${repoName}`
  const actionsUrl = `https://github.com/B4OS-Dev/${repoName}/actions`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('github_actions_modal.title')}</h2>
            <p className="text-sm text-gray-500">@{username}</p>
            <p className="text-xs text-gray-400">{assignmentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Repository Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className='text-sm font-medium text-gray-700'>{t('github_actions_modal.repository')}</span>
                <p className="text-sm text-gray-600 mt-1">B4OS-Dev/{repoName}</p>
              </div>
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                title={t('github_actions_modal.open_repository')}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* GitHub Actions Section */}
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WorkflowIcon className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('github_actions_modal.title')}</h3>
            <p className="text-sm text-gray-600 mb-6">
              {t('github_actions_modal.description')}
            </p>
            <button
              onClick={() => window.open(actionsUrl, '_blank')}
              className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <WorkflowIcon className="w-4 h-4" />
              {t('github_actions_modal.view_actions_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
