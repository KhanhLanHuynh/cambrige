import type { AttemptRecord, LearnerRecord, QuizRecord, RedemptionRecord } from './store.js'
import { healthForAttempts, todayKey } from './store.js'

export interface AchievementDef {
  id: string
  icon: string
  label: string
  description: string
}

export interface AchievementContext {
  quizzes?: QuizRecord[]
  redemptions?: RedemptionRecord[]
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_quiz', icon: '🌟', label: 'Quiz Expert', description: 'Complete your first quiz' },
  { id: 'streak_3', icon: '🌤️', label: 'Getting Warm', description: 'Reach a 3-day streak' },
  { id: 'streak_7', icon: '🔥', label: 'Week Warrior', description: 'Reach a 7-day streak' },
  { id: 'streak_14', icon: '🔥', label: 'Fortnight Flame', description: 'Reach a 14-day streak' },
  { id: 'streak_30', icon: '🏆', label: 'Month Master', description: 'Reach a 30-day streak' },
  { id: 'correct_10', icon: '🌱', label: 'First Ten', description: 'Answer 10 words correctly' },
  { id: 'correct_50', icon: '🥉', label: 'Word Master', description: 'Answer 50 words correctly' },
  { id: 'correct_150', icon: '💎', label: 'Crystal Collector', description: 'Answer 150 words correctly' },
  { id: 'correct_300', icon: '🐉', label: 'Dragon Scholar', description: 'Answer 300 words correctly' },
  { id: 'correct_500', icon: '👑', label: 'Vocab Legend', description: 'Answer 500 words correctly' },
  { id: 'healthy_5', icon: '🌿', label: 'Sprout Guard', description: 'Keep 5 words healthy' },
  { id: 'healthy_20', icon: '🌌', label: 'Space Explorer', description: 'Keep 20 words healthy' },
  { id: 'healthy_50', icon: '💠', label: 'Crystal Keeper', description: 'Keep 50 words healthy' },
  { id: 'healthy_100', icon: '💚', label: 'Health Hero', description: 'Keep 100 words healthy' },
  { id: 'map_space', icon: '🚀', label: 'Lift Off', description: 'Unlock Space Station' },
  { id: 'map_crystal', icon: '⛏️', label: 'Cave Crawler', description: 'Unlock Crystal Caves' },
  { id: 'map_dragon', icon: '🐲', label: 'Dragon Rider', description: 'Unlock Dragon Ridge' },
  { id: 'perfect_quiz', icon: '✨', label: 'Flawless Explorer', description: 'Get every answer right in one Explorer quiz' },
  { id: 'perfect_3', icon: '🎯', label: 'Triple Perfect', description: 'Complete 3 perfect Explorer quizzes' },
  { id: 'comeback_kid', icon: '💪', label: 'Comeback Kid', description: 'Bring an At risk word back to Healthy' },
  { id: 'speed_runner', icon: '⚡', label: 'Speed Runner', description: 'Finish a Speed Match game' },
  { id: 'speed_perfect', icon: '💨', label: 'Lightning Match', description: 'Finish a Speed Match with no mistakes' },
  { id: 'speed_3', icon: '🏁', label: 'Triple Dash', description: 'Finish 3 Speed Match games' },
  { id: 'daily_goal', icon: '✅', label: 'Goal Getter', description: 'Reach your daily word goal' },
  { id: 'daily_goal_7', icon: '📅', label: 'Goal Streak', description: 'Reach your daily goal 7 days in a row' },
  { id: 'quest_first', icon: '📜', label: 'Quest Starter', description: 'Claim your first daily quest reward' },
  { id: 'quest_bonus', icon: '🏅', label: 'Daily Champion', description: 'Claim the all-quests bonus in one day' },
  { id: 'gems_100', icon: '💎', label: 'Gem Gatherer', description: 'Earn 100 gems' },
  { id: 'gems_500', icon: '💰', label: 'Treasure Hunter', description: 'Earn 500 gems' },
  { id: 'gift_first', icon: '🎁', label: 'Wish Granted', description: 'Redeem your first gift' },
]

function attemptsByDay(attempts: AttemptRecord[]): Map<string, number> {
  const byDay = new Map<string, number>()
  for (const attempt of attempts) {
    const day = attempt.answeredAt.slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + 1)
  }
  return byDay
}

function consecutiveDailyGoalDays(attempts: AttemptRecord[], dailyGoal: number, today = todayKey()): number {
  const byDay = attemptsByDay(attempts)
  let streak = 0
  let cursor = new Date(`${today}T00:00:00.000Z`)
  if ((byDay.get(today) ?? 0) < dailyGoal) {
    cursor = new Date(cursor.getTime() - 86_400_000)
  }
  for (;;) {
    const key = cursor.toISOString().slice(0, 10)
    if ((byDay.get(key) ?? 0) >= dailyGoal) {
      streak += 1
      cursor = new Date(cursor.getTime() - 86_400_000)
    } else {
      break
    }
  }
  return streak
}

function lifetimeGemsEarned(learner: LearnerRecord, redemptions: RedemptionRecord[]): number {
  const spent = redemptions
    .filter((item) => item.learnerId === learner.id && item.status === 'approved')
    .reduce((sum, item) => sum + item.costGems, 0)
  return learner.gems + spent
}

function completedSpeedMatches(learnerId: string, quizzes: QuizRecord[]): number {
  return quizzes.filter(
    (quiz) =>
      quiz.learnerId === learnerId &&
      quiz.mode === 'speed-match' &&
      quiz.wordIds.length > 0 &&
      quiz.answeredWordIds.length === quiz.wordIds.length,
  ).length
}

export function evaluateAchievements(
  learner: LearnerRecord,
  attempts: AttemptRecord[],
  context: AchievementContext = {},
): string[] {
  const unlocked = new Set(learner.achievementIds ?? [])
  const correct = attempts.filter((attempt) => attempt.correct).length
  const wordIds = [...new Set(attempts.map((attempt) => attempt.wordId))]
  const healthyCount = wordIds.filter((wordId) =>
    healthForAttempts(attempts.filter((attempt) => attempt.wordId === wordId)) === 'Healthy',
  ).length
  const quizzes = context.quizzes ?? []
  const redemptions = context.redemptions ?? []
  const gemsEarned = lifetimeGemsEarned(learner, redemptions)
  const speedCompletions = completedSpeedMatches(learner.id, quizzes)
  const dailyGoal = learner.settings.dailyGoal
  const byDay = attemptsByDay(attempts)
  const hitDailyGoal = [...byDay.values()].some((count) => count >= dailyGoal)
  const goalStreak = consecutiveDailyGoalDays(attempts, dailyGoal)
  const perfectQuizCount = learner.perfectQuizCount ?? 0
  const approvedGifts = redemptions.filter(
    (item) => item.learnerId === learner.id && item.status === 'approved',
  ).length

  if (attempts.length >= 1) unlocked.add('first_quiz')
  if (learner.streak >= 3) unlocked.add('streak_3')
  if (learner.streak >= 7) unlocked.add('streak_7')
  if (learner.streak >= 14) unlocked.add('streak_14')
  if (learner.streak >= 30) unlocked.add('streak_30')
  if (correct >= 10) unlocked.add('correct_10')
  if (correct >= 50) unlocked.add('correct_50')
  if (correct >= 150) unlocked.add('correct_150')
  if (correct >= 300) unlocked.add('correct_300')
  if (correct >= 500) unlocked.add('correct_500')
  if (healthyCount >= 5) unlocked.add('healthy_5')
  if (healthyCount >= 20) unlocked.add('healthy_20')
  if (healthyCount >= 50) unlocked.add('healthy_50')
  if (healthyCount >= 100) unlocked.add('healthy_100')
  if (correct >= 50) unlocked.add('map_space')
  if (correct >= 150) unlocked.add('map_crystal')
  if (correct >= 300) unlocked.add('map_dragon')
  if (perfectQuizCount >= 1) unlocked.add('perfect_quiz')
  if (perfectQuizCount >= 3) unlocked.add('perfect_3')
  if (speedCompletions >= 1) unlocked.add('speed_runner')
  if (speedCompletions >= 3) unlocked.add('speed_3')
  if (hitDailyGoal) unlocked.add('daily_goal')
  if (goalStreak >= 7) unlocked.add('daily_goal_7')
  if (gemsEarned >= 100) unlocked.add('gems_100')
  if (gemsEarned >= 500) unlocked.add('gems_500')
  if (approvedGifts >= 1) unlocked.add('gift_first')

  return [...unlocked]
}
