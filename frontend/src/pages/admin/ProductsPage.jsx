import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '../../services/products'
import Card, { CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

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

const emptyForm = () => ({
  name: '',
  brand: '',
  price: '',
  deposit_price: '',
})

export default function ProductsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const { data: listBody, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => productService.getAll({ page, limit: 10 }).then((r) => r.data),
  })

  const { data: products, total_pages: totalPages, page: responsePage } = normalizePaginated(listBody)

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name ?? '',
      brand: product.brand ?? '',
      price: String(product.price ?? ''),
      deposit_price: String(product.deposit_price ?? ''),
    })
    setModalOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (payload) => productService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Produk ditambahkan')
      closeModal()
    },
    onError: () => {
      toast.error('Gagal menambah produk')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Produk diperbarui')
      closeModal()
    },
    onError: () => {
      toast.error('Gagal memperbarui produk')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => productService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Produk dihapus')
    },
    onError: () => {
      toast.error('Gagal menghapus produk')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const price = parseFloat(form.price)
    const depositPrice = parseFloat(form.deposit_price) || 0
    if (!form.name.trim() || Number.isNaN(price) || price <= 0) {
      toast.error('Nama dan harga wajib diisi (harga harus lebih dari 0)')
      return
    }
    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      price,
      deposit_price: depositPrice,
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (product) => {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return
    deleteMutation.mutate(product.id)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Kelola produk</CardTitle>
          <Button type="button" onClick={openCreate}>
            <Plus size={18} />
            Tambah Produk
          </Button>
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : products.length === 0 ? (
          <EmptyState message="Belum ada produk" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <Thead>
                  <tr>
                    <Th>Nama</Th>
                    <Th>Merek</Th>
                    <Th>Harga</Th>
                    <Th>Harga deposit</Th>
                    <Th>Stok (penuh / kosong)</Th>
                    <Th>Aktif</Th>
                    <Th className="text-right">Aksi</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <Td className="font-medium text-gray-900">{product.name}</Td>
                      <Td>{product.brand || '—'}</Td>
                      <Td>{formatIDR(product.price)}</Td>
                      <Td>{formatIDR(product.deposit_price)}</Td>
                      <Td className="whitespace-nowrap text-gray-700">
                        {product.stock?.full_qty ?? 0} / {product.stock?.empty_qty ?? 0}
                      </Td>
                      <Td>
                        <span
                          className={
                            product.is_active
                              ? 'inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
                              : 'inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700'
                          }
                        >
                          {product.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => openEdit(product)}
                          >
                            <Pencil size={18} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            aria-label={`Hapus ${product.name}`}
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
            </div>
            <Pagination
              page={responsePage ?? page}
              totalPages={totalPages || 1}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit produk' : 'Tambah produk'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Merek"
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
          />
          <Input
            label="Harga (Rp)"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
          />
          <Input
            label="Harga deposit (Rp)"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={form.deposit_price}
            onChange={(e) => setForm((f) => ({ ...f, deposit_price: e.target.value }))}
          />
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              {editingId ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
