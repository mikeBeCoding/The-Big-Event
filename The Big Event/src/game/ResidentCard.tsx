import type { Resident } from './types'

export default function ResidentCard({ resident }: { resident: Resident | null }) {
  if (!resident) return null
  return (
    <div className="p-4 border rounded shadow bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">{resident.name}, {resident.age}</h3>
          <p className="text-sm text-gray-600">{resident.category} · Mood: {resident.mood}</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-slate-500">{resident.budgetConcern || 'Standard'}</span>
      </div>
      <p className="mt-3 text-sm text-slate-700">{resident.intro}</p>
      <p className="mt-2 italic text-xs text-slate-500">Problem: {resident.problem}</p>
      {resident.challengeDetail && <p className="mt-2 text-xs text-slate-500">{resident.challengeDetail}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
        {resident.existingProvider && <div><strong>Provider:</strong> {resident.existingProvider}</div>}
        {resident.location && <div><strong>Location:</strong> {resident.location}</div>}
        {resident.householdSize !== undefined && <div><strong>Household:</strong> {resident.householdSize}</div>}
        {resident.deviceCount !== undefined && <div><strong>Devices:</strong> {resident.deviceCount}</div>}
      </div>
      {resident.usagePattern && <p className="mt-3 text-sm text-slate-700"><strong>Usage:</strong> {resident.usagePattern}</p>}
      {resident.personaNote && <p className="mt-2 text-xs text-slate-500">{resident.personaNote}</p>}
    </div>
  )
}
