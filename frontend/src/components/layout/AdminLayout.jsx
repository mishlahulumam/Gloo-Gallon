import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  MapPin,
  CreditCard,
  BarChart3,
  Menu,
  X,
  LogOut,
  Droplets,
  ChevronDown,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Pesanan' },
  { to: '/admin/products', icon: Package, label: 'Produk' },
  { to: '/admin/stock', icon: Droplets, label: 'Stok' },
  { to: '/admin/customers', icon: Users, label: 'Customer' },
  { to: '/admin/drivers', icon: Truck, label: 'Kurir' },
  { to: '/admin/deliveries', icon: MapPin, label: 'Pengiriman' },
  { to: '/admin/payments', icon: CreditCard, label: 'Pembayaran' },
  { to: '/admin/reports', icon: BarChart3, label: 'Laporan' },
]

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Droplets className="h-7 w-7 text-primary-600" />
          <span className="text-xl font-bold text-primary-600">Gloo-Gallon</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            <Menu size={24} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500">Admin</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
