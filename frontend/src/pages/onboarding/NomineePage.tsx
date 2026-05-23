import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { onboardingService } from '../../services/onboardingService'
import { useDraft } from '../../hooks/useDraft'

const RELATIONSHIPS = [
  'SPOUSE', 'SON', 'DAUGHTER', 'FATHER', 'MOTHER',
  'BROTHER', 'SISTER', 'GRANDFATHER', 'GRANDMOTHER',
  'GRANDSON', 'GRANDDAUGHTER', 'OTHER',
]

interface NomineeForm {
  fullName:     string
  relationship: string
  dob:          string
  percentage:   number
  guardianName: string
  guardianRel:  string
}

const emptyNominee = (): NomineeForm => ({
  fullName: '', relationship: '', dob: '', percentage: 100, guardianName: '', guardianRel: '',
})

function isMinor(dob: string): boolean {
  if (!dob) return false
  const age = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return age < 18
}

export default function NomineePage() {
  const navigate  = useNavigate()
  const draft = useDraft<NomineeForm[]>('onboarding_nominees')
  const [nominees, setNominees] = useState<NomineeForm[]>([emptyNominee()])
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [errors, setErrors]     = useState<Record<string, string>>({})

  // Load: try localStorage draft (nominees have no GET endpoint yet)
  useEffect(() => {
    const saved = draft.load()
    if (saved && saved.length > 0) {
      setNominees(saved)
      toast('Draft restored', { icon: '📝' })
    }
    setFetching(false)
  }, []) // eslint-disable-line

  // Auto-save on every change
  useEffect(() => {
    if (!fetching) draft.save(nominees)
  }, [nominees, fetching]) // eslint-disable-line

  const totalPct = nominees.reduce((s, n) => s + Number(n.percentage || 0), 0)

  function setNominee(i: number, field: keyof NomineeForm, value: string | number) {
    setNominees((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  function addNominee() {
    if (nominees.length >= 3) return
    // Auto-distribute percentages
    const remaining = 100 - nominees.reduce((s, n) => s + Number(n.percentage || 0), 0)
    setNominees((prev) => [...prev, { ...emptyNominee(), percentage: Math.max(0, remaining) }])
  }

  function removeNominee(i: number) {
    if (nominees.length === 1) return
    const removed = nominees[i].percentage
    const next = nominees.filter((_, idx) => idx !== i)
    // Give removed % to first nominee
    if (next.length > 0) next[0].percentage = Number(next[0].percentage) + Number(removed)
    setNominees(next)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    nominees.forEach((n, i) => {
      if (!n.fullName.trim())  errs[`${i}.fullName`]     = 'Name required'
      if (!n.relationship)     errs[`${i}.relationship`] = 'Relationship required'
      if (!n.percentage || n.percentage < 1)
                               errs[`${i}.percentage`]   = 'Min 1%'
      if (isMinor(n.dob) && !n.guardianName.trim())
                               errs[`${i}.guardianName`] = 'Guardian name required for minor nominee'
    })
    if (totalPct !== 100) errs['total'] = `Total must be exactly 100% (currently ${totalPct}%)`
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const payload = nominees.map((n) => ({
        fullName:     n.fullName.trim(),
        relationship: n.relationship,
        dob:          n.dob || undefined,
        percentage:   Number(n.percentage),
        guardianName: n.guardianName.trim() || undefined,
        guardianRel:  n.guardianRel.trim() || undefined,
      }))
      await onboardingService.saveNominees(payload)
      draft.clear()
      toast.success('Nominees saved successfully!')
      navigate('/onboarding/bank')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save nominees')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-sparrow-blue border-t-transparent rounded-full" />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nominee Details</h1>
        <p className="text-gray-500 mt-1 text-sm">Add up to 3 nominees. Total allocation must equal 100%.</p>
      </div>

      {/* Total bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Total Allocation</span>
          <span className={`text-sm font-bold ${totalPct === 100 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPct}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${totalPct > 100 ? 'bg-red-500' : totalPct === 100 ? 'bg-green-500' : 'bg-sparrow-blue'}`}
            style={{ width: `${Math.min(totalPct, 100)}%` }}
          />
        </div>
        {errors.total && <p className="text-red-500 text-xs mt-2">{errors.total}</p>}
      </div>

      {/* Nominee cards */}
      {nominees.map((n, i) => (
        <div key={i} className="card space-y-4">
          {/* Card header */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h2 className="text-base font-semibold text-gray-800">Nominee {i + 1}</h2>
            {nominees.length > 1 && (
              <button
                type="button"
                onClick={() => removeNominee(i)}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Remove
              </button>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              placeholder="As per Aadhaar / PAN"
              value={n.fullName}
              onChange={(e) => setNominee(i, 'fullName', e.target.value)}
            />
            {errors[`${i}.fullName`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}.fullName`]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Relationship */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship <span className="text-red-500">*</span>
              </label>
              <select
                className="input-field"
                value={n.relationship}
                onChange={(e) => setNominee(i, 'relationship', e.target.value)}
              >
                <option value="">Select</option>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                ))}
              </select>
              {errors[`${i}.relationship`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}.relationship`]}</p>}
            </div>

            {/* Allocation % */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allocation % <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="input-field"
                min={1}
                max={100}
                value={n.percentage}
                onChange={(e) => setNominee(i, 'percentage', Number(e.target.value))}
              />
              {errors[`${i}.percentage`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}.percentage`]}</p>}
            </div>
          </div>

          {/* DOB */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              className="input-field"
              value={n.dob}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setNominee(i, 'dob', e.target.value)}
            />
            {n.dob && isMinor(n.dob) && (
              <p className="text-yellow-600 text-xs mt-1">⚠️ Minor — Guardian details required</p>
            )}
          </div>

          {/* Guardian fields (only if minor) */}
          {n.dob && isMinor(n.dob) && (
            <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-3 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="input-field"
                  placeholder="Guardian full name"
                  value={n.guardianName}
                  onChange={(e) => setNominee(i, 'guardianName', e.target.value)}
                />
                {errors[`${i}.guardianName`] && <p className="text-red-500 text-xs mt-1">{errors[`${i}.guardianName`]}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Relation</label>
                <input
                  className="input-field"
                  placeholder="e.g. Father"
                  value={n.guardianRel}
                  onChange={(e) => setNominee(i, 'guardianRel', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add nominee button */}
      {nominees.length < 3 && (
        <button
          type="button"
          onClick={addNominee}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-sparrow-blue hover:text-sparrow-blue transition-colors"
        >
          + Add Another Nominee ({nominees.length}/3)
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => navigate('/onboarding/address')}
          className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-6 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving…' : 'Save & Continue →'}
        </button>
      </div>
    </form>
  )
}
