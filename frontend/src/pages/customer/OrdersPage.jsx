import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { orderService } from '../../services/orders'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { ShoppingCart, Eye, XCircle } from 'lucide-react'

function normalizePaginated(body) {
  if (!body) {
    return { data: [], total: 0, page: 1, limit: 10, total_pages: 1 }
  }
  const inner = body.data
  if (Array.isArray(inner)) {
    return body
  }
  if (inner && typeof inner === 'object' && Array.isArray(inner.data)) {
    return inner
  }
  return { data: [], total: 0, page: 1, limit: 10, total_pages: 1 }
}

const formatIDR = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0)

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('id-ID') : '—')

const payLinkClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto'

const detailLinkClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary-600 px-4 py-2 text-center text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto'

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data: listBody, isLoading } = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () =>
      orderService.getMyOrders({ page, limit: 10 }).then((r) => r.data),
  })

  const { data: orders, total_pages: totalPages, page: responsePage } = normalizePaginated(listBody)

  const cancelMutation = useMutation({
    mutationFn: (id) => orderService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
      toast.success('Pesanan dibatalkan')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal membatalkan pesanan'
      toast.error(typeof msg === 'string' ? msg : 'Gagal membatalkan pesanan')
    },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-8 pt-2 sm:px-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
          <ShoppingCart className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Pesanan saya</h1>
          <p className="text-sm text-gray-600">Riwayat dan status pesanan Anda.</p>
        </div>
      </header>

      {isLoading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada pesanan" icon={ShoppingCart} />
          <div className="flex justify-center">
            <Link
              to="/customer"
              className="text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
            >
              Pesan galon
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Pesanan #{order.id}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge status={order.status}>{order.status}</Badge>
                      <Badge status={order.payment_status}>{order.payment_status}</Badge>
                    </div>
                  </div>

                  <p className="mt-4 text-lg font-bold tabular-nums text-primary-700">
                    {formatIDR(order.total_amount)}
                  </p>

                  <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-sm text-gray-700">
                    {(order.items ?? []).map((item) => (
                      <li key={item.id} className="flex justify-between gap-2">
                        <span className="min-w-0 flex-1">
                          {item.product?.name ?? `Produk #${item.product_id}`}
                          <span className="text-gray-500"> × {item.qty}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link
                      to={`/customer/orders/${order.id}`}
                      className={detailLinkClass}
                    >
                      <Eye className="h-4 w-4" aria-hidden />
                      Lihat Detail
                    </Link>
                    {order.payment_status === 'pending' ? (
                      <Link to={`/customer/orders/${order.id}/pay`} className={payLinkClass}>
                        Bayar
                      </Link>
                    ) : null}
                    {order.status === 'pending' ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="md"
                        className="w-full sm:w-auto"
                        loading={cancelMutation.isPending && cancelMutation.variables === order.id}
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(order.id)}
                      >
                        <XCircle className="h-4 w-4" aria-hidden />
                        Batalkan
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
          <Pagination
            page={responsePage ?? page}
            totalPages={totalPages || 1}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
