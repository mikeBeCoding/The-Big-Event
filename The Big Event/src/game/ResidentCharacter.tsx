import { useEffect, useState } from 'react'
import type { Resident } from './types'

interface ResidentCharacterProps {
  resident: Resident | null
  isWalking: boolean
}

const MOOD_EMOJI: Record<string, string> = {
  Excited: '😊',
  Frustrated: '😠',
  Concerned: '😐',
  Curious: '🤔',
  Stressed: '😟',
  'Budget-conscious': '💭',
  Skeptical: '🤨',
  Organized: '🧠',
  'Busy Parent': '👩‍👧',
  Ambitious: '🎯',
  Practical: '🔧',
  Determined: '💪',
  'Community-minded': '🤝',
  Overwhelmed: '😰',
  Cautious: '⚠️',
  Anxious: '😰',
  Inquisitive: '🔍',
}

export default function ResidentCharacter({
  resident,
  isWalking,
}: ResidentCharacterProps) {
  const [position, setPosition] = useState(100) // Start offscreen (100%)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isWalking) return

    let animationId: number
    let currentPos = 100

    const walkToTable = () => {
      currentPos -= 1
      setPosition(currentPos)

      if (currentPos > 10) {
        animationId = requestAnimationFrame(walkToTable)
      }
    }

    animationId = requestAnimationFrame(walkToTable)
    return () => cancelAnimationFrame(animationId)
  }, [isWalking])

  if (!resident) return null

  const face = MOOD_EMOJI[resident.mood] ?? '👤'

  return (
    <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
      {/* Character positioned based on walk progress, anchored above the booth */}
      <div
        className="transition-all duration-300"
        style={{
          transform: `translateX(${position}%) translateY(${isMobile ? -150 : -210}px) scale(${
            (isMobile ? 0.7 : 0.85) + position * 0.0015
          })`,
        }}
      >
        <div className="flex items-start gap-4">
          {/* Character avatar */}
          <div className="relative w-32 h-44">
            {/* Head */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-b from-amber-100 to-amber-200 rounded-full shadow-lg ring-2 ring-amber-300/70 flex items-center justify-center text-5xl select-none">
              {face}
            </div>

            {/* Arms */}
            <div className="absolute top-28 left-1 w-5 h-16 bg-blue-500 rounded-full shadow-sm rotate-6" />
            <div className="absolute top-28 right-1 w-5 h-16 bg-blue-500 rounded-full shadow-sm -rotate-6" />

            {/* Torso (shirt with rounded shoulders) */}
            <div className="absolute top-[5.75rem] left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-b from-blue-500 to-blue-700 rounded-t-[3rem] rounded-b-md shadow-md" />

            {/* Legs */}
            <div className="absolute top-[11.5rem] left-1/2 -translate-x-1/2 flex gap-2">
              <div className="w-5 h-7 bg-gray-700 rounded-b-md shadow-sm" />
              <div className="w-5 h-7 bg-gray-700 rounded-b-md shadow-sm" />
            </div>
          </div>

          {/* Name tag beside the character */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-xl px-4 py-2 shadow-lg border border-gray-200 whitespace-nowrap">
            <div className="text-base font-bold text-gray-900 leading-tight">
              {resident.name}
            </div>
            <div className="text-xs font-medium text-gray-500">
              {resident.category}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
