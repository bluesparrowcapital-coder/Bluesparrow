import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { kycService } from '../../services/onboardingService'

interface KycStatus {
  status:         string
  statusLabel:    string
  statusColor:    string
  nextAction:     string
  kraName?:       string
  ekycLink?:      string | null
  ekycLinkSentAt?: string | null
  logs:           { createdAt: string; status: string; kraName?: string; remark?: string }[]
}

const COLOR_MAP: Record<string, string> = {
  green:  'bg-green-50 border-green-200 text-green-700',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  blue:   'bg-blue-50 border-blue-200 text-blue-700',
  red:    'bg-red-50 border-red-200 text-red-700',
  gray:   'bg-slate-50 border-slate-200 text-slate-600',
}

const ICON_MAP: Record<string, typeof CheckCircle2> = {
  green:  CheckCircle2,
  yellow: Clock,
  blue:   Clock,
  red:    XCircle,
  gray:   AlertCircle,
}

export default function KycStatusPage() {
  const navigate = useNavigate()
  const [data,      setData]      = useState<KycStatus | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [checking,  setChecking]  = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    try {
      const res = await kycService.getStatus()
      setData(res)
      return res
    } catch {
      toast.error('Could not load KYC status')
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckKra() {
    setChecking(true)
    try {
      await kycService.checkKra()            // trigger the check
      const updated = await kycService.getStatus()  // reload full status with labels
      setData(updated)
      if (updated?.status === 'VERIFIED') {
        toast.success('KYC Verified successfully! ✓')
      } else {
        toast.success('KYC check complete')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'KRA check failed'
      toast.error(msg)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    load().then((res) => {
      // Auto-trigger KRA check if KYC is still pending
      if (res?.status === 'PENDING') {
        handleCheckKra()
      }
    })
  }, [])

  async function handleSubmitKyc() {
    setSubmitting(true)
    try {
      await kycService.submit()
      toast.success('KYC request submitted')
      await load()
    } catch {
      toast.error('Could not submit KYC')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-sparrow-blue" />
      </div>
    )
  }

  const color = data?.statusColor ?? 'gray'
  const StatusIcon = ICON_MAP[color] ?? AlertCircle

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto pt-4">
        <button onClick={() => navigate('/onboarding/status')} className="flex items-center gap-1 text-slate-500 text-sm mb-4">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="text-xl font-bold text-slate-800 mb-1">KYC Status</h1>
        <p className="text-slate-500 text-sm mb-6">Know Your Customer verification</p>

        {/* Status card */}
        <div className={clsx('card border mb-4', COLOR_MAP[color])}>
          <div className="flex items-center gap-3">
            <StatusIcon size={28} />
            <div>
              <p className="font-semibold">{data?.statusLabel}</p>
              {data?.kraName && <p className="text-xs opacity-70">KRA: {data.kraName}</p>}
            </div>
          </div>
          {data?.nextAction && (
            <p className="text-sm mt-3 opacity-80">{data.nextAction}</p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-6">
          <button
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-sparrow-blue text-sparrow-blue rounded-xl font-medium hover:bg-blue-50 transition"
            onClick={handleCheckKra}
            disabled={checking}
          >
            {checking ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            Check KYC via KRA
          </button>

          {data?.status !== 'VERIFIED' && (
            <button
              className="btn-primary"
              onClick={handleSubmitKyc}
              disabled={submitting || data?.status === 'SUBMITTED'}
            >
              {submitting
                ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Submitting...</span>
                : data?.status === 'SUBMITTED'
                ? 'KYC Submitted — Awaiting Verification'
                : 'Submit KYC Request'
              }
            </button>
          )}

          {/* eKYC link — shown when NSE sends back a fresh eKYC URL */}
          {data?.ekycLink && data.status !== 'VERIFIED' && (
            <a
              href={data.ekycLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition"
            >
              <ExternalLink size={18} />
              Complete eKYC on NSE Portal
            </a>
          )}
        </div>

        {/* History log */}
        {data?.logs && data.logs.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-slate-700 mb-3">History</h3>
            <div className="space-y-2">
              {data.logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-sparrow-blue mt-1.5 shrink-0" />
                  <div>
                    <span className="font-medium text-slate-700">{log.status}</span>
                    {log.kraName && <span className="text-slate-500"> · {log.kraName}</span>}
                    {log.remark && <p className="text-slate-400 text-xs">{log.remark}</p>}
                    <p className="text-slate-400 text-xs">{new Date(log.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
