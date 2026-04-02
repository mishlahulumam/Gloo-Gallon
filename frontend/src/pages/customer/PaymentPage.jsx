import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { paymentService } from '../../services/payments'
import { orderService } from '../../services/orders'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import { CreditCard, Wallet, Building } from 'lucide-react'

const formatIDR = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0)

const METHOD_OPTIONS = [
  { value: 'midtrans', label: 'Midtrans (online)' },
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
]

export default function PaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [method, setMethod] = useState('midtrans')

  useEffect(() => {
    const loadSnap = async () => {
      const { data } = await paymentService.getMidtransConfig()
      const config = data.data || data
      const script = document.createElement('script')
      script.src = config.is_production
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
      script.setAttribute('data-client-key', config.client_key)
      document.head.appendChild(script)
    }
    loadSnap()
  }, [])

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => orderService.getOrderDetail(id).then((r) => r.data.data || r.data),
    enabled: Boolean(id),
  })

  useEffect(() => {
    if (!isError || !error) return
    const msg = error.response?.data?.error
    toast.error(typeof msg === 'string' ? msg : 'Gagal memuat pesanan')
  }, [isError, error])

  const payMutation = useMutation({
    mutationFn: (m) =>
      paymentService
        .initiate({ order_id: Number(id), method: m })
        .then((r) => r.data.data || r.data),
    onSuccess: (payload, m) => {
      if (m === 'midtrans') {
        const snapToken = payload?.snap_token
        if (!snapToken) {
          toast.error('Token pembayaran tidak tersedia')
          return
        }
        if (typeof window.snap === 'undefined' || !window.snap?.pay) {
          toast.error('Midtrans Snap belum siap. Tunggu sebentar lalu coba lagi.')
          return
        }
        window.snap.pay(snapToken, {
          onSuccess: () => {
            toast.success('Pembayaran berhasil')
            navigate('/customer/orders')
          },
          onPending: () => {
            toast('Pembayaran tertunda', { icon: '⏳' })
          },
          onError: () => {
            toast.error('Pembayaran gagal')
          },
          onClose: () => {},
        })
        return
      }
      if (m === 'cash' || m === 'transfer') {
        toast('Menunggu konfirmasi admin', { icon: 'ℹ️' })
        navigate('/customer/orders')
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal memulai pembayaran'
      toast.error(typeof msg === 'string' ? msg : 'Gagal memulai pembayaran')
    },
  })

  const handlePay = () => {
    if (!id) return
    payMutation.mutate(method)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-8 pt-2 sm:px-6">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Pembayaran</h1>

      {isLoading ? (
        <Spinner />
      ) : !order ? (
        <Card className="p-6 text-center text-gray-600">
          <p>Pesanan tidak ditemukan.</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => navigate('/customer/orders')}>
            Kembali ke pesanan
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">Ringkasan pesanan #{order.id}</h2>
            <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-700">
              {(order.items ?? []).map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span className="min-w-0 flex-1">
                    {item.product?.name ?? `Produk #${item.product_id}`}
                    <span className="text-gray-500"> × {item.qty}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-gray-900">
                    {formatIDR((item.unit_price ?? 0) * (item.qty ?? 0))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold tabular-nums text-primary-700">
                {formatIDR(order.total_amount)}
              </span>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Metode pembayaran</h2>
            <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <CreditCard className="h-4 w-4 text-primary-600" aria-hidden />
                Online
              </span>
              <span className="inline-flex items-center gap-1">
                <Wallet className="h-4 w-4 text-primary-600" aria-hidden />
                Tunai
              </span>
              <span className="inline-flex items-center gap-1">
                <Building className="h-4 w-4 text-primary-600" aria-hidden />
                Bank
              </span>
            </div>
            <Select
              label="Pilih metode"
              options={METHOD_OPTIONS}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
            <Button
              type="button"
              className="mt-6 w-full sm:w-auto"
              loading={payMutation.isPending}
              onClick={handlePay}
            >
              Bayar
            </Button>
          </Card>
        </>
      )}
    </div>
  )
}
