import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, BarChart3, Wallet, UserPlus, FileText, Briefcase, Shield } from 'lucide-react';
import { distributorService, DashboardStats } from '../../services/distributorService';
import toast from 'react-hot-toast';

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function DistributorDashboard() {
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoad]  = useState(true);
  const navigate             = useNavigate();

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const data = await distributorService.getDashboard();
      setStats(data);
    } catch (err: any) {
      if (err?.response?.status === 500 && err?.response?.data?.message?.includes('profile not found')) {
        toast('Please complete your Distributor profile first.', { icon: 'ℹ️' });
        navigate('/distributor/profile');
      } else {
        toast.error('Failed to load dashboard');
      }
    } finally {
      setLoad(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distributor Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your clients and AUM</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/distributor/clients')}
            className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2"
          >
            <UserPlus className="w-4 h-4" /> Add Client
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<Wallet className="w-5 h-5 text-sparrow-blue" />}
              label="Total AUM"
              value={fmt(stats.totalAUM)}
              sub={`Invested: ${fmt(stats.totalInvested)}`}
              color="text-sparrow-blue"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5 text-green-600" />}
              label="Absolute Returns"
              value={fmt(stats.absoluteReturn)}
              sub={`${stats.returnPct >= 0 ? '+' : ''}${stats.returnPct.toFixed(2)}%`}
              color={stats.absoluteReturn >= 0 ? 'text-green-600' : 'text-red-500'}
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-purple-600" />}
              label="Total Clients"
              value={stats.totalClients.toString()}
              sub={`+${stats.newClientsThisMonth} this month`}
              color="text-purple-600"
            />
            <StatCard
              icon={<BarChart3 className="w-5 h-5 text-orange-500" />}
              label="SIP Book (Monthly)"
              value={fmt(stats.sipBookMonthlyValue)}
              sub={`${stats.activeSipCount} active SIPs`}
              color="text-orange-500"
            />
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '👥', label: 'My Clients',       href: '/distributor/clients',           color: 'bg-blue-50 hover:bg-blue-100',   text: 'text-blue-700' },
                { icon: '📊', label: 'AUM Reports',      href: '/distributor/reports',           color: 'bg-green-50 hover:bg-green-100',  text: 'text-green-700' },
                { icon: '💼', label: 'Model Portfolios', href: '/distributor/model-portfolios',  color: 'bg-purple-50 hover:bg-purple-100',text: 'text-purple-700' },
                { icon: '🛡️', label: 'Audit Trail',      href: '/distributor/compliance',        color: 'bg-orange-50 hover:bg-orange-100', text: 'text-orange-700' },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.href)}
                  className={`card border-0 ${a.color} text-center py-4 transition-colors`}
                >
                  <p className="text-2xl mb-1">{a.icon}</p>
                  <p className={`text-sm font-medium ${a.text}`}>{a.label}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Profile Setup Banner */}
      {!stats && !loading && (
        <div className="card bg-gradient-to-r from-sparrow-blue to-sparrow-teal text-white">
          <h2 className="font-semibold text-lg mb-1">Complete Your Profile</h2>
          <p className="text-sm opacity-90 mb-3">
            Set up your ARN number and firm details to start managing clients.
          </p>
          <button
            onClick={() => navigate('/distributor/profile')}
            className="inline-block bg-white text-sparrow-blue text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Setup Profile →
          </button>
        </div>
      )}

      {/* Navigation tiles */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Users className="w-5 h-5" />, label: 'Client Management', href: '/distributor/clients', desc: 'View & manage all clients' },
          { icon: <FileText className="w-5 h-5" />, label: 'Business Reports', href: '/distributor/reports', desc: 'AUM, SIP & monthly reports' },
          { icon: <Briefcase className="w-5 h-5" />, label: 'Model Portfolios', href: '/distributor/model-portfolios', desc: 'Create & assign model portfolios' },
          { icon: <Shield className="w-5 h-5" />, label: 'Compliance', href: '/distributor/compliance', desc: 'Audit trail & ARN compliance' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.href)}
            className="card text-left hover:shadow-md transition-all"
          >
            <div className="text-sparrow-blue mb-2">{item.icon}</div>
            <p className="font-medium text-gray-800 text-sm">{item.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
