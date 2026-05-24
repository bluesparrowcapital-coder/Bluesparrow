import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, TrendingUp, CalendarDays, ChevronRight } from 'lucide-react';
import { goalService, Goal } from '../../services/phase3Service';
import toast from 'react-hot-toast';

const GOAL_ICONS: Record<string, string> = {
  default: '🎯',
};

const fmt = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L`  :
  `₹${n.toLocaleString('en-IN')}`;

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="bg-sparrow-blue h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals]   = useState<Goal[]>([]);
  const [loading, setLoad]  = useState(true);
  const navigate             = useNavigate();

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    try {
      const data = await goalService.list();
      setGoals(data);
    } catch { toast.error('Failed to load goals'); }
    finally  { setLoad(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete goal "${name}"?`)) return;
    try {
      await goalService.delete(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      toast.success('Goal deleted');
    } catch { toast.error('Failed to delete goal'); }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sparrow-blue" />
    </div>
  );

  const totalTarget   = goals.reduce((a, g) => a + g.targetAmount, 0);
  const totalInvested = goals.reduce((a, g) => a + g.sipStats.totalInvested, 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Financial Goals</h1>
          <p className="text-sm text-gray-500">{goals.length} goal{goals.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/goals/create')} className="btn-primary flex items-center gap-1 text-sm px-3 py-2">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-xs text-gray-500 mb-1">Total Target</p>
            <p className="text-lg font-bold text-gray-800">{fmt(totalTarget)}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-gray-500 mb-1">Total Saved</p>
            <p className="text-lg font-bold text-sparrow-blue">{fmt(totalInvested)}</p>
          </div>
        </div>
      )}

      {/* Goal list */}
      {goals.length === 0 ? (
        <div className="card text-center py-12">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-1">No goals yet</p>
          <p className="text-gray-500 text-sm mb-4">Create a goal and link SIPs to track your progress</p>
          <button onClick={() => navigate('/goals/create')} className="btn-primary text-sm">
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/goals/${goal.id}`)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{GOAL_ICONS.default}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{goal.goalName}</p>
                    <p className="text-xs text-gray-500">
                      {goal.daysLeft > 0 ? `${goal.daysLeft} days left` : 'Target reached!'} ·{' '}
                      {new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
              </div>

              <ProgressBar pct={goal.progressPct} />

              <div className="flex justify-between mt-2 text-xs">
                <span className="text-gray-500">Saved: {fmt(goal.sipStats.totalInvested)}</span>
                <span className="font-semibold text-sparrow-blue">{goal.progressPct}%</span>
                <span className="text-gray-500">Target: {fmt(goal.targetAmount)}</span>
              </div>

              {goal.sipStats.activeSips > 0 && (
                <div className="mt-3 flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                  <TrendingUp className="w-3 h-3" />
                  {goal.sipStats.activeSips} active SIP · {fmt(goal.sipStats.totalMonthly)}/mo
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(goal.id, goal.goalName); }}
                className="mt-3 text-xs text-red-400 hover:text-red-600 font-medium"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SIP Calculator card */}
      <div className="card bg-gradient-to-br from-sparrow-blue/5 to-sparrow-teal/5 border-sparrow-blue/20">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-5 h-5 text-sparrow-blue" />
          <h3 className="font-semibold text-gray-800">SIP Calculator</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">Calculate how much to invest monthly to reach your goal</p>
        <button onClick={() => navigate('/goals/create')} className="btn-primary w-full text-sm">
          Try Calculator →
        </button>
      </div>
    </div>
  );
}
