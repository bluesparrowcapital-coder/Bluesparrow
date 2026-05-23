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
import CreateProfilePage    from './pages/onboarding/CreateProfilePage'
import AddressPage          from './pages/onboarding/AddressPage'
import NomineePage          from './pages/onboarding/NomineePage'
import BankPage             from './pages/onboarding/BankPage'
import KycStatusPage        from './pages/onboarding/KycStatusPage'

// Dashboard (Phase 1 landing)
function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to Blue Sparrow Mutual Fund Platform</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Portfolio Value', value: '₹0', sub: 'No investments yet', color: 'bg-blue-50 text-sparrow-blue' },
          { label: 'Total Returns',   value: '0%', sub: 'Add funds to begin',  color: 'bg-green-50 text-green-700' },
        ].map((card) => (
          <div key={card.label} className="card text-center">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-1 ${card.color.split(' ')[1]}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>
      <div className="card bg-gradient-to-r from-sparrow-blue to-sparrow-teal text-white">
        <h2 className="font-semibold text-lg mb-1">Complete your onboarding</h2>
        <p className="text-sm opacity-90 mb-3">
          Finish KYC verification and bank setup to start investing.
        </p>
        <a href="/onboarding/status" className="inline-block bg-white text-sparrow-blue text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors">
          Go to My Profile →
        </a>
      </div>
      <div className="card bg-yellow-50 border border-yellow-200">
        <p className="text-sm text-yellow-800 font-medium">
          🚀 Fund Browse &amp; SIP features coming in Phase 2
        </p>
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
      <Route path="/onboarding/profile"   element={<ProtectedLayout><CreateProfilePage /></ProtectedLayout>} />
      <Route path="/onboarding/address"   element={<ProtectedLayout><AddressPage /></ProtectedLayout>} />
      <Route path="/onboarding/nominees"  element={<ProtectedLayout><NomineePage /></ProtectedLayout>} />
      <Route path="/onboarding/bank"      element={<ProtectedLayout><BankPage /></ProtectedLayout>} />
      <Route path="/onboarding/kyc"       element={<ProtectedLayout><KycStatusPage /></ProtectedLayout>} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  )
}
