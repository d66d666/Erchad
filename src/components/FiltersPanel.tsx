import { SpecialStatus } from '../types'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface FiltersPanelProps {
  specialStatuses: SpecialStatus[]
  filter: {
    type: 'status' | 'special_status' | null
    value: string
  } | null
  onFilterChange: (filter: any) => void
}

export function FiltersPanel({
  specialStatuses,
  filter,
  onFilterChange,
}: FiltersPanelProps) {
  const [isSpecialStatusOpen, setIsSpecialStatusOpen] = useState(false)
  const [isStudentStatusOpen, setIsStudentStatusOpen] = useState(false)

  const getSpecialStatusLabel = () => {
    if (!filter || filter.type !== 'special_status') return 'الكل'
    if (filter.value === 'none') return 'بدون حالة خاصة'
    const status = specialStatuses.find((s) => s.id === filter.value)
    return status?.name || 'الكل'
  }

  const getStudentStatusLabel = () => {
    if (!filter || filter.type !== 'status') return 'الكل'
    return filter.value
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الحالات الخاصة
          </label>
          <div className="relative">
            <button
              onClick={() => setIsSpecialStatusOpen(!isSpecialStatusOpen)}
              className="w-full px-3 py-2 border border-orange-300 rounded-lg text-right text-sm font-medium bg-orange-50 hover:bg-orange-100 flex items-center justify-between"
            >
              <span>{getSpecialStatusLabel()}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${isSpecialStatusOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isSpecialStatusOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    onFilterChange(null)
                    setIsSpecialStatusOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-right text-sm font-medium hover:bg-orange-100 ${
                    filter === null ? 'bg-orange-100 text-orange-800' : 'text-gray-700'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => {
                    onFilterChange({ type: 'special_status', value: 'none' })
                    setIsSpecialStatusOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-right text-sm font-medium hover:bg-orange-100 ${
                    filter?.type === 'special_status' && filter?.value === 'none'
                      ? 'bg-orange-100 text-orange-800'
                      : 'text-gray-700'
                  }`}
                >
                  بدون حالة خاصة
                </button>
                {specialStatuses.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => {
                      onFilterChange({ type: 'special_status', value: status.id })
                      setIsSpecialStatusOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-right text-sm font-medium hover:bg-orange-100 ${
                      filter?.type === 'special_status' && filter?.value === status.id
                        ? 'bg-orange-100 text-orange-800'
                        : 'text-gray-700'
                    }`}
                  >
                    {status.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            حالة الطالب
          </label>
          <div className="relative">
            <button
              onClick={() => setIsStudentStatusOpen(!isStudentStatusOpen)}
              className="w-full px-3 py-2 border border-teal-300 rounded-lg text-right text-sm font-medium bg-teal-50 hover:bg-teal-100 flex items-center justify-between"
            >
              <span>{getStudentStatusLabel()}</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${isStudentStatusOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isStudentStatusOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    onFilterChange(null)
                    setIsStudentStatusOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-right text-sm font-medium hover:bg-teal-100 ${
                    filter === null ? 'bg-teal-100 text-teal-800' : 'text-gray-700'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => {
                    onFilterChange({ type: 'status', value: 'نشط' })
                    setIsStudentStatusOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-right text-sm font-medium hover:bg-teal-100 ${
                    filter?.type === 'status' && filter?.value === 'نشط'
                      ? 'bg-teal-100 text-teal-800'
                      : 'text-gray-700'
                  }`}
                >
                  نشط
                </button>
                <button
                  onClick={() => {
                    onFilterChange({ type: 'status', value: 'استئذان' })
                    setIsStudentStatusOpen(false)
                  }}
                  className={`w-full px-3 py-2 text-right text-sm font-medium hover:bg-teal-100 ${
                    filter?.type === 'status' && filter?.value === 'استئذان'
                      ? 'bg-teal-100 text-teal-800'
                      : 'text-gray-700'
                  }`}
                >
                  استئذان
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
