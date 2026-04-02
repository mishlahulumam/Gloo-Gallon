import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { addressService } from '../../services/addresses'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react'
import { cn } from '../../utils/cn'

const textareaClass =
  'w-full min-h-[88px] resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

export default function AddressesPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [label, setLabel] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () =>
      addressService.getMyAddresses().then((r) => {
        const d = r.data.data ?? r.data
        return Array.isArray(d) ? d : []
      }),
  })

  const resetForm = () => {
    setEditingId(null)
    setLabel('')
    setFullAddress('')
    setLat('')
    setLng('')
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (addr) => {
    setEditingId(addr.id)
    setLabel(addr.label ?? '')
    setFullAddress(addr.full_address ?? '')
    setLat(addr.lat != null ? String(addr.lat) : '')
    setLng(addr.lng != null ? String(addr.lng) : '')
    setModalOpen(true)
  }

  const parseOptionalFloat = (s) => {
    const t = String(s).trim()
    if (t === '') return undefined
    const n = Number(t)
    return Number.isFinite(n) ? n : undefined
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? addressService.update(id, payload) : addressService.create(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      toast.success(variables.id ? 'Alamat diperbarui' : 'Alamat ditambahkan')
      closeModal()
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal menyimpan alamat'
      toast.error(typeof msg === 'string' ? msg : 'Gagal menyimpan alamat')
    },
  })

  const closeModal = () => {
    if (saveMutation.isPending) return
    setModalOpen(false)
    resetForm()
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => addressService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      toast.success('Alamat dihapus')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal menghapus alamat'
      toast.error(typeof msg === 'string' ? msg : 'Gagal menghapus alamat')
    },
  })

  const setDefaultMutation = useMutation({
    mutationFn: (id) => addressService.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-addresses'] })
      toast.success('Alamat utama diperbarui')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal mengatur alamat utama'
      toast.error(typeof msg === 'string' ? msg : 'Gagal mengatur alamat utama')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      label: label.trim(),
      full_address: fullAddress.trim(),
    }
    const latN = parseOptionalFloat(lat)
    const lngN = parseOptionalFloat(lng)
    if (latN !== undefined) payload.lat = latN
    if (lngN !== undefined) payload.lng = lngN
    if (!payload.label || !payload.full_address) {
      toast.error('Label dan alamat lengkap wajib diisi')
      return
    }
    saveMutation.mutate({ id: editingId, payload })
  }

  const handleDelete = (addr) => {
    if (!window.confirm(`Hapus alamat "${addr.label}"?`)) return
    deleteMutation.mutate(addr.id)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-8 pt-2 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <MapPin className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Alamat saya</h1>
            <p className="text-sm text-gray-600">Kelola lokasi pengiriman.</p>
          </div>
        </div>
        <Button type="button" className="w-full sm:w-auto" onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden />
          Tambah Alamat
        </Button>
      </header>

      {isLoading ? (
        <Spinner />
      ) : addresses.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada alamat" icon={MapPin} />
        </Card>
      ) : (
        <ul className="space-y-4">
          {addresses.map((addr) => (
            <li key={addr.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{addr.label}</p>
                      {addr.is_default ? <Badge status="active">Utama</Badge> : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                      {addr.full_address}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    {!addr.is_default ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        loading={
                          setDefaultMutation.isPending && setDefaultMutation.variables === addr.id
                        }
                        disabled={setDefaultMutation.isPending}
                        onClick={() => setDefaultMutation.mutate(addr.id)}
                      >
                        <Star className="h-4 w-4" aria-hidden />
                        Set Default
                      </Button>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openEdit(addr)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        loading={deleteMutation.isPending && deleteMutation.variables === addr.id}
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDelete(addr)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit alamat' : 'Tambah alamat'}
        className="max-h-[90vh] overflow-y-auto"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Rumah, Kantor, …"
            required
          />
          <div className="w-full">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Alamat lengkap
            </label>
            <textarea
              className={cn(textareaClass)}
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="Jalan, RT/RW, kelurahan, …"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Gunakan area teks ini untuk alamat multi-baris (bukan field Input satu baris).
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Latitude (opsional)"
              type="text"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="-6.2…"
            />
            <Input
              label="Longitude (opsional)"
              type="text"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="106.8…"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={saveMutation.isPending}>
              Batal
            </Button>
            <Button type="submit" loading={saveMutation.isPending}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
