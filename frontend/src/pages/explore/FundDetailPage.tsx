import { useState, useEffect }          from 'react'
import { useParams, useNavigate }        from 'react-router-dom'
import { ArrowLeft, TrendingUp, Info }   from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { fundService, type Fund }        from '../../services/fundService'
import { format }                        from 'date-fns'

const RISK_COLOR: Record<string, string> = {
  LOW:           'bg-green-100 text-green-800',
  MODERATE_LOW:  'bg-teal-100  text-teal-800',
  MODERATE:      'bg-yellow-100 text-yellow-800',
  MODERATE_HIGH: 'bg-orange-100 text-orange-800',
  HIGH:          'bg-red-100   text-red-700',
  VERY_HIGH:     'bg-red-200   text-red-900',
}
const RISK_LABEL: Record<string, string> = {
  LOW: 'Low', MODERATE_LOW: 'Low-Moderate', MODERATE: 'Moderate',
  MODERATE_HIGH: 'Mod-High', HIGH: 'High', VERY_HIGH: 'Very High',
}

type Range = '1M' | '3M' | '6M' | '1Y'
const RANGE_DAYS: Record<Range, number> = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function fmt(n: number | null | undefined, digits = 4): string {
  if (n == null) return '—'
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: digits })
}
function fmtCr(n: number | null | undefined): string {
  if (n == null) return '—'
  return '₹' + (n / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) + ' Cr'
}

export default function FundDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [fund,    setFund]    = useState<Fund | null>(null)
  const [loading, setLoading] = useState(true)
  const [range,   setRange]   = useState<Range>('1M')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fundService.getById(id).then(setFund).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card animate-pulse h-24 bg-gray-100" />
        <div className="card animate-pulse h-64 bg-gray-100" />
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

  const history = fund.navHistory ?? []
  const days    = RANGE_DAYS[range]
  const sliced  = history.slice(0, days).reverse()
  const chartData = sliced.map((h) => ({
    date: h.navDate ? format(new Date(h.navDate), 'dd MMM') : '',
    nav:  Number(h.nav),
  }))

  const oldestNav  = sliced[0]?.nav
  const latestNav  = sliced[sliced.length - 1]?.nav
  const rangeReturnPct =
    oldestNav && latestNav
      ? (((Number(latestNav) - Number(oldestNav)) / Number(oldestNav)) * 100).toFixed(2)
      : null

  return (
    <div className="space-y-5 pb-24">
      {/* Back */}
      <button
        onClick={() => navigate('/explore')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-sparrow-blue"
      >
        <ArrowLeft size={16} /> Back to Explore
      </button>

      {/* Header card */}
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-gray-400">{fund.fundHouse}</p>
            <h1 className="text-lg font-bold text-gray-900 leading-snug mt-0.5">
              {fund.schemeName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs bg-blue-50 text-sparrow-blue px-2 py-0.5 rounded-full">
                {fund.category}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_COLOR[fund.riskLevel] || 'bg-gray-100 text-gray-600'}`}>
                {RISK_LABEL[fund.riskLevel] || fund.riskLevel}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">NAV</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(fund.nav)}</p>
            {fund.navDate && (
              <p className="text-xs text-gray-400 mt-0.5">
                as of {format(new Date(fund.navDate), 'dd MMM yyyy')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* NAV Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">NAV History</h2>
            {rangeReturnPct != null && (
              <p className={`text-sm font-medium mt-0.5 ${Number(rangeReturnPct) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(rangeReturnPct) >= 0 ? '+' : ''}{rangeReturnPct}% in {range}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {(['1M','3M','6M','1Y'] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  range === r
                    ? 'bg-sparrow-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={(v) => '₹' + v.toFixed(0)}
                domain={['auto', 'auto']}
              />
              <Tooltip
                formatter={(v: number) => [`₹${v.toFixed(4)}`, 'NAV']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="nav"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
            <TrendingUp size={20} /> No NAV history yet
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">Fund Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="AUM"          value={fmtCr(fund.aum)} />
          <StatCard label="Expense Ratio" value={fund.expenseRatio ? `${fund.expenseRatio}%` : '—'} />
          <StatCard label="Min Lumpsum"  value={fmt(fund.minLumpsum, 0)} />
          <StatCard label="Min SIP"      value={fmt(fund.minSipAmount, 0)} />
          <StatCard label="Exit Load"    value={fund.exitLoad ?? '—'} />
          <StatCard label="Scheme Code"  value={fund.schemeCode} />
        </div>
        {fund.subCategory && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
            <Info size={13} /> Sub-category: {fund.subCategory}
          </div>
        )}
      </div>

      {/* Sticky action buttons */}
      <div className="fixed bottom-20 left-0 right-0 px-4 z-10 flex gap-2">
        <button
          onClick={() => navigate(`/sip/create?fundId=${fund.id}`)}
          className="btn-secondary flex-1 text-sm py-3 shadow-lg"
        >
          Start SIP
        </button>
        <button
          onClick={() => navigate(`/invest/${fund.id}`)}
          className="btn-primary flex-1 text-sm py-3 shadow-lg"
        >
          Invest Now
        </button>
      </div>
    </div>
  )
}
