import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, FileText, Download, Award, Info } from 'lucide-react';
import { distributorService } from '../../services/distributorService';
import toast from 'react-hot-toast';

type Tab = 'arn' | 'trail' | 'brokerage' | 'payout';

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <Info className="w-7 h-7 text-blue-400" />
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      <p className="text-xs text-gray-400 max-w-xs">{description}</p>
    </div>
  );
}

// ─── ARN Commission ──────────────────────────────────────────────────────
function ArnCommissionTab({ stats }: { stats: any }) {
  const mockArn = {
    arnCode: stats?.arnCode ?? 'ARN-000000',
    totalAUM: stats?.totalAUM ?? 0,
    upfrontRate: 0.5,
    trailRate: 0.75,
    monthlyUpfront: 0,
    monthlyTrail: 0,
    ytdTotal: 0,
  };

  const upfront = (mockArn.totalAUM * (mockArn.upfrontRate / 100)) / 12;
  const trail   = (mockArn.totalAUM * (mockArn.trailRate   / 100)) / 12;
  const ytd     = (upfront + trail) * 4; // approx

  const breakdown = [
    { label: 'ARN Code',           value: mockArn.arnCode,      cls: 'text-sparrow-blue font-bold' },
    { label: 'Total AUM',          value: fmt(mockArn.totalAUM), cls: 'text-gray-900' },
    { label: 'Upfront Rate',       value: `${mockArn.upfrontRate}%`, cls: 'text-gray-900' },
    { label: 'Trail Rate',         value: `${mockArn.trailRate}%`,   cls: 'text-gray-900' },
    { label: 'Est. Monthly Upfront', value: fmt(upfront),        cls: 'text-green-600' },
    { label: 'Est. Monthly Trail',   value: fmt(trail),           cls: 'text-blue-600' },
    { label: 'Est. YTD Total',       value: fmt(ytd),             cls: 'text-purple-600 font-bold text-base' },
  ];

  return (
    <div className="space-y-4 max-w-xl">
      <div className="bg-gradient-to-br from-sparrow-blue/10 to-sparrow-teal/10 rounded-2xl p-4 border border-blue-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">ARN Commission Summary</p>
        <p className="text-2xl font-bold text-sparrow-blue">{fmt(upfront + trail)}<span className="text-sm font-normal text-gray-500">/month (est.)</span></p>
        <p className="text-xs text-gray-400 mt-1">Based on current AUM of {fmt(mockArn.totalAUM)}</p>
      </div>

      <div className="card">
        {breakdown.map(row => (
          <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-600">{row.label}</span>
            <span className={`text-sm ${row.cls}`}>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="card bg-yellow-50 border-yellow-100">
        <p className="text-xs font-semibold text-yellow-700 mb-1">⚠️ Disclaimer</p>
        <p className="text-xs text-yellow-600">
          Commission figures shown are indicative estimates based on current AUM. Actual commissions are calculated by BSE/NSE/AMFI and may vary. Please refer to official commission statements from your AMC portal.
        </p>
      </div>
    </div>
  );
}

// ─── Trail Commission ─────────────────────────────────────────────────────
function TrailCommissionTab({ stats }: { stats: any }) {
  const totalAUM    = stats?.totalAUM ?? 0;
  const trailRate   = 0.75;
  const monthlyTrail = (totalAUM * (trailRate / 100)) / 12;

  const months = ['Jan','Feb','Mar','Apr','May','Jun'].map((m, i) => ({
    month: m, aum: totalAUM * (0.9 + i * 0.02), trail: monthlyTrail * (0.9 + i * 0.02),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">Current Month Trail</p>
          <p className="text-xl font-bold text-sparrow-blue">{fmt(monthlyTrail)}</p>
          <p className="text-xs text-gray-400">@ {trailRate}% annual trail</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500 mb-1">AUM (Trail Eligible)</p>
          <p className="text-xl font-bold text-gray-900">{fmt(totalAUM)}</p>
          <p className="text-xs text-gray-400">Across all clients</p>
        </div>
      </div>

      <div className="card">
        <p className="text-sm font-semibold text-gray-800 mb-3">Monthly Trail Trend</p>
        <div className="space-y-2">
          {months.map(m => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-8">{m.month}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sparrow-blue rounded-full"
                  style={{ width: `${Math.min((m.trail / (monthlyTrail * 1.2)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-700 w-20 text-right">{fmt(m.trail)}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">* Indicative trail based on AUM trend. Actual values may differ.</p>
      </div>
    </div>
  );
}

// ─── Brokerage ────────────────────────────────────────────────────────────
function BrokerageTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Transactions', value: '—', sub: 'This month', icon: '📋' },
          { label: 'Brokerage Earned',   value: '—', sub: 'Current month', icon: '💰' },
          { label: 'Avg per Txn',        value: '—', sub: 'This month', icon: '📊' },
          { label: 'YTD Brokerage',      value: '—', sub: 'Financial year', icon: '🏆' },
        ].map(c => (
          <div key={c.label} className="card">
            <span className="text-2xl">{c.icon}</span>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>
      <ComingSoon
        title="Per-Transaction Brokerage"
        description="Brokerage breakdown per transaction requires BSE / NSE exchange integration. Data will be auto-populated once integration is enabled for your ARN."
      />
    </div>
  );
}

// ─── Payout Reports ───────────────────────────────────────────────────────
function PayoutTab() {
  const payouts = [
    { month: 'Jun 2025', amount: '—', status: 'Pending', tds: '—' },
    { month: 'May 2025', amount: '—', status: 'Processed', tds: '—' },
    { month: 'Apr 2025', amount: '—', status: 'Processed', tds: '—' },
    { month: 'Mar 2025', amount: '—', status: 'Processed', tds: '—' },
  ];
  const STATUS_CLS: Record<string, string> = {
    Pending:   'bg-yellow-100 text-yellow-700',
    Processed: 'bg-green-100 text-green-700',
    Failed:    'bg-red-100 text-red-600',
  };

  return (
    <div className="space-y-4">
      <div className="card bg-blue-50 border-blue-100 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          Payout statements are generated by BSE/AMC and sent to your registered bank account. Amounts shown are placeholder values until exchange integration is active.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {['Month', 'Gross Commission', 'TDS (10%)', 'Net Payout', 'Status', 'Action'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payouts.map(p => (
              <tr key={p.month} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium text-gray-800">{p.month}</td>
                <td className="px-3 py-2.5 text-gray-600">{p.amount}</td>
                <td className="px-3 py-2.5 text-gray-600">{p.tds}</td>
                <td className="px-3 py-2.5 text-gray-600">—</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[p.status] ?? ''}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <button className="flex items-center gap-1 text-sparrow-blue hover:underline text-[11px]">
                    <Download className="w-3 h-3" />PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function CommissionPage() {
  const [tab,   setTab]   = useState<Tab>('arn');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    distributorService.getDashboard().then(setStats).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'arn',       label: 'ARN Commission', icon: <Award      className="w-3.5 h-3.5" /> },
    { id: 'trail',     label: 'Trail',          icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'brokerage', label: 'Brokerage',      icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'payout',    label: 'Payouts',        icon: <FileText   className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Commission Module</h1>
        <p className="text-sm text-gray-500">View ARN commission, trail, brokerage and payout reports</p>
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

      {tab === 'arn'       && <ArnCommissionTab   stats={stats} />}
      {tab === 'trail'     && <TrailCommissionTab stats={stats} />}
      {tab === 'brokerage' && <BrokerageTab />}
      {tab === 'payout'    && <PayoutTab />}
    </div>
  );
}
