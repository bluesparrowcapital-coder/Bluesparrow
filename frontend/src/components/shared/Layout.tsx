import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import type { RootState } from '../../store'
import { logout } from '../../store/slices/authSlice'
import { authService } from '../../services/authService'
import { notificationService } from '../../services/phase3Service'

export default function Layout({ children }: { children: React.ReactNode }) {
  const dispatch    = useDispatch()
  const navigate    = useNavigate()
  const location    = useLocation()
  const user        = useSelector((s: RootState) => s.auth.user)
  const accessToken = useSelector((s: RootState) => s.auth.accessToken)
  const [unread, setUnread] = useState(0)

  const onProfileRoute = location.pathname.startsWith('/onboarding')

  useEffect(() => {
    notificationService.list(1, 1)
      .then(({ unread: u }) => setUnread(u))
      .catch(() => {})
  }, [location.pathname])

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
          <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName ?? 'User'}</p>
          <p className="text-xs text-gray-500 truncate">{user?.phone}</p>
          {user?.role === 'DISTRIBUTOR' && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sparrow-blue/10 text-sparrow-blue">
              Distributor
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

          {/* ── Investor-only nav ── */}
          {user?.role !== 'DISTRIBUTOR' && (
            <>
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

              <NavLink
                to="/explore"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base">🔍</span>
                Explore Funds
              </NavLink>

              <NavLink
                to="/portfolio"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base">📈</span>
                My Portfolio
              </NavLink>

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

              <NavLink
                to="/sip"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base">📅</span>
                My SIPs
              </NavLink>

              <NavLink
                to="/goals"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base">🎯</span>
                My Goals
              </NavLink>

              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base">📊</span>
                Analytics
              </NavLink>

              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base relative inline-block">
                  <Bell className="w-4 h-4 inline -mt-0.5" />
                  {unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                Notifications
              </NavLink>
            </>
          )}

          {/* ── Distributor-only nav ── */}
          {user?.role === 'DISTRIBUTOR' && (
            <>
              {[
                { to: '/distributor/dashboard',        icon: '🏦', label: 'Dashboard' },
                { to: '/distributor/clients',          icon: '👥', label: 'My Clients' },
                { to: '/distributor/model-portfolios', icon: '💼', label: 'Model Portfolios' },
                { to: '/distributor/reports',          icon: '📊', label: 'Business Reports' },
                { to: '/distributor/compliance',       icon: '🛡️', label: 'Compliance' },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-sparrow-blue' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
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
