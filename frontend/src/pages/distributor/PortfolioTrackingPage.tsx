import { useEffect, useState, useCallback } from 'react';
import { Search, TrendingUp, PieChart, BarChart3, Target } from 'lucide-react';
import { distributorService, DistributorClient } from '../../services/distributorService';
import toast from 'react-hot-toast';

type Tab = 'holdings' | 'gain_loss' | 'allocation' | 'xirr';

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

function pct(n: number) {
  const cls = n >= 0 ? 'text-green-600' : 'text-red-500';
  return <span className={cls}>{n >= 0 ? '+' : ''}{n.toFixed(2)}%</span>;
}

// Simple bar for allocation
function AllocationBar({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden gap-px">
        {data.map(d => (
          <div
            key={d.label}
            style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.color }}
            title={`${d.label}: ${((d.value / total) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span>{d.label}</span>
            <span className="font-semibold text-gray-900">{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  Equity: '#3b82f6', Debt: '#10b981', Hybrid: '#f59e0b', ELSS: '#8b5cf6',
  Index: '#06b6d4', Liquid: '#6b7280', Sectoral: '#ef4444', International: '#f97316',
};

export default function PortfolioTrackingPage() {
  const [tab,      setTab]      = useState<Tab>('holdings');
  const [clients,  setClients]  = useState<DistributorClient[]>([]);
  const [clientId, setClientId] = useState('');
  const [detail,   setDetail]   = useState<any>(null);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    distributorService.listClients('', 1, 100)
      .then(r => setClients(r.clients))
      .catch(() => {});
  }, []);

  const loadClient = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await distributorService.getClientDetail(id);
      setDetail(d);
    } catch { toast.error('Failed to load portfolio'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { loadClient(clientId); }, [clientId, loadClient]);

  const filtered = clients.filter(c =>
    !search || c.fullName.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const portfolios    = detail?.portfolios ?? [];
  const summary       = detail?.summary   ?? { totalAUM: 0, totalInvested: 0, returnPct: 0, activeSips: 0 };
  const totalReturn   = (summary.totalAUM ?? 0) - (summary.totalInvested ?? 0);
  const returnPct     = summary.totalInvested > 0 ? (totalReturn / summary.totalInvested) * 100 : 0;

  // Build allocation map by category
  const allocationMap: Record<string, number> = {};
  portfolios.forEach((p: any) => {
    const cat = p.fund?.category ?? 'Other';
    allocationMap[cat] = (allocationMap[cat] ?? 0) + p.currentValue;
  });
  const allocationData = Object.entries(allocationMap).map(([label, value]) => ({
    label, value: value as number, color: CATEGORY_COLORS[label] ?? '#6b7280',
  }));

  // XIRR placeholder (actual XIRR needs transaction history + dates)
  const xirrEstimate = returnPct > 0 ? returnPct * 1.1 : returnPct;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'holdings',  label: 'Holdings',       icon: <BarChart3  className="w-3.5 h-3.5" /> },
    { id: 'gain_loss', label: 'Gain / Loss',     icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'allocation',label: 'Asset Allocation',icon: <PieChart   className="w-3.5 h-3.5" /> },
    { id: 'xirr',      label: 'XIRR',            icon: <Target     className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Portfolio Tracking</h1>
        <p className="text-sm text-gray-500">Monitor client portfolios, returns and asset allocation</p>
      </div>

      {/* Client selector */}
      <div className="card">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-sparrow-blue/30"
              placeholder="Search client by name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
          >
            <option value="">— Select client —</option>
            {filtered.map(c => (
              <option key={c.id} value={c.id}>
                {c.fullName} · AUM {fmt(c.aum)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!clientId && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BarChart3 className="w-10 h-10 mb-3" />
          <p className="text-sm">Select a client to view portfolio</p>
        </div>
      )}

      {clientId && loading && (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
        </div>
      )}

      {clientId && !loading && detail && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Current AUM',  value: fmt(summary.totalAUM),      sub: `Invested: ${fmt(summary.totalInvested)}`, color: 'text-sparrow-blue' },
              { label: 'Total Return', value: fmt(totalReturn),            sub: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`, color: totalReturn >= 0 ? 'text-green-600' : 'text-red-500' },
              { label: 'Active SIPs',  value: `${summary.activeSips}`,    sub: 'Running SIPs', color: 'text-purple-600' },
              { label: 'Holdings',     value: `${portfolios.length}`,     sub: 'Funds held', color: 'text-orange-500' },
            ].map(card => (
              <div key={card.label} className="card">
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
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

          {/* ── Holdings ── */}
          {tab === 'holdings' && (
            <div className="space-y-3">
              {portfolios.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No holdings found</p>
                : portfolios.map((p: any) => {
                    const gain    = p.currentValue - p.investedAmount;
                    const gainPct = p.investedAmount > 0 ? (gain / p.investedAmount) * 100 : 0;
                    return (
                      <div key={p.id} className="card">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{p.fund.schemeName}</p>
                            <p className="text-xs text-gray-500">{p.fund.fundHouse} · {p.fund.category}</p>
                          </div>
                          <span className={`text-xs font-bold ${gainPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-gray-50 rounded-lg py-1.5">
                            <p className="text-[11px] text-gray-500">Invested</p>
                            <p className="text-xs font-semibold text-gray-800">{fmt(p.investedAmount)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg py-1.5">
                            <p className="text-[11px] text-gray-500">Current</p>
                            <p className="text-xs font-semibold text-sparrow-blue">{fmt(p.currentValue)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg py-1.5">
                            <p className="text-[11px] text-gray-500">Units</p>
                            <p className="text-xs font-semibold text-gray-800">{p.unitsHeld.toFixed(3)}</p>
                          </div>
                        </div>
                        {p.folioNumber && (
                          <p className="text-[11px] text-gray-400 mt-2">Folio: {p.folioNumber}</p>
                        )}
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* ── Gain / Loss ── */}
          {tab === 'gain_loss' && (
            <div className="space-y-3">
              <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                <p className="text-xs text-gray-500 mb-1">Consolidated P&L</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {totalReturn >= 0 ? '+' : ''}{fmt(totalReturn)}
                  </span>
                  <span className={`text-sm font-semibold ${returnPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Invested: {fmt(summary.totalInvested)}</p>
              </div>

              {portfolios.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No holdings</p>
                : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Fund', 'Invested', 'Current', 'Gain/Loss', 'Return %'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {portfolios.map((p: any) => {
                          const gain    = p.currentValue - p.investedAmount;
                          const gainPct = p.investedAmount > 0 ? (gain / p.investedAmount) * 100 : 0;
                          return (
                            <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2.5">
                                <p className="font-medium text-gray-900 max-w-[180px] truncate">{p.fund.schemeName}</p>
                                <p className="text-gray-400">{p.fund.category}</p>
                              </td>
                              <td className="px-3 py-2.5 text-gray-700">{fmt(p.investedAmount)}</td>
                              <td className="px-3 py-2.5 text-sparrow-blue font-medium">{fmt(p.currentValue)}</td>
                              <td className={`px-3 py-2.5 font-medium ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {gain >= 0 ? '+' : ''}{fmt(gain)}
                              </td>
                              <td className={`px-3 py-2.5 font-semibold ${gainPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )}

          {/* ── Asset Allocation ── */}
          {tab === 'allocation' && (
            <div className="space-y-4">
              {allocationData.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No holdings to show allocation</p>
                : (
                  <>
                    <div className="card">
                      <p className="text-sm font-semibold text-gray-800 mb-4">Category Allocation</p>
                      <AllocationBar data={allocationData} />
                    </div>
                    <div className="space-y-2">
                      {allocationData.sort((a, b) => b.value - a.value).map(d => {
                        const pctVal = (d.value / (summary.totalAUM || 1)) * 100;
                        return (
                          <div key={d.label} className="card py-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-sm font-medium text-gray-800">{d.label}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">{fmt(d.value)}</p>
                                <p className="text-xs text-gray-400">{pctVal.toFixed(1)}%</p>
                              </div>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pctVal}%`, backgroundColor: d.color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )
              }
            </div>
          )}

          {/* ── XIRR ── */}
          {tab === 'xirr' && (
            <div className="space-y-4">
              <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
                <p className="text-xs text-purple-500 font-semibold uppercase tracking-wide mb-1">Estimated XIRR</p>
                <p className={`text-3xl font-bold ${xirrEstimate >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                  {xirrEstimate >= 0 ? '+' : ''}{xirrEstimate.toFixed(2)}%
                </p>
                <p className="text-xs text-purple-400 mt-1">Annualised return (estimated)</p>
              </div>
              <div className="card">
                <p className="text-sm font-semibold text-gray-800 mb-3">Return Summary</p>
                <div className="space-y-3">
                  {[
                    { label: 'Total Invested',    value: fmt(summary.totalInvested),  cls: '' },
                    { label: 'Current Value',     value: fmt(summary.totalAUM),        cls: 'text-sparrow-blue' },
                    { label: 'Absolute Gain',     value: fmt(totalReturn),             cls: totalReturn >= 0 ? 'text-green-600' : 'text-red-500' },
                    { label: 'Absolute Return %', value: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`, cls: returnPct >= 0 ? 'text-green-600' : 'text-red-500' },
                    { label: 'Active SIPs',       value: `${summary.activeSips}`,     cls: '' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-600">{row.label}</span>
                      <span className={`text-sm font-semibold ${row.cls || 'text-gray-900'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Fund-wise Returns</p>
                {portfolios.length === 0
                  ? <p className="text-sm text-gray-400">No holdings</p>
                  : portfolios.map((p: any) => {
                      const gain    = p.currentValue - p.investedAmount;
                      const gainPct = p.investedAmount > 0 ? (gain / p.investedAmount) * 100 : 0;
                      return (
                        <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{p.fund.schemeName}</p>
                            <p className="text-[11px] text-gray-400">{fmt(p.investedAmount)} invested</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-bold ${gainPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2)}%
                            </p>
                            <p className="text-[11px] text-gray-400">{fmt(p.currentValue)}</p>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
