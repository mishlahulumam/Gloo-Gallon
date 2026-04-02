import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '../../services/dashboard'
import { orderService } from '../../services/orders'
import Card, { CardHeader, CardTitle } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import toast from 'react-hot-toast'
import { BarChart3, Download, TrendingUp } from 'lucide-react'

function normalizePaginated(body) {
  if (!body) {
    return { data: [], total: 0, page: 1, limit: 20, total_pages: 1 }
  }
  const inner = body.data
  if (Array.isArray(inner)) {
    return body
  }
  if (inner && typeof inner === 'object' && Array.isArray(inner.data)) {
    return inner
  }
  return { data: [], total: 0, page: 1, limit: 20, total_pages: 1 }
}

const formatIDR = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0)

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('id-ID') : '—')

const SUMMARY_STATS = [
  { key: 'today_orders', label: 'Pesanan hari ini' },
  { key: 'pending_orders', label: 'Menunggu' },
  { key: 'total_customers', label: 'Pelanggan' },
  { key: 'active_products', label: 'Produk aktif' },
  { key: 'low_stock_products', label: 'Stok menipis' },
  { key: 'borrowed_gallons', label: 'Galon dipinjam' },
]

export default function ReportsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats().then((r) => r.data.data),
  })

  const { data: ordersBody, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-reports-orders'],
    queryFn: () => orderService.getAll({ page: 1, limit: 20 }).then((r) => r.data),
  })

  const { data: orders } = normalizePaginated(ordersBody)

  const exportCSV = () => {
    if (!orders?.length) {
      toast.error('Tidak ada data untuk diekspor')
      return
    }
    const rows = [['Order ID', 'Customer', 'Total', 'Status', 'Date']]
    orders.forEach((o) => {
      rows.push([
        o.id,
        o.customer?.name || '',
        o.total_amount,
        o.status,
        new Date(o.created_at).toLocaleDateString('id-ID'),
      ])
    })
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'laporan-pesanan.csv'
    a.click()
  }

  if (statsLoading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-gray-700" aria-hidden />
          <h1 className="text-xl font-semibold text-gray-900">Laporan</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={ordersLoading || !orders?.length}
          onClick={exportCSV}
        >
          <Download size={18} className="mr-2 inline shrink-0" aria-hidden />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-6">
          <p className="text-sm font-medium text-emerald-800">Pendapatan hari ini</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {formatIDR(stats?.today_revenue)}
          </p>
        </Card>
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
            <TrendingUp className="h-4 w-4" aria-hidden />
            Pendapatan bulan ini
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
            {formatIDR(stats?.month_revenue)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {SUMMARY_STATS.map(({ key, label }) => (
          <Card key={key} className="p-4">
            <p className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('id-ID').format(stats?.[key] ?? 0)}
            </p>
            <p className="text-sm text-gray-500">{label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>20 pesanan terakhir</CardTitle>
        </CardHeader>
        {ordersLoading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada pesanan.</p>
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>ID</Th>
                <Th>Pelanggan</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Tanggal</Th>
              </tr>
            </Thead>
            <Tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <Td className="font-medium text-gray-900">#{o.id}</Td>
                  <Td>{o.customer?.name ?? '—'}</Td>
                  <Td>{formatIDR(o.total_amount)}</Td>
                  <Td className="capitalize">{o.status ?? '—'}</Td>
                  <Td>{formatDate(o.created_at)}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}
