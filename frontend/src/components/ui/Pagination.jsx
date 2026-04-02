import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Halaman {page} dari {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
