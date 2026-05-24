import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../store'
import { logout } from '../../store/slices/authSlice'
import { authService } from '../../services/authService'

export default function Layout({ children }: { children: React.ReactNode }) {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const location    = useLocation()
  const user        = useSelector((s: RootState) => s.auth.user)
  const accessToken = useSelector((s: RootState) => s.auth.accessToken)

  const onProfileRoute = location.pathname.startsWith('/onboarding')

  async function handleLogout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken && accessToken) await authService.logout(refreshToken)
    } catch { /* ignore */ }
    dispatch(logout())
    navigate('/auth/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sparrow-blue flex items-center justify-center text-white font-bold text-sm">
              BS
            </div>
            <span className="font-bold text-gray-800 text-lg">Blue Sparrow</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 pl-10">Mutual Fund Platform</p>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName ?? 'Investor'}</p>
          <p className="text-xs text-gray-500 truncate">{user?.phone}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="text-base">🏠</span>
            Dashboard
          </NavLink>

          {/* My Profile */}
          <NavLink
            to="/onboarding/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive || onProfileRoute
                  ? 'bg-blue-50 text-sparrow-blue'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="text-base">👤</span>
            My Profile
          </NavLink>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
