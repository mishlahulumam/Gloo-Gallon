import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionService } from '../../services/subscriptions'
import { productService } from '../../services/products'
import { addressService } from '../../services/addresses'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { RefreshCw, Plus, XCircle } from 'lucide-react'

function normalizeProducts(body) {
  if (!body) return []
  const inner = body.data?.data ?? body.data ?? body
  if (Array.isArray(inner)) return inner
  if (inner && typeof inner === 'object' && Array.isArray(inner.data)) return inner.data
  return []
}

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('id-ID') : '—')

export default function SubscriptionsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [productId, setProductId] = useState('')
  const [addressId, setAddressId] = useState('')
  const [qty, setQty] = useState(1)
  const [intervalDays, setIntervalDays] = useState(7)

  const { data: subscriptions = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: () =>
      subscriptionService.getMy().then((r) => {
        const d = r.data.data ?? r.data
        return Array.isArray(d) ? d : []
      }),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'subscriptions-modal'],
    queryFn: () => productService.getAll({ limit: 100 }).then((r) => normalizeProducts(r.data)),
    enabled: modalOpen,
  })

  const { data: addresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () =>
      addressService.getMyAddresses().then((r) => {
        const d = r.data.data ?? r.data
        return Array.isArray(d) ? d : []
      }),
    enabled: modalOpen,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => subscriptionService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] })
      toast.success('Langganan berhasil ditambahkan')
      setModalOpen(false)
      setProductId('')
      setAddressId('')
      setQty(1)
      setIntervalDays(7)
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal membuat langganan'
      toast.error(typeof msg === 'string' ? msg : 'Gagal membuat langganan')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => subscriptionService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] })
      toast.success('Langganan dibatalkan')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal membatalkan langganan'
      toast.error(typeof msg === 'string' ? msg : 'Gagal membatalkan langganan')
    },
  })

  const openModal = () => {
    setProductId('')
    setAddressId('')
    setQty(1)
    setIntervalDays(7)
    setModalOpen(true)
  }

  const handleCreate = (e) => {
    e.preventDefault()
    const pid = Number(productId)
    const aid = Number(addressId)
    if (!pid || !aid || qty < 1 || intervalDays < 1) {
      toast.error('Lengkapi produk, alamat, qty, dan interval')
      return
    }
    createMutation.mutate({
      product_id: pid,
      address_id: aid,
      qty: Number(qty),
      interval_days: Number(intervalDays),
    })
  }

  const productOptions = [
    { value: '', label: 'Pilih produk' },
    ...products
      .filter((p) => p.is_active !== false)
      .map((p) => ({ value: String(p.id), label: p.name ?? `Produk #${p.id}` })),
  ]

  const addressOptions = [
    { value: '', label: 'Pilih alamat' },
    ...addresses.map((a) => ({
      value: String(a.id),
      label: `${a.label} — ${a.full_address?.slice(0, 40) ?? ''}${(a.full_address?.length ?? 0) > 40 ? '…' : ''}`,
    })),
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-8 pt-2 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Langganan</h1>
          <p className="text-sm text-gray-600">Atur pengiriman berkala galon Anda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden />
            Muat ulang
          </Button>
          <Button type="button" size="md" className="w-full sm:w-auto" onClick={openModal}>
            <Plus className="h-4 w-4" aria-hidden />
            Tambah Langganan
          </Button>
        </div>
      </header>

      {isLoading ? (
        <Spinner />
      ) : subscriptions.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada langganan" icon={RefreshCw} />
        </Card>
      ) : (
        <ul className="space-y-4">
          {subscriptions.map((sub) => (
            <li key={sub.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {sub.product?.name ?? `Produk #${sub.product_id}`}
                    </p>
                    <dl className="mt-2 space-y-1 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <span>
                          Qty: <span className="font-medium text-gray-800">{sub.qty}</span>
                        </span>
                        <span>
                          Setiap{' '}
                          <span className="font-medium text-gray-800">{sub.interval_days}</span> hari
                        </span>
                      </div>
                      <div>
                        Pesanan berikutnya:{' '}
                        <span className="font-medium text-gray-800">
                          {formatDate(sub.next_order_at)}
                        </span>
                      </div>
                    </dl>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge status={sub.is_active ? 'active' : 'inactive'}>
                      {sub.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    {sub.is_active ? (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        loading={cancelMutation.isPending && cancelMutation.variables === sub.id}
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(sub.id)}
                      >
                        <XCircle className="h-4 w-4" aria-hidden />
                        Batalkan
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !createMutation.isPending && setModalOpen(false)}
        title="Tambah langganan"
        className="max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Produk"
            options={productOptions}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          />
          <Select
            label="Alamat"
            options={addressOptions}
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            required
          />
          <Input
            label="Jumlah (qty)"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
          <Input
            label="Interval (hari)"
            type="number"
            min={1}
            value={intervalDays}
            onChange={(e) =>
              setIntervalDays(e.target.value === '' ? '' : Number(e.target.value))
            }
            required
          />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Batal
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
