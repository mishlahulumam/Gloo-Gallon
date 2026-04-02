import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authService } from '../../services/auth'
import useAuthStore from '../../store/authStore'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import toast from 'react-hot-toast'
import { User, Lock } from 'lucide-react'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    setName(user?.name ?? '')
    setPhone(user?.phone ?? '')
  }, [user?.name, user?.phone])

  const profileMutation = useMutation({
    mutationFn: (payload) => authService.updateProfile(payload),
    onSuccess: async () => {
      toast.success('Profil berhasil diperbarui')
      await fetchProfile()
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal memperbarui profil'
      toast.error(typeof msg === 'string' ? msg : 'Gagal memperbarui profil')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: (payload) => authService.changePassword(payload),
    onSuccess: () => {
      toast.success('Password berhasil diubah')
      setOldPassword('')
      setNewPassword('')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Gagal mengubah password'
      toast.error(typeof msg === 'string' ? msg : 'Gagal mengubah password')
    },
  })

  const handleProfile = (e) => {
    e.preventDefault()
    profileMutation.mutate({ name: name.trim(), phone: phone.trim() })
  }

  const handlePassword = (e) => {
    e.preventDefault()
    if (!oldPassword || !newPassword) {
      toast.error('Isi password lama dan baru')
      return
    }
    passwordMutation.mutate({ old_password: oldPassword, new_password: newPassword })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pb-8 pt-2 sm:px-6">
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
          <User className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Profil</h1>
          <p className="text-sm text-gray-600">Data akun dan keamanan.</p>
        </div>
      </header>

      <Card className="p-4 sm:p-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-primary-600" aria-hidden />
          Edit Profil
        </CardTitle>
        <form onSubmit={handleProfile} className="space-y-4">
          <Input label="Nama" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Telepon"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button type="submit" loading={profileMutation.isPending} className="w-full sm:w-auto">
            Simpan profil
          </Button>
        </form>
      </Card>

      <Card className="p-4 sm:p-6">
        <CardTitle className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary-600" aria-hidden />
          Ganti Password
        </CardTitle>
        <form onSubmit={handlePassword} className="space-y-4">
          <Input
            label="Password lama"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            label="Password baru"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Button type="submit" loading={passwordMutation.isPending} className="w-full sm:w-auto">
            Ubah password
          </Button>
        </form>
      </Card>
    </div>
  )
}
