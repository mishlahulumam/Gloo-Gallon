import { Inbox } from 'lucide-react'

export default function EmptyState({ message = 'Tidak ada data', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Icon size={48} strokeWidth={1.5} />
      <p className="mt-3 text-sm">{message}</p>
    </div>
  )
}
