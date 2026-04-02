import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { productService } from '../../services/products'
import { addressService } from '../../services/addresses'
import { orderService } from '../../services/orders'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Select from '../../components/ui/Select'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus, Minus, Droplets, MapPin } from 'lucide-react'

const formatIDR = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount ?? 0)

export default function HomePage() {
  const navigate = useNavigate()
  const [qtyById, setQtyById] = useState({})
  const [addressId, setAddressId] = useState('')

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () =>
      productService.getAll({ limit: 50 }).then((r) => {
        const d = r.data
        const raw = d.data || d
        return Array.isArray(raw) ? raw : raw?.data ?? []
      }),
  })

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () =>
      addressService.getMyAddresses().then((r) => {
        const d = r.data
        return d.data || d
      }),
  })

  const activeProducts = products.filter((p) => p.is_active !== false)

  useEffect(() => {
    if (!addresses.length) return
    setAddressId((prev) => {
      if (prev) return prev
      const def = addresses.find((a) => a.is_default) || addresses[0]
      return String(def.id)
    })
  }, [addresses])

  const setQty = (productId, next) => {
    const q = Math.max(0, next)
    setQtyById((prev) => {
      if (q === 0) {
        const { [productId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: q }
    })
  }

  const selectedLines = activeProducts
    .map((p) => {
      const qty = qtyById[p.id] ?? 0
      if (qty <= 0) return null
      const unit = Number(p.price) || 0
      return { product: p, qty, lineTotal: unit * qty }
    })
    .filter(Boolean)

  const cartTotal = selectedLines.reduce((sum, line) => sum + line.lineTotal, 0)

  const hasItems = selectedLines.length > 0
  const hasAddress = Boolean(addressId)

  const createMutation = useMutation({
    mutationFn: (payload) => orderService.create(payload),
    onSuccess: () => {
      toast.success('Pesanan berhasil dibuat')
      navigate('/customer/orders')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal membuat pesanan'
      toast.error(typeof msg === 'string' ? msg : 'Gagal membuat pesanan')
    },
  })

  const handleSubmit = () => {
    if (!hasItems || !hasAddress) return
    createMutation.mutate({
      address_id: Number(addressId),
      items: selectedLines.map(({ product, qty }) => ({
        product_id: product.id,
        qty,
      })),
      notes: '',
    })
  }

  const loading = productsLoading || addressesLoading

  const addressOptions = [
    { value: '', label: 'Pilih alamat pengiriman' },
    ...addresses.map((a) => ({
      value: String(a.id),
      label: [a.label, a.full_address].filter(Boolean).join(' — '),
    })),
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-28 pt-2 sm:px-6 sm:pb-24">
      <header className="rounded-2xl bg-gradient-to-br from-primary-600 via-primary-600 to-sky-600 px-5 py-6 text-white shadow-lg shadow-primary-600/25 sm:px-8 sm:py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Droplets className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pesan Galon</h1>
            <p className="mt-1 text-sm text-primary-100 sm:text-base">
              Pilih produk, tentukan jumlah, dan kirim ke alamat Anda.
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-gray-800">
          <MapPin className="h-5 w-5 text-primary-600" aria-hidden />
          <h2 className="text-lg font-semibold">Alamat pengiriman</h2>
        </div>

        {addressesLoading ? (
          <Card className="p-4">
            <p className="text-center text-sm text-gray-500">Memuat alamat…</p>
          </Card>
        ) : addresses.length === 0 ? (
          <Card className="border-dashed border-primary-200 bg-primary-50/40 p-5">
            <p className="text-sm text-gray-700">
              Anda belum menambahkan alamat. Tambahkan alamat dulu agar pesanan bisa dikirim.
            </p>
            <Link
              to="/customer/addresses"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 underline-offset-2 hover:underline"
            >
              <MapPin className="h-4 w-4" />
              Tambah alamat
            </Link>
          </Card>
        ) : (
          <Select
            label="Kirim ke"
            options={addressOptions}
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
          />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Produk</h2>

        {productsLoading ? (
          <Spinner />
        ) : activeProducts.length === 0 ? (
          <Card className="p-8 text-center text-gray-600">
            Belum ada produk tersedia.
          </Card>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {activeProducts.map((product) => {
              const qty = qtyById[product.id] ?? 0
              const selected = qty > 0
              return (
                <li key={product.id}>
                  <Card
                    className={`flex h-full flex-col p-4 transition-all duration-200 sm:p-5 ${
                      selected
                        ? 'border-2 border-primary-500 bg-primary-50/30 shadow-md ring-1 ring-primary-200'
                        : 'border border-gray-200'
                    }`}
                  >
                    <div className="flex flex-1 flex-col gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
                          {product.brand?.trim() || 'Galon'}
                        </p>
                        <h3 className="mt-0.5 text-base font-semibold leading-snug text-gray-900 sm:text-lg">
                          {product.name}
                        </h3>
                        <p className="mt-2 text-lg font-bold text-gray-900">
                          {formatIDR(product.price)}
                        </p>
                        <p className="mt-1 text-xs text-gray-600 sm:text-sm">
                          Deposit:{' '}
                          {Number(product.deposit_price) > 0
                            ? formatIDR(product.deposit_price)
                            : 'Tidak ada / sesuai ketentuan'}
                        </p>
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                        <span className="text-sm text-gray-600">Jumlah</span>
                        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            aria-label="Kurangi"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40"
                            disabled={qty <= 0}
                            onClick={() => setQty(product.id, qty - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-gray-900">
                            {qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Tambah"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-700 transition-colors hover:bg-primary-50 active:bg-primary-100"
                            onClick={() => setQty(product.id, qty + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="sticky bottom-0 z-10 -mx-4 border-t border-gray-200 bg-gray-50/95 px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md sm:-mx-6 sm:rounded-2xl sm:border sm:px-6">
        <Card className="border-0 bg-white/90 p-4 shadow-lg sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary-600" aria-hidden />
            <h2 className="text-lg font-semibold text-gray-900">Ringkasan pesanan</h2>
          </div>

          {!hasItems ? (
            <p className="text-sm text-gray-500">Belum ada item dipilih.</p>
          ) : (
            <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
              {selectedLines.map(({ product, qty, lineTotal }) => (
                <li
                  key={product.id}
                  className="flex justify-between gap-3 border-b border-gray-100 pb-2 last:border-0"
                >
                  <span className="text-gray-700">
                    <span className="font-medium text-gray-900">{product.name}</span>
                    <span className="text-gray-500"> × {qty}</span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-gray-900">
                    {formatIDR(lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="text-base font-semibold text-gray-800">Total</span>
            <span className="text-xl font-bold text-primary-700 tabular-nums">
              {formatIDR(cartTotal)}
            </span>
          </div>

          <Button
            type="button"
            size="lg"
            className="mt-4 w-full"
            loading={createMutation.isPending}
            disabled={!hasItems || !hasAddress || addresses.length === 0 || loading}
            onClick={handleSubmit}
          >
            <ShoppingCart className="h-5 w-5" />
            Pesan Sekarang
          </Button>
        </Card>
      </section>
    </div>
  )
}
