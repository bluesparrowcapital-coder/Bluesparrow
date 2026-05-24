import { Navigate, Route, Routes } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from './store'
import Layout from './components/shared/Layout'

// Auth
import RegisterPage from './pages/auth/RegisterPage'
import LoginPage    from './pages/auth/LoginPage'
import SetPinPage   from './pages/auth/SetPinPage'

// Onboarding
import OnboardingStatusPage from './pages/onboarding/OnboardingStatusPage'
import UCCProfilePage       from './pages/onboarding/UCCProfilePage'
import KycStatusPage        from './pages/onboarding/KycStatusPage'

// Phase 2 — Explore & Portfolio
import ExplorePage    from './pages/explore/ExplorePage'
import FundDetailPage from './pages/explore/FundDetailPage'
import InvestPage     from './pages/explore/InvestPage'
import PortfolioPage  from './pages/portfolio/PortfolioPage'

// Phase 3 — SIP, Goals, Analytics, Redemption, Notifications
import SipListPage        from './pages/sip/SipListPage'
import CreateSipPage      from './pages/sip/CreateSipPage'
import GoalsPage          from './pages/goals/GoalsPage'
import CreateGoalPage     from './pages/goals/CreateGoalPage'
import AnalyticsPage      from './pages/portfolio/AnalyticsPage'
import RedeemPage         from './pages/portfolio/RedeemPage'
import NotificationsPage  from './pages/NotificationsPage'

// Dashboard
function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to Blue Sparrow Mutual Fund Platform</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Portfolio Value', value: '₹0', sub: 'View Portfolio', href: '/portfolio',    color: 'text-sparrow-blue' },
          { label: 'Explore Funds',  value: '→',  sub: 'Browse funds',  href: '/explore',       color: 'text-green-700' },
        ].map((card) => (
          <a key={card.label} href={card.href} className="card text-center hover:shadow-md transition-all">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </a>
        ))}
      </div>
      <div className="card bg-gradient-to-r from-sparrow-blue to-sparrow-teal text-white">
        <h2 className="font-semibold text-lg mb-1">Start Investing Today</h2>
        <p className="text-sm opacity-90 mb-3">
          Browse 10,000+ mutual funds and build your portfolio with ease.
        </p>
        <a href="/explore" className="inline-block bg-white text-sparrow-blue text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
          Explore Funds →
        </a>
      </div>
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <a href="/explore"          className="card bg-blue-50 border-0 text-center py-3 hover:bg-blue-100 transition-colors">
            <p className="text-2xl">🔍</p>
            <p className="text-xs text-blue-700 font-medium mt-1">Explore</p>
          </a>
          <a href="/portfolio"         className="card bg-green-50 border-0 text-center py-3 hover:bg-green-100 transition-colors">
            <p className="text-2xl">📈</p>
            <p className="text-xs text-green-700 font-medium mt-1">Portfolio</p>
          </a>
          <a href="/onboarding/status" className="card bg-purple-50 border-0 text-center py-3 hover:bg-purple-100 transition-colors">
            <p className="text-2xl">👤</p>
            <p className="text-xs text-purple-700 font-medium mt-1">Profile</p>
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Guards ────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuth = useSelector((s: RootState) => s.auth.isAuthenticated)
  return isAuth ? <>{children}</> : <Navigate to="/auth/login" replace />
}

// ─── Layout wrapper for protected pages ───────────────────
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<Navigate to="/auth/login" replace />} />

      {/* Auth (no layout) */}
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/login"    element={<LoginPage />} />
      <Route path="/auth/set-pin"  element={<SetPinPage />} />

      {/* Protected routes with sidebar layout */}
      <Route path="/dashboard"            element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/onboarding/status"    element={<ProtectedLayout><OnboardingStatusPage /></ProtectedLayout>} />
      <Route path="/onboarding/profile"   element={<ProtectedLayout><UCCProfilePage /></ProtectedLayout>} />
      <Route path="/onboarding/kyc"       element={<ProtectedLayout><KycStatusPage /></ProtectedLayout>} />

      {/* Phase 2 — Explore & Invest */}
      <Route path="/explore"              element={<ProtectedLayout><ExplorePage /></ProtectedLayout>} />
      <Route path="/explore/:id"          element={<ProtectedLayout><FundDetailPage /></ProtectedLayout>} />
      <Route path="/invest/:fundId"       element={<ProtectedLayout><InvestPage /></ProtectedLayout>} />

      {/* Phase 2 — Portfolio */}
      <Route path="/portfolio"            element={<ProtectedLayout><PortfolioPage /></ProtectedLayout>} />

      {/* Phase 3 — SIP */}
      <Route path="/sip"                  element={<ProtectedLayout><SipListPage /></ProtectedLayout>} />
      <Route path="/sip/create"           element={<ProtectedLayout><CreateSipPage /></ProtectedLayout>} />

      {/* Phase 3 — Goals */}
      <Route path="/goals"                element={<ProtectedLayout><GoalsPage /></ProtectedLayout>} />
      <Route path="/goals/create"         element={<ProtectedLayout><CreateGoalPage /></ProtectedLayout>} />

      {/* Phase 3 — Analytics & Redemption */}
      <Route path="/analytics"            element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
      <Route path="/portfolio/redeem/:portfolioId" element={<ProtectedLayout><RedeemPage /></ProtectedLayout>} />

      {/* Phase 3 — Notifications */}
      <Route path="/notifications"        element={<ProtectedLayout><NotificationsPage /></ProtectedLayout>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  )
}
