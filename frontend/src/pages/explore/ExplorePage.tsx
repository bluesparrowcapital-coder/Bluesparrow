import { useState, useEffect, useCallback } from 'react'
import { useNavigate }                         from 'react-router-dom'
import { Search, SlidersHorizontal, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { fundService, type Fund }              from '../../services/fundService'

const RISK_OPTIONS = [
  { value: '',            label: 'All Risk' },
  { value: 'LOW',         label: 'Low' },
  { value: 'MODERATE_LOW',label: 'Low-Moderate' },
  { value: 'MODERATE',    label: 'Moderate' },
  { value: 'MODERATE_HIGH',label:'Mod-High' },
  { value: 'HIGH',        label: 'High' },
  { value: 'VERY_HIGH',   label: 'Very High' },
]

const RISK_COLOR: Record<string, string> = {
  LOW:           'bg-green-100 text-green-800',
  MODERATE_LOW:  'bg-teal-100  text-teal-800',
  MODERATE:      'bg-yellow-100 text-yellow-800',
  MODERATE_HIGH: 'bg-orange-100 text-orange-800',
  HIGH:          'bg-red-100   text-red-700',
  VERY_HIGH:     'bg-red-200   text-red-900',
}
const RISK_LABEL: Record<string, string> = {
  LOW: 'Low', MODERATE_LOW: 'Low-Mod', MODERATE: 'Moderate',
  MODERATE_HIGH: 'Mod-High', HIGH: 'High', VERY_HIGH: 'Very High',
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 4 })
}
function fmtCr(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 10000) return '₹' + (n / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 }) + ' Cr'
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + ' Cr'
}

export default function ExplorePage() {
  const navigate = useNavigate()

  const [funds,      setFunds]      = useState<Fund[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading,    setLoading]    = useState(false)
  const [total,      setTotal]      = useState(0)
  const [pages,      setPages]      = useState(1)

  const [q,        setQ]        = useState('')
  const [category, setCategory] = useState('')
  const [risk,     setRisk]     = useState('')
  const [page,     setPage]     = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const LIMIT = 24

  const load = useCallback(async (params: {
    q: string; category: string; risk: string; page: number
  }) => {
    setLoading(true)
    try {
      const res = await fundService.list({
        q:        params.q || undefined,
        category: params.category || undefined,
        risk:     params.risk || undefined,
        page:     params.page,
        limit:    LIMIT,
        sortBy:   'schemeName',
        order:    'asc',
      })
      setFunds(res.funds)
      setTotal(res.total)
      setPages(res.pages)
    } catch {
      setFunds([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load categories once
  useEffect(() => {
    fundService.categories().then(setCategories).catch(() => {})
  }, [])

  // Reload when filters change
  useEffect(() => {
    setPage(1)
    load({ q, category, risk, page: 1 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, risk])

  useEffect(() => {
    load({ q, category, risk, page })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Explore Funds</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total.toLocaleString()} funds available` : 'Browse mutual funds'}
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by fund name or AMC..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sparrow-blue focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters((x) => !x)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || category || risk
                ? 'bg-sparrow-blue text-white border-sparrow-blue'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={15} />
            Filters
            {(category || risk) && (
              <span className="ml-1 bg-white text-sparrow-blue rounded-full w-4 h-4 text-xs flex items-center justify-center font-bold">
                {[category, risk].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sparrow-blue"
              >
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Risk Level</label>
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sparrow-blue"
              >
                {RISK_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {(category || risk) && (
              <div className="flex flex-col justify-end">
                <button
                  onClick={() => { setCategory(''); setRisk('') }}
                  className="text-sm text-red-600 hover:underline px-2"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fund Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-36 bg-gray-100" />
          ))}
        </div>
      ) : funds.length === 0 ? (
        <div className="card text-center py-16">
          <TrendingUp size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-500">No funds found</p>
          <p className="text-sm text-gray-400 mt-1">Try changing your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {funds.map((fund) => (
            <button
              key={fund.id}
              onClick={() => navigate(`/explore/${fund.id}`)}
              className="card text-left hover:shadow-md hover:border-sparrow-blue/30 transition-all duration-200 cursor-pointer"
            >
              {/* Fund house + category */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 truncate">{fund.fundHouse}</p>
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mt-0.5">
                    {fund.schemeName}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${RISK_COLOR[fund.riskLevel] || 'bg-gray-100 text-gray-600'}`}>
                  {RISK_LABEL[fund.riskLevel] || fund.riskLevel}
                </span>
              </div>

              {/* Category tag */}
              <span className="inline-block text-xs bg-blue-50 text-sparrow-blue px-2 py-0.5 rounded-full mb-3">
                {fund.category}
              </span>

              {/* NAV + AUM row */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400">NAV</p>
                  <p className="text-base font-bold text-gray-900">{fmt(fund.nav)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">AUM</p>
                  <p className="text-sm font-medium text-gray-700">{fmtCr(fund.aum)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Empty state before data is loaded */}
      {!loading && funds.length === 0 && total === 0 && !q && !category && !risk && (
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-800 font-medium">
            📥 Fund data loads automatically — NAV is synced daily from AMFI
          </p>
          <p className="text-xs text-blue-600 mt-1">
            If no funds are showing, run <code className="bg-blue-100 px-1 rounded">prisma db push</code> and the cron job will populate funds tonight.
          </p>
        </div>
      )}
    </div>
  )
}
