import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentService } from '../../services/payments'
import Card, { CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import { CreditCard, Check } from 'lucide-react'

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

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('id-ID') : '-')

export default function PaymentsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data: listBody, isLoading } = useQuery({
    queryKey: ['admin-payments', page],
    queryFn: () => paymentService.getHistory({ page, limit: 10 }).then((r) => r.data),
  })

  const { data: payments, total_pages: totalPages, page: responsePage } = normalizePaginated(listBody)

  const confirmMutation = useMutation({
    mutationFn: (id) => paymentService.confirmManual(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
      toast.success('Pembayaran dikonfirmasi')
    },
    onError: () => {
      toast.error('Gagal mengonfirmasi pembayaran')
    },
  })

  const showConfirm = (payment) =>
    payment.status === 'pending' && (payment.method === 'cash' || payment.method === 'transfer')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-600" aria-hidden />
            <CardTitle>Kelola pembayaran</CardTitle>
          </div>
        </CardHeader>
        {isLoading ? (
          <Spinner />
        ) : payments.length === 0 ? (
          <EmptyState message="Belum ada pembayaran" />
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>ID Pembayaran</Th>
                  <Th>ID Pesanan</Th>
                  <Th>Pelanggan</Th>
                  <Th>Metode</Th>
                  <Th>Jumlah</Th>
                  <Th>Status</Th>
                  <Th>Dibayar</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </Thead>
              <Tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <Td className="font-medium text-gray-900">#{payment.id}</Td>
                    <Td>#{payment.order?.id ?? payment.order_id ?? '—'}</Td>
                    <Td>{payment.order?.customer?.name ?? '—'}</Td>
                    <Td className="capitalize">{payment.method ?? '—'}</Td>
                    <Td>{formatIDR(payment.amount)}</Td>
                    <Td>
                      <Badge status={payment.status}>{payment.status}</Badge>
                    </Td>
                    <Td>{formatDate(payment.paid_at)}</Td>
                    <Td className="text-right">
                      {showConfirm(payment) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          loading={confirmMutation.isPending && confirmMutation.variables === payment.id}
                          disabled={confirmMutation.isPending}
                          onClick={() => confirmMutation.mutate(payment.id)}
                        >
                          <Check size={16} aria-hidden />
                          Konfirmasi
                        </Button>
                      ) : (
                        '—'
                      )}
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
    </div>
  )
}
