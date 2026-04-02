import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deliveryService } from '../../services/deliveries'
import { driverService } from '../../services/drivers'
import { orderService } from '../../services/orders'
import Card, { CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { MapPin, Truck } from 'lucide-react'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'picked_up', label: 'Picked up' },
  { value: 'on_the_way', label: 'On the way' },
  { value: 'delivered', label: 'Delivered' },
]

const DELIVERY_STATUS_OPTIONS = STATUS_FILTER_OPTIONS.filter((o) => o.value !== '')

function normalizeDeliveries(body) {
  if (!body) return []
  const raw = body.data
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray(raw.data)) return raw.data
  return []
}

function normalizeOrderRows(body) {
  if (!body) return []
  const inner = body.data
  if (Array.isArray(inner)) return inner
  if (inner && typeof inner === 'object' && Array.isArray(inner.data)) return inner.data
  return []
}

function normalizeDriverRows(body) {
  if (!body) return []
  const raw = body.data
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray(raw.data)) return raw.data
  return []
}

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

export default function DeliveriesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [statusModalDelivery, setStatusModalDelivery] = useState(null)
  const [statusDraft, setStatusDraft] = useState('')

  const { data: listBody, isLoading } = useQuery({
    queryKey: ['admin-deliveries', statusFilter],
    queryFn: () =>
      deliveryService.getAll({ status: statusFilter || undefined }).then((r) => r.data),
  })

  const deliveries = normalizeDeliveries(listBody)

  const { data: ordersForAssign = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-deliveries-assign-orders'],
    queryFn: async () => {
      const [c, p] = await Promise.all([
        orderService.getAll({ status: 'confirmed', limit: 100 }).then((r) => r.data),
        orderService.getAll({ status: 'processing', limit: 100 }).then((r) => r.data),
      ])
      const a = normalizeOrderRows(c)
      const b = normalizeOrderRows(p)
      const map = new Map()
      for (const o of [...a, ...b]) {
        if (o?.id != null) map.set(o.id, o)
      }
      return Array.from(map.values())
    },
    enabled: assignOpen,
  })

  const { data: driversForAssign = [], isLoading: driversLoading } = useQuery({
    queryKey: ['admin-deliveries-assign-drivers'],
    queryFn: () => driverService.getAll({ limit: 100 }).then((r) => normalizeDriverRows(r.data)),
    enabled: assignOpen,
  })

  const openAssign = () => {
    setOrderId('')
    setDriverId('')
    setAssignOpen(true)
  }

  const closeAssign = () => {
    setAssignOpen(false)
    setOrderId('')
    setDriverId('')
  }

  const assignMutation = useMutation({
    mutationFn: (payload) => deliveryService.assign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] })
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries-assign-orders'] })
      toast.success('Pengiriman ditetapkan')
      closeAssign()
    },
    onError: (err) => {
      const msg = err?.response?.data?.error
      toast.error(typeof msg === 'string' ? msg : 'Gagal menetapkan pengiriman')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => deliveryService.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deliveries'] })
      toast.success('Status pengiriman diperbarui')
      closeStatusModal()
    },
    onError: () => toast.error('Gagal memperbarui status'),
  })

  const closeStatusModal = () => {
    setStatusModalDelivery(null)
    setStatusDraft('')
  }

  const openStatusModal = (d) => {
    setStatusModalDelivery(d)
    setStatusDraft(d.status ?? '')
  }

  const handleAssignSubmit = (e) => {
    e.preventDefault()
    const oid = Number(orderId)
    const did = Number(driverId)
    if (!oid || !did) {
      toast.error('Pilih pesanan dan kurir')
      return
    }
    assignMutation.mutate({ order_id: oid, driver_id: did })
  }

  const handleStatusSubmit = (e) => {
    e.preventDefault()
    if (!statusModalDelivery?.id || !statusDraft) return
    updateStatusMutation.mutate({ id: statusModalDelivery.id, status: statusDraft })
  }

  const orderOptions = [
    { value: '', label: ordersLoading ? 'Memuat…' : 'Pilih pesanan' },
    ...ordersForAssign.map((o) => ({
      value: String(o.id),
      label: `#${o.id} — ${o.customer?.name ?? 'Pelanggan'}`,
    })),
  ]

  const driverOptions = [
    { value: '', label: driversLoading ? 'Memuat…' : 'Pilih kurir' },
    ...driversForAssign.map((d) => ({
      value: String(d.id),
      label: `${d.name ?? d.id}${d.phone ? ` (${d.phone})` : ''}`,
    })),
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="text-primary-600" size={22} aria-hidden />
              <CardTitle>Pengiriman</CardTitle>
            </div>
            <Button type="button" onClick={openAssign}>
              <Truck size={18} aria-hidden />
              Assign Pengiriman
            </Button>
          </div>
        </CardHeader>

        <div className="mb-4 max-w-xs">
          <Select
            label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : deliveries.length === 0 ? (
          <EmptyState message="Belum ada pengiriman" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Order ID</Th>
                <Th>Pelanggan</Th>
                <Th>Kurir</Th>
                <Th>Status</Th>
                <Th>Dijadwalkan</Th>
                <Th>Selesai</Th>
                <Th className="text-right">Aksi</Th>
              </tr>
            </Thead>
            <Tbody>
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <Td className="font-medium text-gray-900">#{d.order?.id ?? d.order_id ?? '—'}</Td>
                  <Td>{d.order?.customer?.name ?? '—'}</Td>
                  <Td>{d.driver?.name ?? '—'}</Td>
                  <Td>
                    <Badge status={d.status}>{String(d.status).replace(/_/g, ' ')}</Badge>
                  </Td>
                  <Td>{formatDate(d.scheduled_at)}</Td>
                  <Td>{formatDate(d.delivered_at)}</Td>
                  <Td className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openStatusModal(d)}
                    >
                      Update status
                    </Button>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={assignOpen}
        onClose={closeAssign}
        title="Assign pengiriman"
        className="max-w-md"
      >
        {ordersLoading || driversLoading ? (
          <Spinner />
        ) : (
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <Select
              label="Pesanan"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={orderOptions}
            />
            <Select
              label="Kurir"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              options={driverOptions}
            />
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Button type="button" variant="secondary" onClick={closeAssign}>
                Batal
              </Button>
              <Button type="submit" loading={assignMutation.isPending}>
                Simpan
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(statusModalDelivery)}
        onClose={closeStatusModal}
        title={
          statusModalDelivery
            ? `Status — Order #${statusModalDelivery.order?.id ?? statusModalDelivery.order_id}`
            : 'Update status'
        }
        className="max-w-sm"
      >
        {statusModalDelivery ? (
          <form onSubmit={handleStatusSubmit} className="space-y-4">
            <Select
              label="Status"
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value)}
              options={DELIVERY_STATUS_OPTIONS}
            />
            <Button
              type="submit"
              className="w-full"
              loading={updateStatusMutation.isPending}
              disabled={!statusDraft || statusDraft === statusModalDelivery.status}
            >
              Simpan
            </Button>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
