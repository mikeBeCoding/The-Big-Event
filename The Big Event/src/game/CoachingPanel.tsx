import type { EvaluationResult } from './types'

interface CoachingPanelProps {
  result: EvaluationResult | null
  onNextResident: () => void
}

export default function CoachingPanel({ result, onNextResident }: CoachingPanelProps) {
  if (!result) return null

  const {
    scores: {
      customerSatisfaction,
      discoveryScore,
      salesEffectiveness,
      eventSuccessScore,
    },
    feedback,
    coach,
  } = result

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Session Complete</h2>
          <p className="text-blue-200 mt-1">Here's how you performed</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Scores Grid */}
          <div className="grid grid-cols-2 gap-4">
            <ScoreCard
              label="Customer Satisfaction"
              score={customerSatisfaction}
            />
            <ScoreCard label="Discovery Score" score={discoveryScore} />
            <ScoreCard
              label="Sales Effectiveness"
              score={salesEffectiveness}
            />
            <ScoreCard
              label="Event Success Score"
              score={eventSuccessScore}
              isMain
            />
          </div>

          {/* Feedback */}
          {feedback && feedback.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Strengths</h3>
              <ul className="space-y-2">
                {feedback.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-green-200 text-sm"
                  >
                    <span className="text-lg">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coaching */}
          {coach && coach.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Coaching Tips</h3>
              <ul className="space-y-2">
                {coach.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-amber-200 text-sm">
                    <span className="text-lg">💡</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw output for debugging */}
          {result.raw !== undefined && result.raw !== null && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-400">
                Raw evaluation data
              </summary>
              <pre className="mt-2 p-2 bg-gray-800 rounded overflow-auto max-h-40">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 p-4 flex gap-3 justify-end">
          <button
            onClick={onNextResident}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Next Resident
          </button>
        </div>
      </div>
    </div>
  )
}

function ScoreCard({
  label,
  score,
  isMain,
}: {
  label: string
  score: number
  isMain?: boolean
}) {
  const getScoreColor = (s: number) => {
    if (s >= 85) return 'text-green-400'
    if (s >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreBg = (s: number) => {
    if (s >= 85) return 'bg-green-900/30 border-green-700'
    if (s >= 70) return 'bg-yellow-900/30 border-yellow-700'
    return 'bg-red-900/30 border-red-700'
  }

  return (
    <div
      className={`p-4 rounded-lg border-2 transition-all ${getScoreBg(
        score
      )} ${isMain ? 'col-span-2' : ''}`}
    >
      <div className="text-sm text-gray-300 mb-2">{label}</div>
      <div
        className={`text-3xl font-bold ${getScoreColor(score)}`}
      >
        {score}
        <span className="text-lg text-gray-400">/100</span>
      </div>
      {/* Score bar */}
      <div className="mt-2 w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${
            score >= 85
              ? 'bg-green-500'
              : score >= 70
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

