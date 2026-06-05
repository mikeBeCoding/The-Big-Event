import { useState, type FormEvent } from 'react'
import { chatWithResident } from './api'
import type { Resident, Message } from './types'

interface ChatUIProps {
  resident: Resident
  sessionId: string
  onEndConversation: (conversation: Message[]) => void
}

export default function ChatUI({ resident, sessionId, onEndConversation }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'resident', text: resident.conversationStarter || resident.intro }])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function sendPlayer(text: string) {
    const playerMsg: Message = { role: 'player', text }
    const nextConversation = [...messages, playerMsg]
    setMessages(nextConversation)
    setIsSending(true)

    try {
      const response = await chatWithResident(nextConversation, resident, sessionId)
      const replyText = response.reply || response.error || 'Sorry, I did not understand that.'
      setMessages((current) => [...current, { role: 'resident', text: replyText }])
    } catch (error) {
      console.error('Chat request failed', error)
      setMessages((current) => [...current, { role: 'resident', text: 'I am having trouble answering right now.' }])
    } finally {
      setIsSending(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || isSending) return
    await sendPlayer(input.trim())
    setInput('')
  }

  return (
    <div className="mt-4">
      <div className="h-64 overflow-auto p-3 bg-gray-50 rounded">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.role === 'player' ? 'text-right' : ''}`}>
            <div className={`inline-block p-2 rounded ${m.role === 'player' ? 'bg-blue-100' : 'bg-white'}`}>
              <div className="text-sm">{m.text}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          className="flex-1 p-2 border rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask an open-ended question or recommend a solution"
          disabled={isSending}
        />
        <button className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" type="submit" disabled={isSending}>
          {isSending ? 'Waiting…' : 'Send'}
        </button>
        <button type="button" onClick={() => onEndConversation(messages)} className="px-3 py-2 bg-gray-200 rounded">
          End
        </button>
      </form>
    </div>
  )
}
