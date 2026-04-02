import { cn } from '../../utils/cn'

const colorMap = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  delivering: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  assigned: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-indigo-100 text-indigo-800',
  on_the_way: 'bg-purple-100 text-purple-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
}

export default function Badge({ children, status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        colorMap[status] || 'bg-gray-100 text-gray-800',
        className
      )}
    >
      {children || status}
    </span>
  )
}
