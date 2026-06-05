import { useState, type FormEvent } from 'react'
import { chatWithResident } from './api'
import type { Resident, Message } from './types'

interface EnhancedChatPanelProps {
  resident: Resident
  sessionId: string
  onEndConversation: (conversation: Message[]) => void
  isConversing: boolean
}

export default function EnhancedChatPanel({
  resident,
  sessionId,
  onEndConversation,
  isConversing,
}: EnhancedChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'resident',
      text: resident.conversationStarter || resident.intro,
    },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  async function sendPlayer(text: string) {
    const playerMsg: Message = { role: 'player', text }
    const nextConversation = [...messages, playerMsg]
    setMessages(nextConversation)
    setIsSending(true)

    try {
      const response = await chatWithResident(
        nextConversation,
        resident,
        sessionId
      )
      const replyText =
        response.reply || response.error || 'Sorry, I did not understand that.'
      setMessages((current) => [
        ...current,
        { role: 'resident', text: replyText },
      ])
    } catch (error) {
      console.error('Chat request failed', error)
      setMessages((current) => [
        ...current,
        { role: 'resident', text: 'I am having trouble answering right now.' },
      ])
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
    <div className="shrink-0 relative z-30 bg-gradient-to-t from-gray-900 to-gray-800/90 backdrop-blur border-t-2 border-gray-700 p-3 sm:p-4 shadow-2xl">
      <div className="max-w-4xl mx-auto">
        {/* Conversation history */}
        <div className="h-24 sm:h-32 overflow-y-auto mb-3 sm:mb-4 p-3 bg-gray-950/50 rounded-lg border border-gray-700 space-y-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`text-sm animate-fadeIn ${
                m.role === 'player'
                  ? 'text-right text-blue-200'
                  : 'text-left text-green-200'
              }`}
            >
              <span className="font-semibold">
                {m.role === 'player' ? 'You' : resident.name}:
              </span>{' '}
              {m.text}
            </div>
          ))}
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
          <input
            className="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-800 border border-gray-600 rounded-lg text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask an open-ended question or recommend a solution..."
            disabled={isSending || !isConversing}
          />
          <button
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={isSending || !isConversing}
          >
            {isSending ? '...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={() => onEndConversation(messages)}
            className="px-4 py-2.5 sm:px-6 sm:py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm sm:text-base font-semibold rounded-lg transition-colors"
            disabled={!isConversing}
          >
            End
          </button>
        </form>

        {/* Tips */}
        <div className="mt-2 sm:mt-3 text-[11px] sm:text-xs text-gray-400 text-center">
          💡 Ask discovery questions to uncover the resident's needs before
          recommending solutions
        </div>
      </div>
    </div>
  )
}
