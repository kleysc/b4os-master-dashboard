'use client'

import { ChapterStory, StoryCharacter } from '@/types/challenge'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface StorySectionProps {
  story: ChapterStory
  phase: 'introduction' | 'context' | 'conclusion'
  onComplete?: () => void
}

export default function StorySection({ story, phase, onComplete }: StorySectionProps) {
  const { data: session } = useSession()
  const [currentSection, setCurrentSection] = useState<'introduction' | 'context' | 'objective' | 'conclusion'>(phase)
  const [isExpanded, setIsExpanded] = useState(false)

  // Replace GitHub username placeholder with actual username
  const replaceGitHubUsername = (text: string): string => {
    const githubUsername = session?.user?.name || 'Participante'
    return text.replace(/\{\{GITHUB_USERNAME\}\}/g, githubUsername)
  }

  const getContent = () => {
    let content = ''
    switch (currentSection) {
      case 'introduction':
        content = story.introduction
        break
      case 'context':
        content = story.context
        break
      case 'objective':
        content = story.objective
        break
      case 'conclusion':
        content = story.conclusion
        break
      default:
        content = story.introduction
        break
    }
    return replaceGitHubUsername(content)
  }

  const getTitle = () => {
    switch (currentSection) {
      case 'introduction':
        return `Capítulo: ${story.chapterTitle}`
      case 'context':
        return 'Contexto'
      case 'objective':
        return 'Tu Misión'
      case 'conclusion':
        return '¡Misión Completada!'
      default:
        return story.chapterTitle
    }
  }

  const getCharacterDisplay = (character: StoryCharacter) => {
    const displayName = replaceGitHubUsername(character.name)
    const displayRole = replaceGitHubUsername(character.role)
    const displayDescription = character.description ? replaceGitHubUsername(character.description) : undefined
    
    return (
      <div key={character.name} className="flex items-center space-x-3 mb-2">
        {character.avatar && (
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-orange-600 font-bold text-sm">
              {displayName.charAt(0)}
            </span>
          </div>
        )}
        <div>
          <span className="font-semibold text-orange-600">{displayName}</span>
          {/* <span className="text-gray-600 text-sm ml-2">({displayRole})</span> */}
          {displayDescription && (
            <p className="text-xs text-gray-500 mt-1">{displayDescription}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg shadow-sm mb-6 overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-orange-100/50 transition-colors" 
           onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          <span className="mr-2">📖</span>
          {getTitle()}
        </h3>
        <div className="flex items-center space-x-2">
          {!isExpanded && (
            <span className="text-xs text-orange-600 bg-orange-200 px-2 py-1 rounded-full">
              Click para ver historia
            </span>
          )}
          <button className="text-orange-600 hover:text-orange-800 transition-colors">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-white/50">
          {story.characters && story.characters.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-orange-100 shadow-sm">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                <span className="mr-2">👥</span>
                Personajes:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {story.characters.map(getCharacterDisplay)}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg p-4 border border-orange-100 shadow-sm">
            <div className="prose prose-sm max-w-none prose-gray prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-3 text-gray-700 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3">{children}</ul>,
                  li: ({ children }) => <li className="text-gray-700">{children}</li>
                }}
              >
                {getContent()}
              </ReactMarkdown>
            </div>
          </div>

          {story.narrator && (
            <div className="text-right">
              <span className="text-sm text-gray-500 italic">
                Narrado por {story.narrator}
              </span>
            </div>
          )}

          {phase === 'introduction' && (
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setCurrentSection('context')}
                className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors text-sm"
              >
                Ver Contexto
              </button>
              <button
                onClick={() => setCurrentSection('objective')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm"
              >
                Ver Misión
              </button>
            </div>
          )}

          {onComplete && phase === 'conclusion' && (
            <button
              onClick={onComplete}
              className="w-full bg-green-500 text-white py-3 rounded-md hover:bg-green-600 transition-colors font-semibold"
            >
              Continuar al Siguiente Capítulo
            </button>
          )}
        </div>
      )}
    </div>
  )
}