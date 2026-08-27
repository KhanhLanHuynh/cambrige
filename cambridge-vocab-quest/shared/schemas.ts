import { z } from 'zod'

export const cambridgeLevelSchema = z.enum(['Starters', 'Movers', 'Flyers', 'Preliminary'])
export const wordHealthSchema = z.enum(['Healthy', 'At risk', 'Warming', 'New'])

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(128),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
})

export const parentGateSchema = z.object({
  password: z.string().min(1).max(128),
})

export const parentUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
}).superRefine((value, context) => {
  if (value.name === undefined && value.email === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Provide at least one field to update',
      path: ['name'],
    })
  }
})

export const questClaimSchema = z.object({
  questId: z.string().trim().min(1).max(40),
})

/** Max learners an adult account may create. */
export const MAX_LEARNERS_PER_PARENT = 5

export const learnerCreateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  avatar: z.string().trim().min(1).max(40).default('owl'),
  level: cambridgeLevelSchema.default('Starters'),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
})

export const learnerUpdateSchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  avatar: z.string().trim().min(1).max(40).optional(),
  level: cambridgeLevelSchema.optional(),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  clearPin: z.boolean().optional(),
}).superRefine((value, context) => {
  if (value.pin !== undefined && value.clearPin) {
    context.addIssue({
      code: 'custom',
      message: 'Provide a new PIN or clear the PIN, not both',
      path: ['pin'],
    })
  }
  if (
    value.name === undefined
    && value.avatar === undefined
    && value.level === undefined
    && value.pin === undefined
    && !value.clearPin
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Provide at least one field to update',
      path: ['name'],
    })
  }
})

export const learnerSelectSchema = z.object({
  learnerId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
})

export const quizCreateSchema = z.object({
  count: z.number().int().min(1).max(20).default(10),
  level: cambridgeLevelSchema.optional(),
  category: z.string().trim().max(40).optional(),
  mode: z.enum(['explorer', 'speed-match', 'fill-blank', 'swap-words']).default('explorer'),
  mapStop: z.enum(['space-station', 'nature-valley', 'crystal-caves', 'dragon-ridge']).optional(),
  focusWordIds: z.array(z.string().min(1).max(80)).max(5).optional(),
  reviewOnly: z.boolean().optional(),
})

export const quizAnswerSchema = z.object({
  wordId: z.string().min(1),
  answer: z.string().trim().min(1).max(120),
})

export const settingsSchema = z.object({
  learnerId: z.string().uuid().optional(),
  dailyGoal: z.number().int().min(1).max(50).optional(),
  dailyLimitMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]).optional(),
  reviewMix: z.union([z.literal(10), z.literal(25), z.literal(40)]).optional(),
  timedModesEnabled: z.boolean().optional(),
  focusMode: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  hintsEnabled: z.boolean().optional(),
  speedMatchSeconds: z.union([
    z.literal(45),
    z.literal(60),
    z.literal(90),
    z.literal(120),
    z.literal(150),
  ]).optional(),
})

export const settingsQuerySchema = z.object({
  learnerId: z.string().uuid().optional(),
})

export const assignmentSchema = z.object({
  learnerId: z.string().uuid(),
  level: cambridgeLevelSchema,
  categories: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  dueDate: z.string().date().optional(),
})

export const giftDefinitionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  costGems: z.number().int().min(1),
})

export const giftCatalogSchema = z.object({
  gifts: z.array(giftDefinitionSchema).max(12),
})

export const giftRequestSchema = z.object({
  giftId: z.string().uuid(),
})

export const vocabularyIdParams = z.object({
  id: z.string().trim().min(1).max(80),
})

export const vocabularySentencesSchema = z.object({
  definition: z.string().trim().min(1).max(300),
  definitionVi: z.string().trim().max(300),
  sentences: z.array(z.string().trim().min(1).max(200)).max(20),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ParentUpdateInput = z.infer<typeof parentUpdateSchema>
export type LearnerCreateInput = z.infer<typeof learnerCreateSchema>
export type LearnerUpdateInput = z.infer<typeof learnerUpdateSchema>
export type QuizCreateInput = z.infer<typeof quizCreateSchema>
export type SettingsInput = z.infer<typeof settingsSchema>
export type GiftCatalogInput = z.infer<typeof giftCatalogSchema>
export type GiftRequestInput = z.infer<typeof giftRequestSchema>
