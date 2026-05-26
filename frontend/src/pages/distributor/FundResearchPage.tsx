import { useEffect, useState, useCallback } from 'react';
import { Search, TrendingUp, BarChart3, Layers, GitCompare, AlertCircle } from 'lucide-react';
import { fundService } from '../../services/fundService';
import type { Fund } from '../../services/fundService';
import toast from 'react-hot-toast';

type Tab = 'search' | 'top' | 'category' | 'compare';

const CATEGORIES = ['Equity', 'Debt', 'Hybrid', 'ELSS', 'Index', 'Liquid', 'Sectoral', 'International'];

const RISK_COLOR: Record<string, string> = {
  LOW:         'bg-green-100 text-green-700',
  MODERATE:    'bg-yellow-100 text-yellow-700',
  HIGH:        'bg-orange-100 text-orange-700',
  VERY_HIGH:   'bg-red-100 text-red-700',
};

const RISK_LABEL: Record<string, string> = {
  LOW: 'Low', MODERATE: 'Moderate', HIGH: 'High', VERY_HIGH: 'Very High',
};

function fmt(n: number | null) {
  if (n == null) return '—';
  return n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
         n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
         `₹${n.toLocaleString('en-IN')}`;
}

function FundCard({ fund, onCompare, inCompare }: {
  fund: Fund; onCompare?: (f: Fund) => void; inCompare?: boolean;
}) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug truncate">{fund.schemeName}</p>
          <p className="text-xs text-gray-500 mt-0.5">{fund.fundHouse}</p>
        </div>
        {onCompare && (
          <button
            onClick={() => onCompare(fund)}
            className={`shrink-0 text-xs px-2 py-1 rounded-lg border transition ${
              inCompare ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'border-gray-200 text-gray-600 hover:border-sparrow-blue hover:text-sparrow-blue'
            }`}
          >
            {inCompare ? '✓ Added' : '+ Compare'}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{fund.category}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${RISK_COLOR[fund.riskLevel] ?? 'bg-gray-100 text-gray-600'}`}>
          {RISK_LABEL[fund.riskLevel] ?? fund.riskLevel} Risk
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg py-1.5">
          <p className="text-xs text-gray-500">NAV</p>
          <p className="text-sm font-semibold text-gray-900">{fund.nav ? `₹${fund.nav.toFixed(2)}` : '—'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg py-1.5">
          <p className="text-xs text-gray-500">Min SIP</p>
          <p className="text-sm font-semibold text-gray-900">₹{fund.minSipAmount}</p>
        </div>
        <div className="bg-gray-50 rounded-lg py-1.5">
          <p className="text-xs text-gray-500">Exp. Ratio</p>
          <p className="text-sm font-semibold text-gray-900">{fund.expenseRatio ? `${fund.expenseRatio}%` : '—'}</p>
        </div>
      </div>
      {fund.aum != null && (
        <p className="text-xs text-gray-400 mt-2">AUM: {fmt(fund.aum)}</p>
      )}
    </div>
  );
}

// ─── Riskometer ────────────────────────────────────────────────────────────
function Riskometer({ level }: { level: string }) {
  const levels = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'];
  const idx    = levels.indexOf(level);
  return (
    <div className="flex items-center gap-2">
      {levels.map((l, i) => (
        <div
          key={l}
          className={`h-2 flex-1 rounded-full ${
            i <= idx
              ? i === 0 ? 'bg-green-400' : i === 1 ? 'bg-yellow-400' : i === 2 ? 'bg-orange-400' : 'bg-red-500'
              : 'bg-gray-200'
          }`}
        />
      ))}
      <span className={`text-xs font-semibold ${RISK_COLOR[level]?.replace('bg-', 'text-').replace('-100', '-700') ?? ''}`}>
        {RISK_LABEL[level] ?? level}
      </span>
    </div>
  );
}

export default function FundResearchPage() {
  const [tab,      setTab]      = useState<Tab>('search');
  const [query,    setQuery]    = useState('');
  const [category, setCategory] = useState('');
  const [funds,    setFunds]    = useState<Fund[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [compared, setCompared] = useState<Fund[]>([]);

  const load = useCallback(async (q: string, cat: string) => {
    setLoading(true);
    try {
      const res = await fundService.list({ search: q, category: cat, limit: 30, page: 1 });
      setFunds(res.funds);
    } catch { toast.error('Failed to load funds'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query, category), 350);
    return () => clearTimeout(t);
  }, [query, category, load]);

  useEffect(() => {
    if (tab === 'top')     load('', '');
    if (tab === 'search')  load(query, category);
    if (tab === 'category') load('', category || CATEGORIES[0]);
  }, [tab]); // eslint-disable-line

  function toggleCompare(f: Fund) {
    setCompared(prev =>
      prev.find(x => x.id === f.id) ? prev.filter(x => x.id !== f.id) : prev.length < 3 ? [...prev, f] : prev
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'search',   label: 'Search',      icon: <Search    className="w-3.5 h-3.5" /> },
    { id: 'top',      label: 'Top Funds',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'category', label: 'By Category', icon: <Layers    className="w-3.5 h-3.5" /> },
    { id: 'compare',  label: 'Compare',     icon: <GitCompare className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fund Research</h1>
        <p className="text-sm text-gray-500">Search, analyse and compare mutual funds</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              tab === t.id ? 'bg-white shadow text-sparrow-blue' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Search Tab ── */}
      {tab === 'search' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30"
                placeholder="Search by fund name or fund house…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {loading ? <Spinner /> : (
            <div className="grid grid-cols-1 gap-3">
              {funds.length === 0
                ? <p className="text-sm text-gray-400 text-center py-10">No funds found</p>
                : funds.map(f => <FundCard key={f.id} fund={f} onCompare={toggleCompare} inCompare={!!compared.find(x => x.id === f.id)} />)
              }
            </div>
          )}
        </div>
      )}

      {/* ── Top Funds ── */}
      {tab === 'top' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => { setCategory(c); load('', c); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  category === c ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'border-gray-200 text-gray-600 hover:border-sparrow-blue hover:text-sparrow-blue'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {loading ? <Spinner /> : (
            <div className="grid grid-cols-1 gap-3">
              {funds.slice(0, 20).map(f => (
                <FundCard key={f.id} fund={f} onCompare={toggleCompare} inCompare={!!compared.find(x => x.id === f.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── By Category ── */}
      {tab === 'category' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => { setCategory(c); load('', c); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  category === c ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'border-gray-200 text-gray-600'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {funds.length === 0
                ? <p className="text-sm text-gray-400 text-center py-10">Select a category</p>
                : funds.map(f => (
                    <div key={f.id} className="card">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{f.schemeName}</p>
                          <p className="text-xs text-gray-500">{f.fundHouse}</p>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${RISK_COLOR[f.riskLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                          {RISK_LABEL[f.riskLevel] ?? f.riskLevel}
                        </span>
                      </div>
                      {/* Riskometer */}
                      <Riskometer level={f.riskLevel} />
                      <div className="grid grid-cols-3 gap-2 text-center mt-3">
                        <div className="bg-gray-50 rounded-lg py-1.5">
                          <p className="text-xs text-gray-500">NAV</p>
                          <p className="text-sm font-semibold">{f.nav ? `₹${f.nav.toFixed(2)}` : '—'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg py-1.5">
                          <p className="text-xs text-gray-500">Min SIP</p>
                          <p className="text-sm font-semibold">₹{f.minSipAmount}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg py-1.5">
                          <p className="text-xs text-gray-500">Exit Load</p>
                          <p className="text-xs font-medium text-gray-700">{f.exitLoad ?? 'Nil'}</p>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      )}

      {/* ── Compare ── */}
      {tab === 'compare' && (
        <div className="space-y-4">
          {compared.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <GitCompare className="w-10 h-10 mb-3" />
              <p className="text-sm font-medium">No funds selected for comparison</p>
              <p className="text-xs mt-1">Go to Search or Top Funds and click "+ Compare"</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">{compared.length} fund(s) selected</p>
                <button onClick={() => setCompared([])} className="text-xs text-red-500 hover:underline">Clear all</button>
              </div>

              {/* Compare Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td className="px-4 py-3 text-xs font-semibold text-gray-500 w-32">Parameter</td>
                      {compared.map(f => (
                        <td key={f.id} className="px-4 py-3 text-xs font-semibold text-gray-900">
                          <div className="flex items-start justify-between gap-2">
                            <span className="leading-tight">{f.schemeName}</span>
                            <button onClick={() => toggleCompare(f)} className="text-gray-400 hover:text-red-500 shrink-0">✕</button>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Fund House',    get: (f: Fund) => f.fundHouse },
                      { label: 'Category',      get: (f: Fund) => f.category },
                      { label: 'Risk',          get: (f: Fund) => RISK_LABEL[f.riskLevel] ?? f.riskLevel },
                      { label: 'NAV',           get: (f: Fund) => f.nav ? `₹${f.nav.toFixed(2)}` : '—' },
                      { label: 'AUM',           get: (f: Fund) => fmt(f.aum) },
                      { label: 'Min SIP',       get: (f: Fund) => `₹${f.minSipAmount}` },
                      { label: 'Min Lumpsum',   get: (f: Fund) => `₹${f.minLumpsum}` },
                      { label: 'Expense Ratio', get: (f: Fund) => f.expenseRatio ? `${f.expenseRatio}%` : '—' },
                      { label: 'Exit Load',     get: (f: Fund) => f.exitLoad ?? 'Nil' },
                    ].map((row, i) => (
                      <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-xs text-gray-500 font-medium">{row.label}</td>
                        {compared.map(f => (
                          <td key={f.id} className="px-4 py-3 text-xs text-gray-800">{row.get(f)}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 font-medium">Riskometer</td>
                      {compared.map(f => (
                        <td key={f.id} className="px-4 py-3"><Riskometer level={f.riskLevel} /></td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Quick add from search */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Add more funds to compare:</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30"
                placeholder="Search fund to add…"
                onChange={e => load(e.target.value, '')}
              />
            </div>
            {funds.slice(0, 5).map(f => (
              <div key={f.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-xs font-medium text-gray-800">{f.schemeName}</p>
                  <p className="text-[11px] text-gray-500">{f.fundHouse} · {f.category}</p>
                </div>
                <button
                  onClick={() => toggleCompare(f)}
                  disabled={!compared.find(x => x.id === f.id) && compared.length >= 3}
                  className={`text-xs px-2 py-1 rounded-lg border transition disabled:opacity-40 ${
                    compared.find(x => x.id === f.id) ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {compared.find(x => x.id === f.id) ? '✓' : '+'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
    </div>
  );
}
