import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  ShoppingCart,
  ClipboardList,
  RefreshCw,
  MapPin,
  User,
  LogOut,
  Droplets,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const navItems = [
  { to: '/customer', icon: Home, label: 'Beranda', end: true },
  { to: '/customer/orders', icon: ShoppingCart, label: 'Pesanan' },
  { to: '/customer/subscriptions', icon: RefreshCw, label: 'Langganan' },
  { to: '/customer/addresses', icon: MapPin, label: 'Alamat' },
  { to: '/customer/profile', icon: User, label: 'Profil' },
]

export default function CustomerLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-primary-600" />
            <span className="text-lg font-bold text-primary-600">Gloo-Gallon</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-gray-400 hover:text-red-600"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg">
        <div className="mx-auto flex max-w-3xl justify-around py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-400'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="h-16" />
    </div>
  )
}
