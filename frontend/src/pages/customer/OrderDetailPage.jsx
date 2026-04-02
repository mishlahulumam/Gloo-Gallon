import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { orderService } from '../../services/orders'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
} from 'lucide-react'
import { cn } from '../../utils/cn'

const formatIDR = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0)

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('id-ID') : '—')

const formatDateTime = (date) =>
  date
    ? new Date(date).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—'

const FLOW = ['pending', 'confirmed', 'processing', 'delivering', 'delivered', 'completed']

const TRACKING_STEPS = [
  { key: 'pending', label: 'Pending', Icon: Clock },
  { key: 'confirmed', label: 'Confirmed', Icon: Package },
  { key: 'processing', label: 'Processing', Icon: Package },
  { key: 'delivering', label: 'Delivering', Icon: Truck },
  { key: 'delivered', label: 'Delivered', Icon: MapPin },
  { key: 'completed', label: 'Completed', Icon: CheckCircle },
]

function getStepVisual(index, status) {
  if (status === 'cancelled') return 'future'
  if (status === 'completed') return 'done'
  const cur = FLOW.indexOf(status)
  if (cur === -1) return 'future'
  if (index < cur) return 'done'
  if (index === cur) return 'current'
  return 'future'
}

function lineAfterStepIsGreen(index, status) {
  if (status === 'cancelled') return false
  if (status === 'completed') return true
  const cur = FLOW.indexOf(status)
  if (cur === -1) return false
  return index < cur
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () =>
      orderService.getOrderDetail(id).then((r) => r.data.data || r.data),
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!isError || !error) return
    if (error.response?.status === 404) return
    const msg = error.response?.data?.error
    toast.error(typeof msg === 'string' ? msg : 'Gagal memuat pesanan')
  }, [isError, error])

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-8 pt-2 sm:px-6">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 shrink-0"
          onClick={() => navigate(-1)}
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-gray-600">Kembali</span>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !order ? (
        <Card className="p-6 text-center text-gray-600">
          <p>Pesanan tidak ditemukan.</p>
          <Link
            to="/customer/orders"
            className="mt-3 inline-block text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
          >
            Lihat daftar pesanan
          </Link>
        </Card>
      ) : (
        <>
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  Pesanan #{order.id}
                </h1>
                <p className="mt-1 text-sm text-gray-500">{formatDate(order.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge status={order.status}>{order.status}</Badge>
                <Badge status={order.payment_status}>{order.payment_status}</Badge>
              </div>
            </div>
            {order.payment_status === 'pending' ? (
              <Link
                to={`/customer/orders/${order.id}/pay`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 sm:w-auto"
              >
                Bayar sekarang
              </Link>
            ) : null}
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">Lacak pesanan</h2>
            {order.status === 'cancelled' ? (
              <p className="mt-2 text-sm text-red-700">Pesanan ini dibatalkan.</p>
            ) : null}
            <ol className="mt-4">
              {TRACKING_STEPS.map((step, index) => {
                const visual = getStepVisual(index, order.status)
                const Icon = step.Icon
                const isLast = index === TRACKING_STEPS.length - 1
                const lineGreen = lineAfterStepIsGreen(index, order.status)

                return (
                  <li key={step.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-white',
                          visual === 'done' &&
                            'border-green-500 bg-green-500 text-white shadow-sm shadow-green-500/20',
                          visual === 'current' &&
                            'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25',
                          visual === 'future' && 'border-gray-300 text-gray-400'
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      {!isLast ? (
                        <div
                          className={cn(
                            'my-1 w-0.5 flex-1 min-h-[1.25rem]',
                            lineGreen ? 'bg-green-500' : 'bg-gray-200'
                          )}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className={cn('min-w-0 flex-1', !isLast && 'pb-6')}>
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          visual === 'done' && 'text-green-800',
                          visual === 'current' && 'text-blue-800',
                          visual === 'future' && 'text-gray-500'
                        )}
                      >
                        {step.label}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>

          {order.delivery ? (
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">Pengiriman</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-gray-500">Driver</dt>
                  <dd className="font-medium text-gray-900">
                    {order.delivery.driver?.name ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Jadwal</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDateTime(order.delivery.scheduled_at)}
                  </dd>
                </div>
              </dl>
            </Card>
          ) : null}

          <Card className="p-4 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MapPin className="h-5 w-5 text-primary-600" aria-hidden />
              Alamat
            </h2>
            <p className="text-sm text-gray-800">{order.address?.full_address ?? '—'}</p>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Item pesanan</h2>
            <Table>
              <Thead>
                <tr>
                  <Th>Produk</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Harga satuan</Th>
                  <Th className="text-right">Subtotal</Th>
                </tr>
              </Thead>
              <Tbody>
                {(order.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <Td className="whitespace-normal">
                      {item.product?.name ?? `Produk #${item.product_id}`}
                    </Td>
                    <Td className="text-right tabular-nums">{item.qty}</Td>
                    <Td className="text-right tabular-nums">{formatIDR(item.unit_price)}</Td>
                    <Td className="text-right font-medium tabular-nums text-gray-900">
                      {formatIDR(item.unit_price * item.qty)}
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </Table>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Pembayaran</h2>
            {order.payment ? (
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-gray-500">Metode</dt>
                  <dd className="font-medium capitalize text-gray-900">{order.payment.method}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Jumlah</dt>
                  <dd className="font-medium tabular-nums text-gray-900">
                    {formatIDR(order.payment.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <Badge status={order.payment.status}>{order.payment.status}</Badge>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-gray-600">
                Belum ada data pembayaran. Status:{' '}
                <Badge status={order.payment_status}>{order.payment_status}</Badge>
              </p>
            )}
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-base font-semibold text-gray-900">Total pesanan</span>
              <span className="text-xl font-bold tabular-nums text-primary-700">
                {formatIDR(order.total_amount)}
              </span>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
