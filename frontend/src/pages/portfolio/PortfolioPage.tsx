import { useState, useEffect }         from 'react'
import { useNavigate }                  from 'react-router-dom'
import { TrendingUp, TrendingDown, RefreshCw, Receipt } from 'lucide-react'
import { portfolioService, type Holding, type PortfolioSummary, type Transaction }
  from '../../services/fundService'
import { format }                       from 'date-fns'

type Tab = 'holdings' | 'transactions'

function SummaryCard({
  label, value, sub, positive,
}: {
  label: string; value: string; sub?: string; positive?: boolean
}) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub != null && (
        <p className={`text-xs font-medium ${
          positive === true ? 'text-green-600' :
          positive === false ? 'text-red-500' :
          'text-gray-500'
        }`}>
          {sub}
        </p>
      )}
    </div>
  )
}

function fmt(n: number): string {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export default function PortfolioPage() {
  const navigate = useNavigate()

  const [tab,          setTab]          = useState<Tab>('holdings')
  const [holdings,     setHoldings]     = useState<Holding[]>([])
  const [summary,      setSummary]      = useState<PortfolioSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [txnLoading,   setTxnLoading]   = useState(false)
  const [refreshing,   setRefreshing]   = useState(false)

  const loadPortfolio = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await portfolioService.get()
      setHoldings(data.holdings)
      setSummary(data.summary)
    } catch {
      setHoldings([])
      setSummary(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadTransactions = async () => {
    setTxnLoading(true)
    try {
      const txns = await portfolioService.transactions(100)
      setTransactions(txns)
    } catch {
      setTransactions([])
    } finally {
      setTxnLoading(false)
    }
  }

  useEffect(() => { loadPortfolio() }, [])
  useEffect(() => {
    if (tab === 'transactions' && transactions.length === 0) loadTransactions()
  }, [tab])

  const totalReturn    = summary?.totalReturn ?? 0
  const totalReturnPct = summary?.totalReturnPct ?? 0
  const returnPositive = totalReturn >= 0

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Portfolio</h1>
          <p className="text-xs text-gray-400 mt-0.5">Live values · NAV synced daily</p>
        </div>
        <button
          onClick={() => loadPortfolio(true)}
          disabled={refreshing}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin text-sparrow-blue' : 'text-gray-500'} />
        </button>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="card animate-pulse h-20 bg-gray-100" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Total Invested"
            value={fmt(summary.totalInvested)}
          />
          <SummaryCard
            label="Current Value"
            value={fmt(summary.currentValue)}
          />
          <SummaryCard
            label="Total Returns"
            value={(returnPositive ? '+' : '-') + fmt(totalReturn)}
            sub={fmtPct(totalReturnPct)}
            positive={returnPositive}
          />
          <SummaryCard
            label="Funds Held"
            value={String(summary.totalFunds)}
          />
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex rounded-xl bg-gray-100 p-1">
        {(['holdings', 'transactions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white text-sparrow-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'holdings' ? 'Holdings' : 'Transactions'}
          </button>
        ))}
      </div>

      {/* ── Holdings tab ──────────────────────────────────────── */}
      {tab === 'holdings' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="card animate-pulse h-24 bg-gray-100" />)}
            </div>
          ) : holdings.length === 0 ? (
            <div className="card text-center py-14">
              <TrendingUp size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-500">No holdings yet</p>
              <p className="text-sm text-gray-400 mt-1">Start investing to see your portfolio</p>
              <button onClick={() => navigate('/explore')} className="btn-primary mt-5">
                Explore Funds
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {holdings.map((h) => {
                const positive = h.returnPct >= 0
                return (
                  <div
                    key={h.id}
                    className="card cursor-pointer hover:shadow-md transition-all"
                    onClick={() => navigate(`/explore/${h.fundId}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 truncate">{h.fundHouse}</p>
                        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1 mt-0.5">
                          {h.fundName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{h.unitsHeld.toFixed(4)} units</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-gray-900">{fmt(h.currentValue)}</p>
                        <div className={`flex items-center justify-end gap-1 text-xs font-medium mt-0.5 ${positive ? 'text-green-600' : 'text-red-500'}`}>
                          {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {fmtPct(h.returnPct)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                      <span>Invested: {fmt(h.investedAmount)}</span>
                      <span className={positive ? 'text-green-600' : 'text-red-500'}>
                        {positive ? '+' : '-'}{fmt(h.absoluteReturn)}
                      </span>
                    </div>
                  </div>
                )
              })}
              <button
                onClick={() => navigate('/explore')}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-sparrow-blue hover:text-sparrow-blue transition-colors"
              >
                + Add more funds
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Transactions tab ──────────────────────────────────── */}
      {tab === 'transactions' && (
        <>
          {txnLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="card animate-pulse h-16 bg-gray-100" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="card text-center py-14">
              <Receipt size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn) => {
                const isBuy = txn.type === 'LUMPSUM' || txn.type === 'SIP'
                return (
                  <div key={txn.id} className="card flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isBuy ? 'bg-green-100' : 'bg-red-100'}`}>
                      {isBuy
                        ? <TrendingUp size={16} className="text-green-600" />
                        : <TrendingDown size={16} className="text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {txn.fund.schemeName}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {txn.type} · {format(new Date(txn.txnDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">
                        {fmt(txn.amount)}
                      </p>
                      {txn.units != null && (
                        <p className="text-xs text-gray-400">{txn.units.toFixed(4)} u</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
