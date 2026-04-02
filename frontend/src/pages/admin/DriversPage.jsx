import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { driverService } from '../../services/drivers'
import Card, { CardHeader, CardTitle } from '../../components/ui/Card'
import { Table, Thead, Tbody, Th, Td } from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Truck } from 'lucide-react'

function normalizeDriversList(body, page, limit) {
  const empty = { data: [], total_pages: 1, page: 1 }
  if (!body) return empty
  let rows = body.data
  if (rows && typeof rows === 'object' && Array.isArray(rows.data)) {
    return {
      data: rows.data,
      total_pages: rows.total_pages ?? body.total_pages ?? 1,
      page: rows.page ?? body.page ?? page,
    }
  }
  if (!Array.isArray(rows)) return empty
  if (body.total_pages != null) {
    return {
      data: rows,
      total_pages: body.total_pages,
      page: body.page ?? page,
    }
  }
  const total_pages = Math.max(1, Math.ceil(rows.length / limit))
  const start = (page - 1) * limit
  return {
    data: rows.slice(start, start + limit),
    total_pages,
    page,
  }
}

const emptyForm = { name: '', phone: '', area: '' }

export default function DriversPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const { data: listBody, isLoading } = useQuery({
    queryKey: ['admin-drivers', page],
    queryFn: () => driverService.getAll({ page, limit: 10 }).then((r) => r.data),
  })

  const { data: drivers, total_pages: totalPages, page: responsePage } =
    normalizeDriversList(listBody, page, 10)

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (d) => {
    setEditing(d)
    setForm({
      name: d.name ?? '',
      phone: d.phone ?? '',
      area: d.area ?? '',
    })
    setModalOpen(true)
  }

  const createMutation = useMutation({
    mutationFn: (payload) => driverService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      toast.success('Kurir ditambahkan')
      closeModal()
    },
    onError: () => toast.error('Gagal menambah kurir'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => driverService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      toast.success('Kurir diperbarui')
      closeModal()
    },
    onError: () => toast.error('Gagal memperbarui kurir'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => driverService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      toast.success('Kurir dihapus')
    },
    onError: () => toast.error('Gagal menghapus kurir'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nama dan telepon wajib diisi')
      return
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      area: form.area.trim(),
    }
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (d) => {
    if (!window.confirm(`Hapus kurir ${d.name ?? d.id}?`)) return
    deleteMutation.mutate(d.id)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Truck className="text-primary-600" size={22} aria-hidden />
              <CardTitle>Kurir</CardTitle>
            </div>
            <Button type="button" onClick={openCreate}>
              <Plus size={18} aria-hidden />
              Tambah Kurir
            </Button>
          </div>
        </CardHeader>

        {isLoading ? (
          <Spinner />
        ) : drivers.length === 0 ? (
          <EmptyState message="Belum ada kurir" />
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  <Th>Nama</Th>
                  <Th>Telepon</Th>
                  <Th>Area</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Aksi</Th>
                </tr>
              </Thead>
              <Tbody>
                {drivers.map((d) => (
                  <tr key={d.id}>
                    <Td className="font-medium text-gray-900">{d.name ?? '—'}</Td>
                    <Td>{d.phone ?? '—'}</Td>
                    <Td>{d.area || '—'}</Td>
                    <Td>
                      <Badge status={d.is_active ? 'active' : 'inactive'}>
                        {d.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${d.name ?? d.id}`}
                          onClick={() => openEdit(d)}
                        >
                          <Pencil size={18} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Hapus ${d.name ?? d.id}`}
                          onClick={() => handleDelete(d)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </Button>
                      </div>
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
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit kurir' : 'Tambah kurir'}
        className="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Telepon"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            required
          />
          <Input
            label="Area"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
          />
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button type="submit" loading={saving} disabled={saving}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
