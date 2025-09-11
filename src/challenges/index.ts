import { Challenge } from '@/types/challenge'

// Import all challenges
import { programmingPuzzlePartyIntro } from './bitcoin-basics/puzzle-party-intro'
import { lightningInvoiceChallenge } from './lightning-network/lightning-invoice'

// Import configuration
export { challengeCategories, challengeDifficulties, categoryInfo, difficultyInfo } from './config'

// Challenge registry
export const challengeRegistry: Record<string, Challenge> = {
  'puzzle-party-intro': programmingPuzzlePartyIntro,
  'lightning-invoice': lightningInvoiceChallenge,
}

// Export all challenges as array
export const allChallenges: Challenge[] = Object.values(challengeRegistry)

// Helper functions
export function getChallengeById(id: string): Challenge | undefined {
  return challengeRegistry[id]
}

export function getChallengesByCategory(category: string): Challenge[] {
  return allChallenges.filter(challenge => challenge.metadata.category === category)
}

export function getChallengesByDifficulty(difficulty: string): Challenge[] {
  return allChallenges.filter(challenge => challenge.metadata.difficulty === difficulty)
}

export function getChallengesByChapter(chapterNumber: number): Challenge[] {
  return allChallenges.filter(challenge => challenge.metadata.chapterNumber === chapterNumber)
}

export function getNextChallenge(currentChallengeId: string): Challenge | undefined {
  const currentChallenge = getChallengeById(currentChallengeId)
  if (!currentChallenge) return undefined
  
  const chapterChallenges = getChallengesByChapter(currentChallenge.metadata.chapterNumber || 1)
  const currentIndex = chapterChallenges.findIndex(c => c.metadata.id === currentChallengeId)
  
  if (currentIndex < chapterChallenges.length - 1) {
    return chapterChallenges[currentIndex + 1]
  }
  
  // If no more challenges in current chapter, get first challenge of next chapter
  const nextChapterChallenges = getChallengesByChapter((currentChallenge.metadata.chapterNumber || 1) + 1)
  return nextChapterChallenges[0]
}

export function getChallengeProgress(challengeId: string): {
  current: number
  total: number
  chapter: number
} {
  const challenge = getChallengeById(challengeId)
  if (!challenge) return { current: 0, total: 0, chapter: 0 }
  
  const chapterChallenges = getChallengesByChapter(challenge.metadata.chapterNumber || 1)
  const currentIndex = chapterChallenges.findIndex(c => c.metadata.id === challengeId)
  
  return {
    current: currentIndex + 1,
    total: chapterChallenges.length,
    chapter: challenge.metadata.chapterNumber || 1
  }
}
