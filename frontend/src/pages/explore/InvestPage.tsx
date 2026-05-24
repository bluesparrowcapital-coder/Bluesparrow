import { useState, useEffect }           from 'react'
import { useParams, useNavigate }         from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader } from 'lucide-react'
import toast                              from 'react-hot-toast'
import { fundService, portfolioService, type Fund } from '../../services/fundService'

type Step = 'amount' | 'review' | 'success'

export default function InvestPage() {
  const { fundId } = useParams<{ fundId: string }>()
  const navigate   = useNavigate()

  const [fund,    setFund]    = useState<Fund | null>(null)
  const [loading, setLoading] = useState(true)
  const [step,    setStep]    = useState<Step>('amount')
  const [amount,  setAmount]  = useState('')
  const [amountErr, setAmountErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result,  setResult]  = useState<{
    transactionId: string; fundName: string; amount: number; units: number; nav: number
  } | null>(null)

  useEffect(() => {
    if (!fundId) return
    fundService.getById(fundId).then(setFund).finally(() => setLoading(false))
  }, [fundId])

  const validateAmount = (val: string): boolean => {
    const n = Number(val)
    if (!val || isNaN(n) || n <= 0) {
      setAmountErr('Please enter a valid amount')
      return false
    }
    const min = fund?.minLumpsum ?? 500
    if (n < min) {
      setAmountErr(`Minimum investment is ₹${min.toLocaleString('en-IN')}`)
      return false
    }
    setAmountErr('')
    return true
  }

  const handleContinue = () => {
    if (!validateAmount(amount)) return
    setStep('review')
  }

  const handleConfirm = async () => {
    if (!fundId) return
    setSubmitting(true)
    try {
      const res = await portfolioService.invest(fundId, Number(amount))
      setResult(res)
      setStep('success')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Investment failed. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const estimatedUnits = fund?.nav && Number(amount) > 0
    ? (Number(amount) / Number(fund.nav)).toFixed(4)
    : '—'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size={24} className="animate-spin text-sparrow-blue" />
      </div>
    )
  }

  if (!fund) {
    return (
      <div className="card text-center py-16">
        <p className="text-gray-500">Fund not found.</p>
        <button onClick={() => navigate('/explore')} className="mt-4 btn-primary">
          Back to Explore
        </button>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (step === 'success' && result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={36} className="text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Investment Successful!</h2>
          <p className="text-gray-500 text-sm mt-1">{result.fundName}</p>
        </div>
        <div className="card w-full space-y-3">
          <Row label="Amount Invested"   value={`₹${Number(result.amount).toLocaleString('en-IN')}`} />
          <Row label="Units Allocated"   value={Number(result.units).toFixed(4)} />
          <Row label="NAV at Purchase"   value={`₹${Number(result.nav).toLocaleString('en-IN', { maximumFractionDigits: 4 })}`} />
          <Row label="Transaction ID"    value={result.transactionId.slice(0, 8).toUpperCase()} mono />
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => navigate('/portfolio')}
            className="btn-primary flex-1"
          >
            View Portfolio
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="flex-1 btn-secondary"
          >
            Explore More
          </button>
        </div>
      </div>
    )
  }

  // ── Review ──────────────────────────────────────────────────────────────────
  if (step === 'review') {
    return (
      <div className="space-y-5">
        <button
          onClick={() => setStep('amount')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-sparrow-blue"
        >
          <ArrowLeft size={16} /> Edit Amount
        </button>

        <div className="card">
          <h1 className="text-lg font-bold text-gray-900 mb-4">Review Investment</h1>
          <div className="space-y-3">
            <Row label="Fund"             value={fund.schemeName} />
            <Row label="AMC"              value={fund.fundHouse} />
            <Row label="Category"         value={fund.category} />
            <Row label="Current NAV"      value={fund.nav ? `₹${Number(fund.nav).toLocaleString('en-IN', { maximumFractionDigits: 4 })}` : '—'} />
            <Row label="Investment Amount" value={`₹${Number(amount).toLocaleString('en-IN')}`} bold />
            <Row label="Est. Units"       value={estimatedUnits} />
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center px-4">
          Units are allocated at the prevailing NAV. Actual units may vary.
        </p>

        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2"
        >
          {submitting && <Loader size={16} className="animate-spin" />}
          {submitting ? 'Processing...' : 'Confirm Investment'}
        </button>
      </div>
    )
  }

  // ── Amount entry ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate(`/explore/${fundId}`)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-sparrow-blue"
      >
        <ArrowLeft size={16} /> Back to Fund
      </button>

      <div className="card">
        <p className="text-xs text-gray-400">{fund.fundHouse}</p>
        <h2 className="font-bold text-gray-900 mt-0.5 leading-snug">{fund.schemeName}</h2>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs bg-blue-50 text-sparrow-blue px-2 py-0.5 rounded-full">{fund.category}</span>
          {fund.nav && (
            <span className="text-xs text-gray-500">NAV: ₹{Number(fund.nav).toLocaleString('en-IN', { maximumFractionDigits: 4 })}</span>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <h1 className="text-lg font-bold text-gray-900">Lumpsum Investment</h1>

        <div>
          <label className="field-label">Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={fund.minLumpsum}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); if (amountErr) validateAmount(e.target.value) }}
              placeholder={`Min ₹${fund.minLumpsum.toLocaleString('en-IN')}`}
              className="input-field pl-7"
            />
          </div>
          {amountErr && <p className="err">{amountErr}</p>}
          <p className="text-xs text-gray-400 mt-1">
            Minimum lumpsum: ₹{fund.minLumpsum.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Quick amount chips */}
        <div className="flex flex-wrap gap-2">
          {[1000, 5000, 10000, 25000, 50000].filter(v => v >= fund.minLumpsum).map((v) => (
            <button
              key={v}
              onClick={() => { setAmount(String(v)); setAmountErr('') }}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                amount === String(v)
                  ? 'bg-sparrow-blue text-white border-sparrow-blue'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              ₹{v.toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        {/* Estimated units preview */}
        {Number(amount) > 0 && !amountErr && fund.nav && (
          <div className="bg-blue-50 rounded-xl p-3 text-sm">
            <span className="text-blue-700">Est. Units: </span>
            <span className="font-bold text-blue-900">{estimatedUnits}</span>
            <span className="text-blue-600 text-xs ml-1">(at current NAV)</span>
          </div>
        )}

        <button onClick={handleContinue} className="btn-primary w-full py-3">
          Continue
        </button>
      </div>
    </div>
  )
}

function Row({
  label, value, bold, mono,
}: {
  label: string; value: string; bold?: boolean; mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm text-right ${bold ? 'font-bold text-gray-900' : 'text-gray-700'} ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}
