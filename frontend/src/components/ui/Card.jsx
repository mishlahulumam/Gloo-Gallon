import { cn } from '../../utils/cn'

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h3>
  )
}
