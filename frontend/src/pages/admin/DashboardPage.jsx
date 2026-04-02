import { useQuery } from '@tanstack/react-query'
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  Droplets,
  TrendingUp,
  Clock,
} from 'lucide-react'
import Card, { CardTitle } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { dashboardService } from '../../services/dashboard'

const formatIDR = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value ?? 0)

const iconToneClass = {
  blue: 'rounded-lg bg-blue-100 p-3 text-blue-600',
  yellow: 'rounded-lg bg-yellow-100 p-3 text-yellow-600',
  green: 'rounded-lg bg-green-100 p-3 text-green-600',
  emerald: 'rounded-lg bg-emerald-100 p-3 text-emerald-600',
  indigo: 'rounded-lg bg-indigo-100 p-3 text-indigo-600',
  purple: 'rounded-lg bg-purple-100 p-3 text-purple-600',
  red: 'rounded-lg bg-red-100 p-3 text-red-600',
  orange: 'rounded-lg bg-orange-100 p-3 text-orange-600',
}

const statCards = [
  {
    key: 'today_orders',
    label: 'Pesanan Hari Ini',
    icon: ShoppingCart,
    tone: 'blue',
    format: 'number',
  },
  {
    key: 'pending_orders',
    label: 'Pesanan Pending',
    icon: Clock,
    tone: 'yellow',
    format: 'number',
  },
  {
    key: 'today_revenue',
    label: 'Pendapatan Hari Ini',
    icon: DollarSign,
    tone: 'green',
    format: 'currency',
  },
  {
    key: 'month_revenue',
    label: 'Pendapatan Bulan Ini',
    icon: TrendingUp,
    tone: 'emerald',
    format: 'currency',
  },
  {
    key: 'total_customers',
    label: 'Total Customer',
    icon: Users,
    tone: 'indigo',
    format: 'number',
  },
  {
    key: 'active_products',
    label: 'Produk Aktif',
    icon: Package,
    tone: 'purple',
    format: 'number',
  },
  {
    key: 'low_stock_products',
    label: 'Stok Menipis',
    icon: AlertTriangle,
    tone: 'red',
    format: 'number',
  },
  {
    key: 'borrowed_gallons',
    label: 'Galon Dipinjam',
    icon: Droplets,
    tone: 'orange',
    format: 'number',
  },
]

function formatStatValue(format, value) {
  if (format === 'currency') return formatIDR(value)
  return new Intl.NumberFormat('id-ID').format(value ?? 0)
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats().then((r) => r.data.data),
  })

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <CardTitle>Dashboard</CardTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, tone, format }) => (
          <Card key={key} className="p-4">
            <div className="flex items-center gap-4">
              <div className={iconToneClass[tone]}>
                <Icon className="h-6 w-6 shrink-0" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-2xl font-bold text-gray-900">
                  {formatStatValue(format, data?.[key])}
                </p>
                <p className="truncate text-sm text-gray-500">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
