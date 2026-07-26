import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Learner, User } from '../types'

interface SessionState {
  user: User | null
  learners: Learner[]
  activeLearnerId: string | null
  adultUnlocked: boolean
  hydrated: boolean
  signIn: (user: User) => void
  signOut: () => void
  addLearner: (learner: Learner) => void
  setLearners: (learners: Learner[], activeLearnerId?: string | null) => void
  selectLearner: (id: string) => void
  unlockAdult: () => void
  lockAdult: () => void
  setHydrated: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      learners: [],
      activeLearnerId: null,
      adultUnlocked: false,
      hydrated: false,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null, learners: [], activeLearnerId: null, adultUnlocked: false }),
      addLearner: (learner) => set((state) => ({ learners: [...state.learners, learner] })),
      setLearners: (learners, activeLearnerId = null) => set({ learners, activeLearnerId }),
      selectLearner: (activeLearnerId) => set({ activeLearnerId, adultUnlocked: false }),
      unlockAdult: () => set({ adultUnlocked: true }),
      lockAdult: () => set({ adultUnlocked: false }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'cvq-session',
      partialize: (state) => ({
        user: state.user,
        learners: state.learners,
        activeLearnerId: state.activeLearnerId,
      }),
    },
  ),
)

interface QuestState {
  index: number
  xp: number
  streak: number
  answers: Record<string, boolean>
  recordAnswer: (wordId: string, correct: boolean, gems?: number) => void
  next: (length: number) => void
  reset: () => void
}

export const useQuestStore = create<QuestState>((set) => ({
  index: 0,
  xp: 0,
  streak: 0,
  answers: {},
  recordAnswer: (wordId, correct, gems = 10) =>
    set((state) => ({
      answers: { ...state.answers, [wordId]: correct },
      xp: state.xp + (correct ? gems : 0),
      streak: correct ? state.streak + 1 : 0,
    })),
  next: (length) => set((state) => ({ index: Math.min(state.index + 1, Math.max(0, length - 1)) })),
  reset: () => set({ index: 0, xp: 0, streak: 0, answers: {} }),
}))
