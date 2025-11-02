import { useState } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { X, Trash2, Plus } from 'lucide-react'

interface ManageModalProps {
  type: 'groups' | 'special_statuses'
  isOpen: boolean
  onClose: () => void
  onDataUpdated: () => void
  existingItems: Array<{ id: string; name: string; stage?: string }>
}

export function ManageModal({
  type,
  isOpen,
  onClose,
  onDataUpdated,
  existingItems,
}: ManageModalProps) {
  const [newItem, setNewItem] = useState('')
  const [newStage, setNewStage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    if (type === 'groups') {
      if (!newStage.trim() || !newItem.trim()) {
        setError('يرجى ملء جميع الحقول')
        return
      }
    } else {
      if (!newItem.trim()) return
    }

    setLoading(true)
    setError('')

    try {
      if (type === 'groups') {
        const newId = crypto.randomUUID()

        // Get the highest display_order for this stage
        const stageGroups = await db.groups
          .where('stage')
          .equals(newStage.trim())
          .toArray()
        const maxOrder = stageGroups.length > 0
          ? Math.max(...stageGroups.map(g => g.display_order || 0))
          : 0

        await db.groups.add({
          id: newId,
          stage: newStage.trim(),
          name: newItem.trim(),
          display_order: maxOrder + 1,
          created_at: new Date().toISOString(),
        })
      } else {
        const { error } = await supabase
          .from('special_statuses')
          .insert({
            name: newItem.trim(),
          })

        if (error) throw error
      }

      setNewItem('')
      setNewStage('')
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
      if (type === 'groups') {
        await db.groups.delete(id)
      } else {
        const { error } = await supabase
          .from('special_statuses')
          .delete()
          .eq('id', id)

        if (error) throw error
      }
      onDataUpdated()
    } finally {
      setDeleteLoading(null)
    }
  }

  if (!isOpen) return null

  const title = type === 'groups' ? 'إدارة المجموعات' : 'إدارة الحالات الخاصة'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-500">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {existingItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {type === 'groups' ? 'لا توجد مجموعات' : 'لا توجد حالات خاصة'}
              </div>
            ) : (
              existingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="font-medium text-gray-800">
                    {type === 'groups' && item.stage ? `${item.stage} - ${item.name}` : item.name}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteLoading === item.id}
                    className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <form onSubmit={handleAdd} className="space-y-3">
            {type === 'groups' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الصف (المرحلة)
                </label>
                <input
                  type="text"
                  placeholder="مثال: الصف الأول الثانوي"
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {type === 'groups' ? 'اسم المجموعة' : 'اسم الحالة الخاصة'}
              </label>
              <input
                type="text"
                placeholder={type === 'groups' ? 'مثال: مجموعة 1' : 'أضف جديد...'}
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !newItem.trim() || (type === 'groups' && !newStage.trim())}
              className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={20} />
              {type === 'groups' ? 'إضافة المجموعة' : 'إضافة'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
