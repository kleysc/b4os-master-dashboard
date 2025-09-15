'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getChallengeById } from '@/lib/challenges'
import StorySection from '@/components/StorySection'
import UserProfile from '@/components/UserProfile'
import ProtectedRoute from '@/components/ProtectedRoute'
import GitHubIntegration from '@/components/GitHubIntegration'
import CodeEditor from '@/components/CodeEditor'
import { ArrowLeftIcon, HomeIcon, ClockIcon, CrownIcon } from 'lucide-react'
import { Challenge } from '@/types/challenge'
import Image from 'next/image'

interface ChallengePageProps {
  params: Promise<{
    id: string
  }>
}

export default function ChallengePage({ params }: ChallengePageProps) {
  const resolvedParams = use(params)
  const challenge = getChallengeById(resolvedParams.id)

  if (!challenge) {
    notFound()
  }

  return (
    <ProtectedRoute>
      <ChallengePageContent challenge={challenge} />
    </ProtectedRoute>
  )
}

function ChallengePageContent({ challenge }: { challenge: Challenge }) {

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800 border-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    advanced: 'bg-red-100 text-red-800 border-red-200',
  }

  const categoryColors: Record<string, string> = {
    'bitcoin-basics': 'bg-orange-100 text-orange-800',
    'transactions': 'bg-blue-100 text-blue-800',
    'lightning-network': 'bg-purple-100 text-purple-800',
    'scripting': 'bg-green-100 text-green-800',
    'cryptography': 'bg-red-100 text-red-800',
  }

  // Determine challenge type (mutually exclusive)
  const getChallengeType = () => {
    if (challenge.metadata.type) {
      return challenge.metadata.type
    }
    // Fallback logic for backward compatibility
    if (challenge.metadata.github) {
      return 'github'
    } else if (challenge.validator) {
      return 'inline'
    }
    return 'github' // default
  }

  const challengeType = getChallengeType()

  const handleCodeChange = (code: string) => {
    // Handle code changes - could save to localStorage or state
    console.log('Code updated:', code)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/challenges" className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm border border-gray-200">
                <Image 
                  src="/web-app-manifest-192x192.png" 
                  alt="B4OS Logo" 
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">B4OS Challenges</h1>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="flex gap-6">
                <Link href="/" className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
                  <HomeIcon className="w-4 h-4" />
                  Home
                </Link>
                <Link href="/challenges" className="flex items-center gap-1 text-orange-500 font-medium">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Challenges
                </Link>
              </nav>
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Story Introduction */}
        {challenge.story && (
          <StorySection 
            story={challenge.story} 
            phase="introduction" 
          />
        )}

        {/* GitHub Integration - only for github type */}
        {challengeType === 'github' && challenge.metadata.github && (
          <GitHubIntegration
            templateRepository={challenge.metadata.github.templateRepository}
            assignmentSlug={challenge.metadata.github.assignmentSlug}
            fallbackContent={challenge.content}
            challenge={challenge}
          />
        )}

        {/* Code Editor - only for inline type */}
        {challengeType === 'inline' && challenge.validator && challenge.initialCode && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Interactive Code Challenge
            </h3>
            <p className="text-gray-600 mb-4">
              Complete the challenge by writing code in the editor below and testing your solution.
            </p>
            <CodeEditor
              initialCode={challenge.initialCode}
              language={challenge.validator.language}
              onCodeChange={handleCodeChange}
              onValidate={challenge.validator.validate}
              className="mb-4"
            />
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Challenge Info */}
          <div className="space-y-4">
            {/* Challenge Header */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-lg font-bold text-gray-900 mb-1">
                    {challenge.metadata.title}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {challenge.metadata.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${difficultyColors[challenge.metadata.difficulty]}`}>
                  {challenge.metadata.difficulty}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[challenge.metadata.category]}`}>
                  {challenge.metadata.category.replace('-', ' ')}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {challenge.metadata.estimatedTime} min
                </span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium flex items-center gap-1">
                  <CrownIcon className="w-3 h-3" />
                  {challenge.metadata.points} pts
                </span>
              </div>

              {challenge.metadata.prerequisites && challenge.metadata.prerequisites.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Prerequisites:</p>
                  <div className="flex flex-wrap gap-1">
                    {challenge.metadata.prerequisites.map((prereq: string) => (
                      <span key={prereq} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                        {prereq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>


            {/* Resources */}
            {challenge.resources && challenge.resources.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Helpful Resources
                </h3>
                <div className="space-y-2">
                  {challenge.resources.map((resource: { title: string; url: string; type: string }, index: number) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <span className="text-gray-400">
                        {resource.type === 'documentation' && '📖'}
                        {resource.type === 'article' && '📄'}
                        {resource.type === 'video' && '🎥'}
                        {resource.type === 'tool' && '🔧'}
                      </span>
                      {resource.title}
                      <span className="text-gray-400">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        </div>
      </div>
  )
}