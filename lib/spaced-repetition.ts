/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm:
 * https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *
 * Quality grades:
 * 0 - Complete blackout, no recall
 * 1 - Incorrect response, but upon seeing correct answer it felt familiar
 * 2 - Incorrect response, but correct answer seemed easy to recall
 * 3 - Correct response with serious difficulty
 * 4 - Correct response after hesitation
 * 5 - Perfect response, instant recall
 */

export interface SM2Result {
  interval: number      // days until next review
  easeFactor: number    // new ease factor (min 1.3)
  repetitions: number   // new repetition count
  nextReviewAt: Date    // absolute date of next review
}

export interface ReviewEntry {
  bookmarkId: string
  interval: number
  easeFactor: number
  repetitions: number
  nextReviewAt: Date
  lastReviewAt: Date | null
  // bookmark data for display
  tweetId: string
  text: string
  authorHandle: string
  authorName: string
  categories: { name: string; color: string }[]
}

/**
 * Calculate the next review parameters using SM-2 algorithm.
 * @param quality - Grade 0-5 of how well the user recalled the bookmark
 * @param currentInterval - Current interval in days
 * @param currentEaseFactor - Current ease factor (default 2.5)
 * @param currentRepetitions - Current number of successful reviews
 */
export function calculateNextReview(
  quality: number,
  currentInterval: number,
  currentEaseFactor: number,
  currentRepetitions: number
): SM2Result {
  // Clamp quality to valid range
  const q = Math.max(0, Math.min(5, Math.round(quality)))

  let interval: number
  let easeFactor = currentEaseFactor
  let repetitions = currentRepetitions

  if (q < 3) {
    // Failed recall: reset to beginning
    repetitions = 0
    interval = 1
  } else {
    // Successful recall: calculate new interval
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(currentInterval * easeFactor)
    }
    repetitions += 1

    // Update ease factor based on quality
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  }

  // Ease factor minimum is 1.3
  if (easeFactor < 1.3) easeFactor = 1.3

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + interval)
  nextReviewAt.setHours(0, 0, 0, 0) // midnight

  return { interval, easeFactor, repetitions, nextReviewAt }
}

/**
 * Map a simple 3-button UI to SM-2 quality grades.
 * "Again" = 1, "Hard" = 3, "Good" = 5
 */
export function qualityFromButton(button: 'again' | 'hard' | 'good'): number {
  switch (button) {
    case 'again': return 1
    case 'hard': return 3
    case 'good': return 5
  }
}

/**
 * Check if a bookmark is due for review today (or overdue).
 */
export function isDue(nextReviewAt: Date): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(nextReviewAt)
  due.setHours(0, 0, 0, 0)
  return due <= now
}

/**
 * Get the number of days until next review (negative = overdue by that many days).
 */
export function daysUntilReview(nextReviewAt: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(nextReviewAt)
  due.setHours(0, 0, 0, 0)
  const diff = due.getTime() - now.getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

/**
 * Format the due status for display.
 */
export function formatDueStatus(nextReviewAt: Date): string {
  const days = daysUntilReview(nextReviewAt)
  if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}
