import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, Trash2, Plus } from 'lucide-react'

interface ManageModalProps {
  type: 'groups' | 'special_statuses'
  isOpen: boolean
  onClose: () => void
  onDataUpdated: () => void
  existingItems: Array<{ id: string; name: string }>
}

export function ManageModal({
  type,
  isOpen,
  onClose,
  onDataUpdated,
  existingItems,
}: ManageModalProps) {
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return

    setLoading(true)
    setError('')

    try {
      const tableName = type === 'groups' ? 'groups' : 'special_statuses'
      const { error: insertError } = await supabase
        .from(tableName)
        .insert([{ name: newItem.trim() }])

      if (insertError) throw insertError
      setNewItem('')
      onDataUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return

    setDeleteLoading(id)
    try {
      const tableName = type === 'groups' ? 'groups' : 'special_statuses'
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      onDataUpdated()
    } finally {
      setDeleteLoading(null)
    }
  }

  if (!isOpen) return null

  const title = type === 'groups' ? 'إدارة المجموعات' : 'إدارة الحالات الخاصة'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-96 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {existingItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="font-medium text-gray-800">{item.name}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteLoading === item.id}
                  className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="أضف جديد..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !newItem.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center gap-2"
            >
              <Plus size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
