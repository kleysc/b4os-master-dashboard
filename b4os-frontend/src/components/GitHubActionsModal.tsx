'use client'

import { X, ExternalLink, Clock, WorkflowIcon } from 'lucide-react'

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

  const repoName = `${assignmentName}-${username}`
  const repoUrl = `https://github.com/B4OS-Dev/${repoName}`
  const actionsUrl = `https://github.com/B4OS-Dev/${repoName}/actions`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">GitHub Actions</h2>
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

        <div className="flex-1 overflow-y-auto p-6">
          {/* Repository Link - Top */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Repository:</span>
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                B4OS-Dev/{repoName}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* GitHub Actions Link - Bottom */}
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">GitHub Actions</h3>
            <p className="text-sm text-gray-600 mb-6">
              Ver las ejecuciones de CI/CD para este assignment
            </p>
            <button
              onClick={() => window.open(actionsUrl, '_blank')}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2 mx-auto"
            >
              <WorkflowIcon className="w-4 h-4" />
              Ver GitHub Actions
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
