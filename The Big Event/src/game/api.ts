import type { Message, Resident } from './types'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

export async function fetchResident() {
  const res = await fetch(`${SERVER_URL}/api/resident`)
  return res.json()
}

export async function chatWithResident(conversation: Message[], resident: Resident, sessionId: string) {
  const res = await fetch(`${SERVER_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation, resident, sessionId }),
  })
  return res.json()
}

export async function evaluateConversation(conversation: Message[], resident: Resident, sessionId: string) {
  const res = await fetch(`${SERVER_URL}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation, resident, sessionId }),
  })
  return res.json()
}

export async function fetchSessionHistory(sessionId: string) {
  const res = await fetch(`${SERVER_URL}/api/session/${sessionId}`)
  return res.json()
}
