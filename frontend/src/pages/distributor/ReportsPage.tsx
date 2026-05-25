import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, RefreshCw, FileText, Download, CalendarDays, Receipt } from 'lucide-react';
import { distributorService, AumRow, SipReportSummary } from '../../services/distributorService';
import toast from 'react-hot-toast';

type Tab = 'aum' | 'sip' | 'capital_gain' | 'statement' | 'tax_pl';

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

const SIP_STATUSES = ['', 'ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED'];

function DownloadButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => toast('Download will be available once exchange integration is active.')}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sparrow-blue border border-sparrow-blue/30 rounded-xl hover:bg-blue-50 transition"
    >
      <Download className="w-3.5 h-3.5" />{label}
    </button>
  );
}

function IntegrationNote() {
  return (
    <div className="card bg-blue-50 border-blue-100 flex gap-2 text-xs text-blue-700">
      <span>ℹ️</span>
      <span>Full report data requires BSE / NSE exchange integration. Summary data shown below is based on platform transactions.</span>
    </div>
  );
}

// ─── AUM Tab ──────────────────────────────────────────────────────────────
function AumTab() {
  const [loading,  setLoading]  = useState(false);
  const [group,    setGroup]    = useState<'category' | 'fund'>('category');
  const [aumData,  setAumData]  = useState<AumRow[]>([]);

  useEffect(() => {
    setLoading(true);
    distributorService.getAumReport(group)
      .then(setAumData)
      .catch(() => toast.error('Failed to load AUM'))
      .finally(() => setLoading(false));
  }, [group]);

  const total = aumData.reduce((s, r) => s + r.totalAUM, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['category','fund'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                group === g ? 'bg-sparrow-blue text-white border-sparrow-blue' : 'border-gray-200 text-gray-600'
              }`}
            >
              By {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        <DownloadButton label="Export AUM" />
      </div>

      {total > 0 && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
          <p className="text-xs text-gray-500">Total AUM</p>
          <p className="text-2xl font-bold text-sparrow-blue">{fmt(total)}</p>
        </div>
      )}

      {loading
        ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-sparrow-blue" /></div>
        : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {[group === 'category' ? 'Category' : 'Fund Name','AUM','Clients','Avg AUM'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aumData.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-800">
                      {group === 'category' ? r.category : r.fundName}
                    </td>
                    <td className="px-3 py-2.5 text-sparrow-blue font-semibold">{fmt(r.totalAUM)}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r.clientCount}</td>
                    <td className="px-3 py-2.5 text-gray-600">{r.clientCount ? fmt(r.totalAUM / r.clientCount) : '—'}</td>
                  </tr>
                ))}
                {aumData.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-400">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ─── SIP Tab ──────────────────────────────────────────────────────────────
function SipTab() {
  const [loading,    setLoading]    = useState(false);
  const [sipStatus,  setSipStatus]  = useState('');
  const [sips,       setSips]       = useState<any[]>([]);
  const [sipSummary, setSipSummary] = useState<SipReportSummary | null>(null);

  useEffect(() => {
    setLoading(true);
    distributorService.getSipReport(sipStatus || undefined)
      .then(r => { setSips(r.sips); setSipSummary(r.summary); })
      .catch(() => toast.error('Failed to load SIP report'))
      .finally(() => setLoading(false));
  }, [sipStatus]);

  const STATUS_CLS: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700', PAUSED: 'bg-yellow-100 text-yellow-700',
    CANCELLED: 'bg-gray-100 text-gray-500', COMPLETED: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select
          className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
          value={sipStatus} onChange={e => setSipStatus(e.target.value)}
        >
          {SIP_STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
        <DownloadButton label="Export SIPs" />
      </div>

      {sipSummary && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Active SIPs',  value: sipSummary.activeSips,   cls: 'text-green-600' },
            { label: 'Monthly Book', value: fmt(sipSummary.totalSipAmount), cls: 'text-sparrow-blue' },
            { label: 'Paused',       value: sipSummary.pausedSips,   cls: 'text-yellow-600' },
            { label: 'Total SIPs',   value: sipSummary.totalSips,    cls: 'text-gray-900' },
          ].map(c => (
            <div key={c.label} className="card py-3">
              <p className="text-xs text-gray-500 mb-0.5">{c.label}</p>
              <p className={`text-xl font-bold ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {loading
        ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-sparrow-blue" /></div>
        : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['Client','Fund','Amount','Freq','Date','Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sips.map(s => (
                  <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-800">{s.client?.fullName ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 max-w-[160px] truncate">{s.fund?.schemeName ?? '—'}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">₹{s.amount.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-gray-500">{s.frequency}</td>
                    <td className="px-3 py-2.5 text-gray-500">{s.sipDate}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {sips.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">No SIPs found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}

// ─── Capital Gain Tab ─────────────────────────────────────────────────────
function CapitalGainTab() {
  const [fy, setFy] = useState('2024-25');
  const years = ['2024-25','2023-24','2022-23','2021-22'];

  return (
    <div className="space-y-4">
      <IntegrationNote />
      <div className="flex items-center justify-between">
        <select
          className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
          value={fy} onChange={e => setFy(e.target.value)}
        >
          {years.map(y => <option key={y} value={y}>FY {y}</option>)}
        </select>
        <DownloadButton label="Download Capital Gain Statement" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {['Client','Fund','Units Redeemed','Purchase NAV','Redemption NAV','Short Term Gain','Long Term Gain'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Capital Gain data will appear here once BSE/NSE integration is enabled
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Portfolio Statement Tab ──────────────────────────────────────────────
function PortfolioStatementTab() {
  const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-4">
      <IntegrationNote />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input
            type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <DownloadButton label="PDF Statement" />
          <DownloadButton label="Excel Export" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {['Client','Fund','Folio','Units','NAV','Current Value','Gain/Loss'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Portfolio statement will be generated here for all clients as of selected date
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tax P&L Tab ──────────────────────────────────────────────────────────
function TaxPlTab() {
  const [fy, setFy] = useState('2024-25');
  const years = ['2024-25','2023-24','2022-23','2021-22'];

  const taxRates = [
    { type: 'Short Term Capital Gains (STCG)',       rate: '15%', condition: 'Held < 1 year (Equity/Hybrid)' },
    { type: 'Long Term Capital Gains (LTCG)',        rate: '10%', condition: 'Held > 1 year, gain > ₹1L (Equity)' },
    { type: 'STCG – Debt Funds',                     rate: 'Slab', condition: 'Held < 3 years (Debt)' },
    { type: 'LTCG – Debt Funds (pre Apr 2023)',      rate: '20%',  condition: 'Held > 3 years with indexation' },
    { type: 'ELSS (Tax Saving)',                     rate: '10%',  condition: '3-year lock-in, gains > ₹1L' },
  ];

  return (
    <div className="space-y-4">
      <IntegrationNote />
      <div className="flex items-center justify-between">
        <select
          className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none"
          value={fy} onChange={e => setFy(e.target.value)}
        >
          {years.map(y => <option key={y} value={y}>FY {y}</option>)}
        </select>
        <DownloadButton label="Download Tax P&L Report" />
      </div>

      <div className="card">
        <p className="text-sm font-semibold text-gray-800 mb-3">Tax Rate Reference</p>
        <div className="space-y-2">
          {taxRates.map(t => (
            <div key={t.type} className="flex items-start justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-xs font-medium text-gray-800">{t.type}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{t.condition}</p>
              </div>
              <span className="text-xs font-bold text-sparrow-blue shrink-0 bg-blue-50 px-2 py-0.5 rounded-lg">{t.rate}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">* Tax rates are indicative. Verify with CA for accurate computation. Finance Act 2023 & 2024 amendments apply.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {['Client','STCG (Equity)','LTCG (Equity)','STCG (Debt)','LTCG (Debt)','Net Tax Liability'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-3 py-10 text-center text-gray-400">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Tax P&L will be populated once exchange integration is active for FY {fy}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('aum');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'aum',       label: 'AUM Report',          icon: <BarChart3  className="w-3.5 h-3.5" /> },
    { id: 'sip',       label: 'SIP Report',           icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'capital_gain', label: 'Capital Gain',      icon: <Receipt    className="w-3.5 h-3.5" /> },
    { id: 'statement', label: 'Portfolio Statement',  icon: <FileText   className="w-3.5 h-3.5" /> },
    { id: 'tax_pl',    label: 'Tax P&L',              icon: <RefreshCw  className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">AUM, SIP, capital gain, portfolio statement and tax P&L</p>
      </div>

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

      {tab === 'aum'          && <AumTab />}
      {tab === 'sip'          && <SipTab />}
      {tab === 'capital_gain' && <CapitalGainTab />}
      {tab === 'statement'    && <PortfolioStatementTab />}
      {tab === 'tax_pl'       && <TaxPlTab />}
    </div>
  );
}
