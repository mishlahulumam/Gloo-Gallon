import { cn } from '../../utils/cn'

export default function Select({ label, error, options, className, ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
