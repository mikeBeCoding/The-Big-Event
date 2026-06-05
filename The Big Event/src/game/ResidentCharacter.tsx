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

// --- Mood-driven facial expression ----------------------------------------

type Expression =
  | 'happy'
  | 'confident'
  | 'angry'
  | 'worried'
  | 'curious'
  | 'skeptical'
  | 'neutral'

const MOOD_EXPRESSION: Record<string, Expression> = {
  Excited: 'happy',
  Frustrated: 'angry',
  Concerned: 'worried',
  Curious: 'curious',
  Stressed: 'worried',
  'Budget-conscious': 'neutral',
  Skeptical: 'skeptical',
  Organized: 'confident',
  'Busy Parent': 'neutral',
  Ambitious: 'confident',
  Practical: 'neutral',
  Determined: 'confident',
  'Community-minded': 'happy',
  Overwhelmed: 'worried',
  Cautious: 'worried',
  Anxious: 'worried',
  Inquisitive: 'curious',
}

interface BrowCfg {
  top: number // px from top of the head
  rot: number // degrees
}

type MouthShape = 'smile' | 'frown' | 'flat' | 'o'

const FACES: Record<
  Expression,
  { l: BrowCfg; r: BrowCfg; mouth: MouthShape }
> = {
  happy: { l: { top: 33, rot: -6 }, r: { top: 33, rot: 6 }, mouth: 'smile' },
  confident: { l: { top: 34, rot: 0 }, r: { top: 34, rot: 0 }, mouth: 'smile' },
  angry: { l: { top: 37, rot: 18 }, r: { top: 37, rot: -18 }, mouth: 'frown' },
  worried: { l: { top: 31, rot: -16 }, r: { top: 31, rot: 16 }, mouth: 'frown' },
  curious: { l: { top: 29, rot: -4 }, r: { top: 29, rot: 4 }, mouth: 'o' },
  skeptical: { l: { top: 37, rot: 0 }, r: { top: 28, rot: -14 }, mouth: 'flat' },
  neutral: { l: { top: 34, rot: 0 }, r: { top: 34, rot: 0 }, mouth: 'flat' },
}

function Mouth({ shape }: { shape: MouthShape }) {
  const base = 'absolute left-1/2 -translate-x-1/2'
  if (shape === 'smile')
    return (
      <div
        className={`${base} top-[60%] w-8 h-4 border-b-[3px] border-gray-700 rounded-b-full`}
      />
    )
  if (shape === 'frown')
    return (
      <div
        className={`${base} top-[68%] w-7 h-4 border-t-[3px] border-gray-700 rounded-t-full`}
      />
    )
  if (shape === 'o')
    return (
      <div
        className={`${base} top-[63%] w-3.5 h-4 border-[3px] border-gray-700 rounded-full`}
      />
    )
  return (
    <div className={`${base} top-[66%] w-6 h-[3px] bg-gray-700 rounded-full`} />
  )
}

// --- Per-resident appearance (deterministic from the name) -----------------

// Full literal class strings so Tailwind's JIT picks them up.
const SKIN_TONES = [
  'from-amber-100 to-amber-200',
  'from-orange-200 to-orange-300',
  'from-amber-200 to-amber-400',
  'from-orange-300 to-amber-600',
  'from-rose-200 to-rose-300',
  'from-amber-700 to-amber-900',
  'from-stone-500 to-stone-700',
]

const HAIR_COLORS = [
  'bg-stone-800',
  'bg-amber-900',
  'bg-yellow-700',
  'bg-yellow-500',
  'bg-orange-800',
  'bg-gray-400',
]

const SHIRTS = [
  { arm: 'bg-blue-500', torso: 'from-blue-500 to-blue-700' },
  { arm: 'bg-emerald-500', torso: 'from-emerald-500 to-emerald-700' },
  { arm: 'bg-purple-500', torso: 'from-purple-500 to-purple-700' },
  { arm: 'bg-rose-500', torso: 'from-rose-500 to-rose-700' },
  { arm: 'bg-teal-500', torso: 'from-teal-500 to-teal-700' },
  { arm: 'bg-orange-500', torso: 'from-orange-500 to-orange-700' },
  { arm: 'bg-indigo-500', torso: 'from-indigo-500 to-indigo-700' },
]

const PANTS = ['bg-gray-700', 'bg-slate-800', 'bg-blue-900', 'bg-stone-700']

function pick<T>(arr: T[], name: string, salt: number): T {
  let h = salt
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return arr[h % arr.length]
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
  const expression = MOOD_EXPRESSION[resident.mood] ?? 'neutral'
  const faceCfg = FACES[expression]

  const skin = pick(SKIN_TONES, resident.name, 1)
  const hair = pick(HAIR_COLORS, resident.name, 2)
  const shirt = pick(SHIRTS, resident.name, 3)
  const pants = pick(PANTS, resident.name, 4)

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
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-b ${skin} rounded-full shadow-lg ring-2 ring-black/10`}
            >
              {/* Hair */}
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-[5.5rem] h-7 rounded-t-full ${hair}`}
              />

              {/* Eyes */}
              <div className="absolute top-[44%] left-[24%] w-2.5 h-3 bg-gray-800 rounded-full">
                <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full" />
              </div>
              <div className="absolute top-[44%] right-[24%] w-2.5 h-3 bg-gray-800 rounded-full">
                <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full" />
              </div>

              {/* Eyebrows (angle conveys mood) */}
              <div
                className="absolute left-[20%] w-4 h-1 bg-gray-800 rounded-full"
                style={{
                  top: faceCfg.l.top,
                  transform: `rotate(${faceCfg.l.rot}deg)`,
                }}
              />
              <div
                className="absolute right-[20%] w-4 h-1 bg-gray-800 rounded-full"
                style={{
                  top: faceCfg.r.top,
                  transform: `rotate(${faceCfg.r.rot}deg)`,
                }}
              />

              {/* Mouth */}
              <Mouth shape={faceCfg.mouth} />
            </div>

            {/* Thought bubble showing the mood */}
            <div className="absolute -top-3 right-0 translate-x-1/3">
              <div className="bg-white/95 backdrop-blur rounded-2xl px-2.5 py-1.5 shadow-lg border border-gray-200 text-3xl leading-none select-none">
                {face}
              </div>
              <div className="absolute -bottom-1.5 left-3 w-2.5 h-2.5 bg-white/95 border border-gray-200 rounded-full" />
              <div className="absolute -bottom-3.5 left-1 w-1.5 h-1.5 bg-white/95 border border-gray-200 rounded-full" />
            </div>

            {/* Arms */}
            <div
              className={`absolute top-28 left-1 w-5 h-16 ${shirt.arm} rounded-full shadow-sm rotate-6`}
            />
            <div
              className={`absolute top-28 right-1 w-5 h-16 ${shirt.arm} rounded-full shadow-sm -rotate-6`}
            />

            {/* Torso (shirt with rounded shoulders) */}
            <div
              className={`absolute top-[5.75rem] left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-b ${shirt.torso} rounded-t-[3rem] rounded-b-md shadow-md`}
            />

            {/* Legs */}
            <div className="absolute top-[11.5rem] left-1/2 -translate-x-1/2 flex gap-2">
              <div className={`w-5 h-7 ${pants} rounded-b-md shadow-sm`} />
              <div className={`w-5 h-7 ${pants} rounded-b-md shadow-sm`} />
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
