import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderService } from '../../services/orders'
import Card, { CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { Eye } from 'lucide-react'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'delivering', label: 'Delivering' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ORDER_STATUS_OPTIONS = STATUS_FILTER_OPTIONS.filter((o) => o.value !== '')

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

export default function OrdersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [detailId, setDetailId] = useState(null)
  const [statusDraft, setStatusDraft] = useState('')

  const { data: listBody, isLoading } = useQuery({
    queryKey: ['admin-orders', page, statusFilter],
    queryFn: () =>
      orderService
        .getAll({ page, limit: 10, status: statusFilter || undefined })
        .then((r) => r.data),
  })

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-order', detailId],
    queryFn: () => orderService.getById(detailId).then((r) => r.data.data ?? r.data),
    enabled: Boolean(detailId),
  })

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  useEffect(() => {
    if (orderDetail?.status) {
      setStatusDraft(orderDetail.status)
    }
  }, [orderDetail?.id, orderDetail?.status])

  const { data: orders, total_pages: totalPages, page: responsePage } = normalizePaginated(listBody)

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => orderService.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin-order', detailId] })
      toast.success('Status pesanan diperbarui')
    },
    onError: () => {
      toast.error('Gagal memperbarui status')
    },
  })

  const openDetail = (id) => setDetailId(id)
  const closeDetail = () => {
    setDetailId(null)
    setStatusDraft('')
  }

  const handleUpdateStatus = () => {
    if (!detailId || !statusDraft) return
    updateStatusMutation.mutate({ id: detailId, status: statusDraft })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kelola pesanan</CardTitle>
        </CardHeader>
        <div className="mb-4 max-w-xs">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
        {isLoading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <EmptyState message="Belum ada pesanan" />
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Pelanggan</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th>Pembayaran</Th>
                  <Th>Tanggal</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </Thead>
              <Tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <Td className="font-medium text-gray-900">#{order.id}</Td>
                    <Td>{order.customer?.name ?? '—'}</Td>
                    <Td>{formatIDR(order.total_amount)}</Td>
                    <Td>
                      <Badge status={order.status}>{order.status}</Badge>
                    </Td>
                    <Td>
                      <Badge status={order.payment_status}>{order.payment_status}</Badge>
                    </Td>
                    <Td>{formatDate(order.created_at)}</Td>
                    <Td className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Lihat pesanan ${order.id}`}
                        onClick={() => openDetail(order.id)}
                      >
                        <Eye size={18} />
                      </Button>
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </Table>
            <Pagination
              page={responsePage ?? page}
              totalPages={totalPages || 1}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        isOpen={Boolean(detailId)}
        onClose={closeDetail}
        title={detailId ? `Pesanan #${detailId}` : 'Detail pesanan'}
        className="max-w-2xl"
      >
        {detailLoading || !orderDetail ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Pelanggan</dt>
                <dd className="font-medium text-gray-900">{orderDetail.customer?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Total</dt>
                <dd className="font-medium text-gray-900">{formatIDR(orderDetail.total_amount)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <Badge status={orderDetail.status}>{orderDetail.status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Pembayaran</dt>
                <dd>
                  <Badge status={orderDetail.payment_status}>{orderDetail.payment_status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Tanggal</dt>
                <dd className="font-medium text-gray-900">{formatDate(orderDetail.created_at)}</dd>
              </div>
              {orderDetail.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Catatan</dt>
                  <dd className="text-gray-800">{orderDetail.notes}</dd>
                </div>
              ) : null}
            </dl>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Item</h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                        Produk
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                        Qty
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                        Harga
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(orderDetail.items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-gray-800">
                          {item.product?.name ?? `Produk #${item.product_id}`}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{item.qty}</td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {formatIDR(item.unit_price)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {formatIDR(item.unit_price * item.qty)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <Select
                label="Ubah status"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                options={ORDER_STATUS_OPTIONS}
              />
              <Button
                type="button"
                className="mt-3"
                loading={updateStatusMutation.isPending}
                disabled={
                  updateStatusMutation.isPending || statusDraft === orderDetail.status
                }
                onClick={handleUpdateStatus}
              >
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
