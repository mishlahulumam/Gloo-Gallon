import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stockService } from '../../services/stock'
import Card, { CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { Package, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react'

const STOCK_TYPE_OPTIONS = [
  { value: 'in', label: 'Stok Masuk' },
  { value: 'out', label: 'Stok Keluar' },
  { value: 'damaged', label: 'Rusak' },
  { value: 'returned', label: 'Dikembalikan' },
]

const emptyUpdateForm = () => ({
  type: 'in',
  qty: '',
  notes: '',
})

export default function StockPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)
  const [form, setForm] = useState(emptyUpdateForm)

  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ['admin-stock'],
    queryFn: () =>
      stockService.getAll().then((r) => {
        const raw = r.data.data ?? r.data
        return Array.isArray(raw) ? raw : []
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ productId, payload }) => stockService.update(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stock'] })
      toast.success('Stok diperbarui')
      closeModal()
    },
    onError: () => {
      toast.error('Gagal memperbarui stok')
    },
  })

  const closeModal = () => {
    setModalOpen(false)
    setSelectedStock(null)
    setForm(emptyUpdateForm())
  }

  const openUpdateModal = (row) => {
    setSelectedStock(row)
    setForm(emptyUpdateForm())
    setModalOpen(true)
  }

  const productId =
    selectedStock?.product_id ?? selectedStock?.product?.id ?? null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!productId) {
      toast.error('Produk tidak valid')
      return
    }
    const qty = Number(form.qty)
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Jumlah harus lebih dari 0')
      return
    }
    updateMutation.mutate({
      productId,
      payload: {
        type: form.type,
        qty,
        notes: form.notes.trim() || undefined,
      },
    })
  }

  const productName = (row) => row.product?.name ?? '—'
  const brand = (row) => row.product?.brand ?? '—'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="text-primary-600" size={22} aria-hidden />
            <CardTitle>Kelola stok</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ArrowUp size={14} aria-hidden />
            <span>Masuk</span>
            <ArrowDown size={14} className="ml-2" aria-hidden />
            <span>Keluar / rusak / dikembalikan</span>
          </div>
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : stockItems.length === 0 ? (
          <EmptyState message="Belum ada data stok" />
        ) : (
          <Table>
            <Thead>
              <tr>
                <Th>Product Name</Th>
                <Th>Brand</Th>
                <Th>Full Qty</Th>
                <Th>Empty Qty</Th>
                <Th>Borrowed Qty</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {stockItems.map((row) => {
                const fullQty = row.full_qty ?? 0
                const low = fullQty < 10
                return (
                  <tr
                    key={row.id ?? row.product_id ?? productName(row)}
                    className={low ? 'bg-yellow-50' : undefined}
                  >
                    <Td className="font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {low ? (
                          <AlertTriangle
                            className="shrink-0 text-amber-600"
                            size={18}
                            aria-label="Stok rendah"
                          />
                        ) : null}
                        {productName(row)}
                      </div>
                    </Td>
                    <Td>{brand(row)}</Td>
                    <Td>{fullQty}</Td>
                    <Td>{row.empty_qty ?? 0}</Td>
                    <Td>{row.borrowed_qty ?? 0}</Td>
                    <Td className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => openUpdateModal(row)}
                      >
                        Update Stok
                      </Button>
                    </Td>
                  </tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          selectedStock
            ? `Update stok — ${productName(selectedStock)}`
            : 'Update stok'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Tipe"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={STOCK_TYPE_OPTIONS}
          />
          <Input
            label="Jumlah"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={form.qty}
            onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
            required
          />
          <Input
            label="Catatan"
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
