export interface ChallengeMetadata {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: 'bitcoin-basics' | 'transactions' | 'lightning-network' | 'scripting' | 'cryptography'
  estimatedTime: number // minutes
  points: number
  prerequisites?: string[]
  chapterNumber?: number
  order?: number
  // Challenge type - determines which interface to show (mutually exclusive)
  type?: 'inline' | 'github' // inline = CodeEditor only, github = GitHub Classroom only
  // GitHub integration
  github?: {
    templateRepository: string // e.g., "B4OS-Dev/bitcoin-hash-challenge"
    assignmentSlug: string // e.g., "wkJqDNHy"
  }
}

export interface Challenge {
  metadata: ChallengeMetadata
  content: string
  initialCode?: string
  solution?: string
  validator: ChallengeValidator
  resources?: Resource[]
  story?: ChapterStory
}

export interface ChallengeValidator {
  language: 'javascript' | 'python' | 'typescript'
  testCases: TestCase[]
  validate: (userCode: string, userOutput: unknown) => Promise<ValidationResult>
}

export interface TestCase {
  name: string
  input: unknown
  expectedOutput: unknown
}

export interface ValidationResult {
  success: boolean
  message: string
  passedTests?: number
  totalTests?: number
  errors?: string[]
}

export interface Resource {
  title: string
  url: string
  type: 'documentation' | 'article' | 'video' | 'tool'
}

export interface ChapterStory {
  chapterTitle: string
  introduction: string
  context: string
  objective: string
  conclusion: string
  narrator?: string
  characters?: StoryCharacter[]
}

export interface StoryCharacter {
  name: string
  role: string
  avatar?: string
  description: string
}

export interface UserProgress {
  userId: string
  challengeId: string
  status: 'not-started' | 'in-progress' | 'completed'
  code?: string
  completedAt?: Date
  attempts: number
  score?: number
  storyProgress?: StoryProgress
}

export interface StoryProgress {
  currentChapter: number
  unlockedChapters: number[]
  viewedIntroductions: string[]
  completedConclusions: string[]
}