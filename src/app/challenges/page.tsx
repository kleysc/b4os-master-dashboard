'use client'

import { useState } from 'react'
import Link from 'next/link'
import { allChallenges, challengeCategories, challengeDifficulties } from '@/lib/challenges'
import ChallengeCard from '@/components/ChallengeCard'
import UserProfile from '@/components/UserProfile'
import ProtectedRoute from '@/components/ProtectedRoute'
import { CodeIcon, FilterIcon, XIcon, HomeIcon } from 'lucide-react'
import Image from 'next/image'

const categories = ['all', ...challengeCategories] as const
const difficulties = ['all', ...challengeDifficulties] as const

export default function ChallengesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')

  const filteredChallenges = allChallenges.filter(challenge => {
    const categoryMatch = selectedCategory === 'all' || challenge.metadata.category === selectedCategory
    const difficultyMatch = selectedDifficulty === 'all' || challenge.metadata.difficulty === selectedDifficulty
    return categoryMatch && difficultyMatch
  })

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-4">
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
                <p className="text-sm text-orange-600 font-medium">Master Bitcoin Development</p>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="flex gap-6">
                <Link href="/" className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
                  <HomeIcon className="w-4 h-4" />
                  Home
                </Link>
                <Link href="/challenges" className="flex items-center gap-1 text-orange-500 font-medium">
                  <CodeIcon className="w-4 h-4" />
                  Challenges
                </Link>
              </nav>
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

        <div className="container mx-auto px-6 py-8">
          {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">All Challenges</h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Master Bitcoin and Lightning Network development through practical programming challenges.
            Each challenge tests real-world skills needed for the B4OS program.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <FilterIcon className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filter Challenges</h3>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Category Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' 
                      ? 'All Categories' 
                      : category.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')
                    }
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty === 'all'
                      ? 'All Difficulties'
                      : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
                    }
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedDifficulty('all')
              }}
              className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
            >
              <XIcon className="w-4 h-4" />
              Clear filters
            </button>
          </div>
        </div>

        {/* Challenges Grid */}
        {filteredChallenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map((challenge, index) => (
              <ChallengeCard
                key={challenge.metadata.id}
                challenge={challenge.metadata}
                locked={index > 0 && challenge.metadata.difficulty !== 'beginner'}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No challenges found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters to see more challenges.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedDifficulty('all')
              }}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <XIcon className="w-4 h-4" />
              Clear filters
            </button>
          </div>
        )}
        </div>
      </div>
    </ProtectedRoute>
  )
}