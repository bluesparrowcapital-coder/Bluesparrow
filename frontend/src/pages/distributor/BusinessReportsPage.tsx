import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, RefreshCw, CalendarDays } from 'lucide-react';
import { distributorService, AumRow, SipReportSummary } from '../../services/distributorService';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

type Tab = 'aum' | 'sip' | 'monthly';

const SIP_STATUSES = ['', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'];

export default function BusinessReportsPage() {
  const [tab, setTab]         = useState<Tab>('aum');
  const [loading, setLoading] = useState(false);

  // AUM tab
  const [aumGroup, setAumGroup]  = useState<'category' | 'fund'>('category');
  const [aumData, setAumData]    = useState<AumRow[]>([]);

  // SIP tab
  const [sipStatus, setSipStatus]       = useState('');
  const [sips, setSips]                 = useState<any[]>([]);
  const [sipSummary, setSipSummary]     = useState<SipReportSummary | null>(null);

  // Monthly tab
  const [monthly, setMonthly] = useState<any>(null);

  useEffect(() => { loadTab(); }, [tab, aumGroup, sipStatus]);  // eslint-disable-line

  async function loadTab() {
    setLoading(true);
    try {
      if (tab === 'aum') {
        setAumData(await distributorService.getAumReport(aumGroup));
      } else if (tab === 'sip') {
        const res = await distributorService.getSipReport(sipStatus || undefined);
        setSips(res.sips);
        setSipSummary(res.summary);
      } else {
        setMonthly(await distributorService.getMonthlySummary());
      }
    } catch { toast.error('Failed to load report'); }
    finally  { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Business Reports</h1>
        <p className="text-sm text-gray-500">AUM analytics, SIP book and monthly summary</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          { id: 'aum',     icon: <BarChart3 className="w-3.5 h-3.5" />,      label: 'AUM Report' },
          { id: 'sip',     icon: <RefreshCw className="w-3.5 h-3.5" />,      label: 'SIP Report' },
          { id: 'monthly', icon: <CalendarDays className="w-3.5 h-3.5" />,   label: 'Monthly' },
        ] as { id: Tab; icon: JSX.Element; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors ${tab === t.id ? 'bg-white text-sparrow-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
        </div>
      ) : (
        <>
          {/* ── AUM Report ── */}
          {tab === 'aum' && (
            <div className="space-y-4">
              {/* Group toggle */}
              <div className="flex gap-2">
                {(['category', 'fund'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setAumGroup(g)}
                    className={`flex-1 py-2 text-sm rounded-xl border font-medium transition-colors ${aumGroup === g ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    By {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>

              {aumData.length === 0 ? (
                <div className="card text-center text-gray-400 py-10">No AUM data found</div>
              ) : (
                <div className="space-y-3">
                  {/* Totals */}
                  <div className="card bg-gradient-to-r from-sparrow-blue/5 to-transparent">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 font-medium">Total AUM</span>
                      <span className="font-bold text-sparrow-blue">{fmt(aumData.reduce((s, r) => s + r.aum, 0))}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">Total Invested</span>
                      <span className="text-sm font-medium text-gray-700">{fmt(aumData.reduce((s, r) => s + r.invested, 0))}</span>
                    </div>
                  </div>

                  {aumData.map((row, i) => {
                    const ret = row.invested > 0 ? ((row.aum - row.invested) / row.invested) * 100 : 0;
                    const label = aumGroup === 'category' ? row.category : row.fundName;
                    const sub   = aumGroup === 'fund'     ? row.fundHouse   : undefined;
                    return (
                      <div key={i} className="card">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{label}</p>
                            {sub && <p className="text-xs text-gray-400">{sub}</p>}
                            <p className="text-xs text-gray-500 mt-0.5">Invested: {fmt(row.invested)}</p>
                          </div>
                          <div className="text-right ml-3">
                            <p className="font-bold text-gray-900">{fmt(row.aum)}</p>
                            <span className={`text-xs font-medium ${ret >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              <TrendingUp className="w-3 h-3 inline mr-0.5" />
                              {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        {aumData.length > 0 && (
                          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-sparrow-blue h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, (row.aum / Math.max(...aumData.map((r) => r.aum))) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SIP Report ── */}
          {tab === 'sip' && (
            <div className="space-y-4">
              {/* Status filter */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {SIP_STATUSES.map((s) => (
                  <button
                    key={s || 'all'}
                    onClick={() => setSipStatus(s)}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full border font-medium transition-colors ${sipStatus === s ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {s || 'All'}
                  </button>
                ))}
              </div>

              {/* Summary cards */}
              {sipSummary && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Active SIPs',    value: sipSummary.active.toString(),   color: 'text-green-600' },
                    { label: 'Monthly Book',   value: fmt(sipSummary.totalMonthly),   color: 'text-sparrow-blue' },
                    { label: 'Paused',         value: sipSummary.paused.toString(),   color: 'text-yellow-600' },
                    { label: 'Cancelled',      value: sipSummary.cancelled.toString(),color: 'text-gray-500' },
                  ].map((s) => (
                    <div key={s.label} className="card text-center py-3">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* SIP List */}
              {sips.length === 0 ? (
                <div className="card text-center text-gray-400 py-10">No SIPs found</div>
              ) : (
                <div className="space-y-3">
                  {sips.map((s: any) => (
                    <div key={s.id} className="card">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{s.fund?.schemeName ?? '—'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.user?.fullName ?? '—'} · {s.user?.phone ?? '—'}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 ${
                          s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          s.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{s.status}</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>₹{(s.amount ?? 0).toLocaleString('en-IN')} / {s.frequency}</span>
                        <span>Date: {s.sipDate}</span>
                        <span>{s.installmentsDone} paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Monthly Summary ── */}
          {tab === 'monthly' && monthly && (
            <div className="space-y-4">
              <div className="card bg-gradient-to-r from-sparrow-blue/5 to-transparent">
                <h2 className="font-semibold text-gray-800 mb-3">This Month's Overview</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Total AUM',    value: fmt(monthly.totalAUM ?? 0),    color: 'text-sparrow-blue' },
                    { label: 'Net Flow',     value: fmt(monthly.netFlow ?? 0),     color: monthly.netFlow >= 0 ? 'text-green-600' : 'text-red-500' },
                    { label: 'Inflows',      value: fmt(monthly.inflows ?? 0),     color: 'text-green-600' },
                    { label: 'Outflows',     value: fmt(monthly.outflows ?? 0),    color: 'text-red-500' },
                    { label: 'New SIPs',     value: (monthly.newSips ?? 0).toString(),      color: 'text-purple-600' },
                    { label: 'Cancelled SIPs', value: (monthly.cancelledSips ?? 0).toString(), color: 'text-orange-500' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-200">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
