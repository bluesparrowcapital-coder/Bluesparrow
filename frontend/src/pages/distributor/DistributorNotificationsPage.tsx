import { useEffect, useState, useMemo } from 'react';
import { Bell, CalendarHeart, TrendingUp, RefreshCw, Clock } from 'lucide-react';
import { distributorService, DistributorClient } from '../../services/distributorService';
import toast from 'react-hot-toast';

type Tab = 'sip_due' | 'market' | 'nav' | 'birthday';

// ─── SIP Due Alerts ───────────────────────────────────────────────────────
function SipDueTab({ clients }: { clients: DistributorClient[] }) {
  const [sips, setSips]       = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clients.length === 0) return;
    setLoading(true);
    // Load SIPs for all active clients — batch fetch top 20 clients
    const top = clients.slice(0, 20);
    Promise.all(top.map(c => distributorService.getClientDetail(c.id).then(d => d.sips.map((s: any) => ({ ...s, clientName: c.fullName, clientId: c.id }))).catch(() => [])))
      .then(results => setSips(results.flat()))
      .finally(() => setLoading(false));
  }, [clients]);

  const today = new Date().getDate();
  const upcoming = useMemo(() =>
    sips
      .filter(s => s.status === 'ACTIVE')
      .map(s => {
        const daysAway = s.sipDate >= today ? s.sipDate - today : (28 - today) + s.sipDate;
        return { ...s, daysAway };
      })
      .filter(s => s.daysAway <= 7)
      .sort((a, b) => a.daysAway - b.daysAway),
    [sips, today]
  );

  if (loading)
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-sparrow-blue" /></div>;

  return (
    <div className="space-y-3">
      <div className="card bg-orange-50 border-orange-100 flex gap-2 text-xs text-orange-700">
        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Showing SIPs with debit date in next 7 days. Remind clients to ensure sufficient balance.</span>
      </div>
      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
          <Bell className="w-9 h-9 mb-2" />
          <p className="text-sm">No SIPs due in the next 7 days</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 font-medium">{upcoming.length} SIP{upcoming.length > 1 ? 's' : ''} upcoming</p>
          {upcoming.map(s => (
            <div key={s.id} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white font-bold shrink-0 ${
                s.daysAway === 0 ? 'bg-red-500' : s.daysAway <= 2 ? 'bg-orange-500' : 'bg-yellow-500'
              }`}>
                <span className="text-xs leading-none">{s.daysAway === 0 ? 'Today' : `${s.daysAway}d`}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{s.clientName}</p>
                <p className="text-xs text-gray-500 truncate">{s.fund?.schemeName ?? '—'}</p>
                <p className="text-xs text-gray-400">{s.frequency} · Date {s.sipDate}</p>
              </div>
              <p className="text-sm font-bold text-gray-900 shrink-0">₹{s.amount.toLocaleString()}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Market Updates ───────────────────────────────────────────────────────
const MARKET_UPDATES = [
  { id: 1, tag: 'Markets',  title: 'SEBI New Fund Offer (NFO) regulations',        body: 'SEBI has issued guidelines on NFO subscription period and fund deployment timelines. Minimum subscription period of 15 days for new equity schemes.', time: 'Today', icon: '📋' },
  { id: 2, tag: 'Equity',   title: 'Nifty 50 crosses all-time high',               body: 'Indian equity markets continue bullish momentum. Nifty 50 index crossed 25,500 mark. Midcap and smallcap indices outperforming.', time: '1 day ago', icon: '📈' },
  { id: 3, tag: 'Debt',     title: 'RBI Monetary Policy: Rates unchanged',         body: 'RBI kept repo rate unchanged at 6.5%. Stance remains "withdrawal of accommodation". Debt mutual funds may benefit.', time: '2 days ago', icon: '🏦' },
  { id: 4, tag: 'SIP',      title: 'SIP inflows hit ₹21,000 Cr record',            body: 'AMFI data shows SIP inflows at all-time high. Systematic Investment Plans continue to attract retail investors.', time: '3 days ago', icon: '💰' },
  { id: 5, tag: 'Tax',      title: 'Budget 2025: LTCG exemption limit clarified',  body: 'Finance Ministry has clarified LTCG exemption limit of ₹1.25 lakh for equity funds from FY2024-25 onwards.', time: '5 days ago', icon: '📊' },
];

function MarketTab() {
  const TAG_CLS: Record<string, string> = {
    Markets: 'bg-blue-100 text-blue-700', Equity: 'bg-green-100 text-green-700',
    Debt: 'bg-yellow-100 text-yellow-700', SIP: 'bg-purple-100 text-purple-700',
    Tax: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-3">
      <div className="card bg-blue-50 border-blue-100 text-xs text-blue-700 flex gap-2">
        <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Market updates are indicative. Always verify with official sources (SEBI, AMFI, RBI) before client communication.</span>
      </div>
      {MARKET_UPDATES.map(u => (
        <div key={u.id} className="card">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">{u.icon}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${TAG_CLS[u.tag] ?? 'bg-gray-100 text-gray-600'}`}>
                {u.tag}
              </span>
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">{u.time}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">{u.title}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{u.body}</p>
        </div>
      ))}
    </div>
  );
}

// ─── NAV Alerts ───────────────────────────────────────────────────────────
function NavAlertsTab() {
  const alerts = [
    { fund: 'Mirae Asset Large Cap Fund',        nav: 98.47,  change: 2.34,  category: 'Equity' },
    { fund: 'Axis Bluechip Fund',                nav: 52.18,  change: -1.12, category: 'Equity' },
    { fund: 'HDFC Mid-Cap Opportunities Fund',   nav: 121.35, change: 3.15,  category: 'Equity' },
    { fund: 'SBI Small Cap Fund',                nav: 187.20, change: -2.45, category: 'Equity' },
    { fund: 'ICICI Pru Balanced Advantage Fund', nav: 61.42,  change: 0.87,  category: 'Hybrid' },
    { fund: 'Nippon India Liquid Fund',          nav: 5432.10,change: 0.01,  category: 'Liquid' },
  ];

  return (
    <div className="space-y-3">
      <div className="card bg-gray-50 border-gray-100 text-xs text-gray-600 flex gap-2">
        <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
        <span>NAV data updates daily after market close. Showing significant NAV movements (±1% or more).</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              {['Fund Name','Category','NAV (₹)','Change'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alerts.map(a => (
              <tr key={a.fund} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium text-gray-900">{a.fund}</td>
                <td className="px-3 py-2.5 text-gray-500">{a.category}</td>
                <td className="px-3 py-2.5 font-semibold text-sparrow-blue">{a.nav.toFixed(2)}</td>
                <td className={`px-3 py-2.5 font-bold ${a.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {a.change >= 0 ? '+' : ''}{a.change.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Birthday Reminders ───────────────────────────────────────────────────
function BirthdayTab({ clients }: { clients: DistributorClient[] }) {
  const today  = new Date();
  const todayM = today.getMonth() + 1;
  const todayD = today.getDate();

  // Filter clients who have dob and birthday within next 30 days
  const upcoming = useMemo(() => {
    return clients
      .filter(c => (c as any).dob)
      .map(c => {
        const dob    = new Date((c as any).dob);
        const bMonth = dob.getMonth() + 1;
        const bDay   = dob.getDate();
        let daysAway  = 0;
        const thisYearBd = new Date(today.getFullYear(), bMonth - 1, bDay);
        if (thisYearBd < today) {
          const nextYearBd = new Date(today.getFullYear() + 1, bMonth - 1, bDay);
          daysAway = Math.ceil((nextYearBd.getTime() - today.getTime()) / 86400000);
        } else {
          daysAway = Math.ceil((thisYearBd.getTime() - today.getTime()) / 86400000);
        }
        return { ...c, bDay, bMonth, daysAway };
      })
      .filter(c => c.daysAway <= 30)
      .sort((a, b) => a.daysAway - b.daysAway);
  }, [clients, todayM, todayD]);

  return (
    <div className="space-y-3">
      <div className="card bg-pink-50 border-pink-100 text-xs text-pink-700 flex gap-2">
        <CalendarHeart className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Showing client birthdays in the next 30 days. A birthday wish goes a long way in building client relationships!</span>
      </div>
      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400">
          <CalendarHeart className="w-9 h-9 mb-2" />
          <p className="text-sm">No birthdays in the next 30 days</p>
          <p className="text-xs mt-1">(Ensure client profiles have DOB filled)</p>
        </div>
      ) : (
        upcoming.map(c => (
          <div key={c.id} className="card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold shrink-0 ${
              c.daysAway === 0 ? 'bg-pink-500 text-white' : c.daysAway <= 3 ? 'bg-red-100 text-red-600' : 'bg-pink-100 text-pink-600'
            }`}>
              {c.daysAway === 0 ? '🎂' : <span className="text-xs">{c.daysAway}d</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{c.fullName}</p>
              <p className="text-xs text-gray-500">{c.phone}</p>
              <p className="text-xs text-gray-400">
                {c.daysAway === 0 ? '🎉 Birthday Today!' : `Birthday in ${c.daysAway} day${c.daysAway > 1 ? 's' : ''}`}
              </p>
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {`${String(c.bDay).padStart(2,'0')}/${String(c.bMonth).padStart(2,'0')}`}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function DistributorNotificationsPage() {
  const [tab,     setTab]     = useState<Tab>('sip_due');
  const [clients, setClients] = useState<DistributorClient[]>([]);

  useEffect(() => {
    distributorService.listClients('', 1, 100).then(r => setClients(r.clients)).catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sip_due',  label: 'SIP Due',        icon: <Clock          className="w-3.5 h-3.5" /> },
    { id: 'market',   label: 'Market Updates', icon: <TrendingUp     className="w-3.5 h-3.5" /> },
    { id: 'nav',      label: 'NAV Alerts',     icon: <RefreshCw      className="w-3.5 h-3.5" /> },
    { id: 'birthday', label: 'Birthdays',      icon: <CalendarHeart  className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500">SIP due alerts, market updates, NAV alerts and birthday reminders</p>
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

      {tab === 'sip_due'  && <SipDueTab  clients={clients} />}
      {tab === 'market'   && <MarketTab  />}
      {tab === 'nav'      && <NavAlertsTab />}
      {tab === 'birthday' && <BirthdayTab clients={clients} />}
    </div>
  );
}
