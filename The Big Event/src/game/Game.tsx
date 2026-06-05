import { useEffect, useState } from 'react'
import { fetchResident as fetchResidentApi, evaluateConversation } from './api'
import Scene, { type SceneVariant } from './Scene'
import EventTable from './EventTable'
import ResidentCharacter from './ResidentCharacter'
import EnhancedChatPanel from './EnhancedChatPanel'
import CoachingPanel from './CoachingPanel'
import type { Resident, EvaluationResult, Message } from './types'

export default function Game() {
  const [resident, setResident] = useState<Resident | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isWalking, setIsWalking] = useState(false)
  const [isConversing, setIsConversing] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [sceneVariant, setSceneVariant] = useState<SceneVariant>('outdoor')

  async function loadResident() {
    setLoading(true)
    setResult(null)

    const json = await fetchResidentApi()
    setResident(json.resident)
    setSessionId(json.sessionId)
    setIsWalking(true)
    setIsConversing(false)
    setLoading(false)

    // Start walking animation
    setTimeout(() => {
      setIsConversing(true)
    }, 2000)
  }

  useEffect(() => {
    const init = async () => {
      await loadResident()
    }
    void init()
  }, [])

  async function handleEndConversation(endConversation: Message[]) {
    if (!resident || !sessionId) return
    setIsConversing(false)
    setIsWalking(false)
    const evalRes = await evaluateConversation(
      endConversation,
      resident,
      sessionId
    )
    setResult(evalRes)
  }

  async function handleNextResident() {
    await loadResident()
  }

  return (
    <div className="w-full h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Main scene area */}
      <div className="flex-1 min-h-0 relative bg-blue-300">
        {/* Animated background */}
        <Scene variant={sceneVariant} />

        {/* Resident character with walk-in animation */}
        {resident && (
          <ResidentCharacter resident={resident} isWalking={isWalking} />
        )}

        {/* Event table in foreground */}
        <EventTable />

        {/* Loading indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-gray-600 border-t-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-white font-semibold">Next resident arriving...</p>
            </div>
          </div>
        )}
      </div>

      {/* Chat panel at bottom */}
      {resident && sessionId && !result && (
        <EnhancedChatPanel
          resident={resident}
          sessionId={sessionId}
          onEndConversation={handleEndConversation}
          isConversing={isConversing}
        />
      )}

      {/* Coaching/Evaluation panel */}
      {result && (
        <CoachingPanel result={result} onNextResident={handleNextResident} />
      )}

      {/* Floating menu button (top-left) */}
      {!loading && !result && (
        <div className="absolute top-4 left-4 z-40 flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors border border-gray-600"
            title="Restart game"
          >
            ⟲ Restart
          </button>
          <button
            onClick={() =>
              setSceneVariant((v) => (v === 'outdoor' ? 'indoor' : 'outdoor'))
            }
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors border border-gray-600"
            title="Toggle event setting"
          >
            {sceneVariant === 'outdoor' ? '🏡 Courtyard' : '🛋️ Common Room'}
          </button>
        </div>
      )}
    </div>
  )
}
