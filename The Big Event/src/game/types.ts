export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export type OpennessStage = 'Closed' | 'Curious' | 'Engaged' | 'Receptive'

export const DIFFICULTY_EMOJI: Record<Difficulty, string> = {
  Easy: '🟢',
  Medium: '🟡',
  Hard: '🔴',
}

export interface Resident {
  name: string
  age: number
  mood: string
  category: string
  problem: string
  intro: string
  conversationStarter?: string
  householdSize?: number
  deviceCount?: number
  usagePattern?: string
  existingProvider?: string
  budgetConcern?: string
  budgetNote?: string
  location?: string
  personaNote?: string
  challengeDetail?: string
  difficulty?: Difficulty
  region?: string
  city?: string
  timeInCommunity?: string
  internetProvider?: string | null
  mobileProvider?: string | null
  mobileLines?: number
  currentMonthlyCost?: number
  pricingConcern?: boolean
}

export interface RatePlan {
  plan: string
  promo: number
  standard: number
}

export interface RateCard {
  guaranteeYears: number
  mobilePromoMonths: number
  internet: RatePlan[]
  mobile: RatePlan[]
  notes: string
}

export interface Message {
  role: 'resident' | 'player'
  text: string
  // Resident's openness after this reply; echoed back so the server stays stateless.
  stage?: OpennessStage
}

export type SkillKey =
  | 'openEndedQuestions'
  | 'discoveryDepth'
  | 'activeListening'
  | 'needsIdentification'
  | 'objectionHandling'
  | 'pricingKnowledge'
  | 'postPromoAwareness'
  | 'valuePositioning'
  | 'solutionFit'
  | 'rapport'

export interface EvaluationResult {
  scores: {
    customerSatisfaction: number
    discoveryScore: number
    salesEffectiveness: number
    eventSuccessScore: number
  }
  skills?: Partial<Record<SkillKey, number | null>>
  feedback: string[]
  coach: string[]
  difficulty?: Difficulty
  journey?: OpennessStage[]
  multiplier?: number
  eventPoints?: number
  raw?: unknown
}

export interface HistoryMessage {
  role: string
  text: string
  createdAt: string
}

export interface HistoryEvaluation {
  payload: unknown
  createdAt: string
}

export interface SessionHistory {
  session: {
    id: string
    createdAt: string
    updatedAt: string
    resident: Resident
  }
  history: {
    messages: HistoryMessage[]
    evaluations: HistoryEvaluation[]
  }
}
