import { useEffect, useState } from 'react';
import { TrendingUp, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts';
import { analyticsService, AllocationItem, PortfolioReturns } from '../../services/phase3Service';
import toast from 'react-hot-toast';

const COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6'];

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

function StatCard({ label, value, sub, color = 'text-gray-900' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [alloc, setAlloc]     = useState<AllocationItem[]>([]);
  const [returns, setReturns] = useState<PortfolioReturns | null>(null);
  const [benchmarks, setBench]= useState<any[]>([]);
  const [loading, setLoad]    = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsService.allocation(),
      analyticsService.returns(),
      analyticsService.benchmarks(),
    ]).then(([a, r, b]) => {
      setAlloc(a.allocation);
      setReturns(r);
      setBench(b.benchmarks);
    }).catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoad(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
    </div>
  );

  if (!returns || alloc.length === 0) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <PieIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-600 font-semibold mb-1">No portfolio data yet</p>
      <p className="text-sm text-gray-500">Invest in mutual funds to see analytics here</p>
    </div>
  );

  const benchmarkChartData = benchmarks.map((b: any) => ({
    name: b.name,
    '1Y': b.returns?.['1Y'] ?? 0,
    '3Y': b.returns?.['3Y'] ?? 0,
    '5Y': b.returns?.['5Y'] ?? 0,
    portfolio: returns?.cagrPct ?? 0,
  }));

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Portfolio Analytics</h1>
        <p className="text-sm text-gray-500">Your investment overview</p>
      </div>

      {/* Returns summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Invested"       value={fmt(returns.totalInvested)} />
        <StatCard label="Current Value"  value={fmt(returns.totalCurrentVal)} />
        <StatCard
          label="Absolute Return"
          value={`${returns.absoluteReturn >= 0 ? '+' : ''}${fmt(returns.absoluteReturn)}`}
          sub={`${returns.absoluteReturnPct >= 0 ? '+' : ''}${returns.absoluteReturnPct.toFixed(2)}%`}
          color={returns.absoluteReturn >= 0 ? 'text-green-600' : 'text-red-500'}
        />
        <StatCard
          label="CAGR"
          value={`${returns.cagrPct >= 0 ? '+' : ''}${returns.cagrPct.toFixed(2)}%`}
          sub="annualised"
          color={returns.cagrPct >= 0 ? 'text-green-600' : 'text-red-500'}
        />
      </div>

      {/* Portfolio growth chart */}
      {returns.chartData?.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-sparrow-blue" />
            <h2 className="font-semibold text-gray-800">Portfolio Growth</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={returns.chartData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v) => v >= 1e5 ? `₹${(v/1e5).toFixed(0)}L` : `₹${(v/1e3).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(v: number) => [fmt(v), 'Value']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Asset Allocation */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <PieIcon className="w-4 h-4 text-sparrow-blue" />
          <h2 className="font-semibold text-gray-800">Asset Allocation</h2>
        </div>
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie
                data={alloc}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {alloc.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [fmt(v), '']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2">
            {alloc.map((item, i) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-700">{item.category}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800">{item.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benchmark comparison */}
      {benchmarkChartData.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-sparrow-blue" />
            <h2 className="font-semibold text-gray-800">Benchmark Comparison</h2>
            <span className="text-xs text-gray-400 ml-auto">1Y Returns (%)</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={benchmarkChartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(1)}%`]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="1Y" name="1Y Return" fill="#4F46E5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {benchmarks.map((b: any, i: number) => (
              <div key={b.name} className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs font-semibold text-gray-700">{b.name}</p>
                <div className="flex gap-3 mt-1">
                  {['1Y','3Y','5Y'].map((period) => (
                    <div key={period}>
                      <p className="text-xs text-gray-400">{period}</p>
                      <p className={`text-xs font-bold ${b.returns?.[period] >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {b.returns?.[period] != null ? `${b.returns[period]}%` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
