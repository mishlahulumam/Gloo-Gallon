import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { customerService } from '../../services/customers'
import Card, { CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import Spinner from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { Eye, Users } from 'lucide-react'

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

const formatJoined = (date) =>
  date
    ? new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—'

function normalizeDetail(payload) {
  if (!payload) return null
  return payload.data?.data ?? payload.data ?? payload
}

function normalizeLoans(payload) {
  if (payload == null) return []
  const raw = payload.data?.data ?? payload.data ?? payload
  return Array.isArray(raw) ? raw : []
}

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [viewId, setViewId] = useState(null)

  const { data: listBody, isLoading } = useQuery({
    queryKey: ['admin-customers', page],
    queryFn: () => customerService.getAll({ page, limit: 10 }).then((r) => r.data),
  })

  const { data: customers, total_pages: totalPages, page: responsePage } =
    normalizePaginated(listBody)

  const { data: detailPayload, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-customer', viewId],
    queryFn: () => customerService.getById(viewId).then((r) => r.data),
    enabled: Boolean(viewId),
  })

  const { data: loansPayload, isLoading: loansLoading } = useQuery({
    queryKey: ['admin-customer-gallon-loans', viewId],
    queryFn: () => customerService.getGallonLoans(viewId).then((r) => r.data),
    enabled: Boolean(viewId),
  })

  const customer = normalizeDetail(detailPayload)
  const loans = normalizeLoans(loansPayload)

  const recentOrdersCount = (c) => {
    if (!c) return 0
    if (typeof c.recent_orders_count === 'number') return c.recent_orders_count
    if (typeof c.orders_count === 'number') return c.orders_count
    if (Array.isArray(c.recent_orders)) return c.recent_orders.length
    if (Array.isArray(c.orders)) return c.orders.length
    return 0
  }

  const loanRow = (loan) => {
    const loaned = Number(loan.loaned ?? loan.loaned_qty ?? 0)
    const returned = Number(loan.returned ?? loan.returned_qty ?? 0)
    const productLabel =
      loan.product?.name ?? loan.product_name ?? `Produk #${loan.product_id ?? '—'}`
    return { productLabel, loaned, returned, outstanding: loaned - returned }
  }

  const closeModal = () => setViewId(null)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="text-primary-600" size={22} aria-hidden />
            <CardTitle>Pelanggan</CardTitle>
          </div>
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : customers.length === 0 ? (
          <EmptyState message="Belum ada pelanggan" />
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Joined Date</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-medium text-gray-900">{c.name ?? '—'}</Td>
                    <Td>{c.email ?? '—'}</Td>
                    <Td>{c.phone ?? '—'}</Td>
                    <Td>{formatJoined(c.created_at)}</Td>
                    <Td className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Lihat ${c.name ?? c.id}`}
                        onClick={() => {
                          if (!c.id) {
                            toast.error('ID pelanggan tidak valid')
                            return
                          }
                          setViewId(c.id)
                        }}
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
        isOpen={Boolean(viewId)}
        onClose={closeModal}
        title={customer?.name ? `Pelanggan — ${customer.name}` : 'Detail pelanggan'}
        className="max-w-2xl"
      >
        {detailLoading || !customer ? (
          <Spinner />
        ) : (
          <div className="space-y-6">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Nama</dt>
                <dd className="font-medium text-gray-900">{customer.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-800">{customer.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Telepon</dt>
                <dd className="text-gray-800">{customer.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Bergabung</dt>
                <dd className="text-gray-800">{formatJoined(customer.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Pesanan terbaru (jumlah)</dt>
                <dd className="font-medium text-gray-900">{recentOrdersCount(customer)}</dd>
              </div>
              {customer.is_active != null ? (
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd>
                    <Badge status={customer.is_active ? 'active' : 'inactive'}>
                      {customer.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </dd>
                </div>
              ) : null}
            </dl>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">Alamat</h4>
              {(customer.addresses ?? []).length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada alamat</p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-800">
                  {(customer.addresses ?? []).map((addr) => (
                    <li
                      key={addr.id ?? `${addr.label}-${addr.full_address}`}
                      className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <span className="font-medium text-gray-900">
                        {addr.label ?? 'Alamat'}
                      </span>
                      {addr.is_default ? (
                        <Badge className="ml-2" status="active">
                          Utama
                        </Badge>
                      ) : null}
                      <p className="mt-1 text-gray-700">
                        {addr.full_address ?? addr.address ?? '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-900">
                Pinjaman galon
              </h4>
              {loansLoading ? (
                <Spinner />
              ) : loans.length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada pinjaman galon</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                          Product
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Loaned
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Returned
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                          Outstanding
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {loans.map((loan, idx) => {
                        const row = loanRow(loan)
                        return (
                          <tr key={loan.id ?? `${row.productLabel}-${idx}`}>
                            <td className="px-3 py-2 text-gray-800">{row.productLabel}</td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {row.loaned}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {row.returned}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {row.outstanding}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
