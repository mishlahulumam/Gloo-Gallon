import { cn } from '../../utils/cn'

export function Table({ children, className }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className={cn('min-w-full divide-y divide-gray-200', className)}>
        {children}
      </table>
    </div>
  )
}

export function Thead({ children }) {
  return <thead className="bg-gray-50">{children}</thead>
}

export function Th({ children, className }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500', className)}>
      {children}
    </th>
  )
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
}

export function Td({ children, className }) {
  return (
    <td className={cn('whitespace-nowrap px-4 py-3 text-sm text-gray-700', className)}>
      {children}
    </td>
  )
}
