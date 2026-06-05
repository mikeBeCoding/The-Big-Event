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
}

export interface Message {
  role: 'resident' | 'player'
  text: string
}

export interface EvaluationResult {
  scores: {
    customerSatisfaction: number
    discoveryScore: number
    salesEffectiveness: number
    eventSuccessScore: number
  }
  feedback: string[]
  coach: string[]
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
