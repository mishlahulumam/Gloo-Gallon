import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Droplets } from 'lucide-react'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import useAuthStore from '../../store/authStore'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [errors, setErrors] = useState({})
  const { register, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const errs = {}
    if (!form.name || form.name.length < 2) errs.name = 'Nama minimal 2 karakter'
    if (!form.email) errs.email = 'Email wajib diisi'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Format email tidak valid'
    if (!form.password) errs.password = 'Password wajib diisi'
    else if (form.password.length < 6) errs.password = 'Password minimal 6 karakter'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    try {
      await register(form)
      toast.success('Registrasi berhasil!')
      navigate('/customer')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registrasi gagal')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <Droplets className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gloo-Gallon</h1>
          <p className="mt-1 text-sm text-gray-500">Buat akun baru</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Nama Lengkap"
              placeholder="Nama Anda"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@contoh.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              error={errors.email}
            />
            <Input
              label="No. Telepon"
              type="tel"
              placeholder="08xxxxxxxxxx"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              error={errors.password}
            />
            <Button type="submit" className="w-full" loading={isLoading}>
              Daftar
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
