import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Edit2, Heart, Save } from 'lucide-react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { SpecialStatus } from '../types'

interface ManageSpecialStatusModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function ManageSpecialStatusModal({ isOpen, onClose, onUpdate }: ManageSpecialStatusModalProps) {
  const [statuses, setStatuses] = useState<SpecialStatus[]>([])
  const [newStatusName, setNewStatusName] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingStatus, setEditingStatus] = useState<SpecialStatus | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchStatuses()
    }
  }, [isOpen])

  const fetchStatuses = async () => {
    const { data } = await supabase
      .from('special_statuses')
      .select('*')
      .order('name')

    if (data) {
      await db.special_statuses.clear()
      await db.special_statuses.bulkAdd(data)
      setStatuses(data)
    }
  }

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStatusName.trim()) return

    setLoading(true)
    try {
      const newStatus = {
        id: crypto.randomUUID(),
        name: newStatusName.trim(),
        created_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('special_statuses')
        .insert(newStatus)

      if (error) throw error

      await db.special_statuses.add(newStatus)
      setNewStatusName('')
      await fetchStatuses()
      onUpdate()
    } catch (error) {
      console.error('Error adding status:', error)
      alert('حدث خطأ في إضافة الحالة')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!editingStatus || !editName.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('special_statuses')
        .update({ name: editName.trim() })
        .eq('id', editingStatus.id)

      if (error) throw error

      await db.special_statuses.update(editingStatus.id, { name: editName.trim() })
      setEditingStatus(null)
      setEditName('')
      await fetchStatuses()
      onUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('حدث خطأ في تحديث الحالة')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحالة؟ سيتم إزالتها من جميع الطلاب المرتبطين بها.')) return

    setLoading(true)
    try {
      await supabase
        .from('students')
        .update({ special_status_id: null })
        .eq('special_status_id', statusId)

      const { error } = await supabase
        .from('special_statuses')
        .delete()
        .eq('id', statusId)

      if (error) throw error

      await db.students
        .where('special_status_id')
        .equals(statusId)
        .modify({ special_status_id: null })

      await db.special_statuses.delete(statusId)
      await fetchStatuses()
      onUpdate()
    } catch (error) {
      console.error('Error deleting status:', error)
      alert('حدث خطأ في حذف الحالة')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <Heart size={24} />
            <h2 className="text-xl font-bold">إدارة الحالات الخاصة</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleAddStatus} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              اسم الحالة الخاصة
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                placeholder="أضف حالة جديدة..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-right"
                required
              />
              <button
                type="submit"
                disabled={loading || !newStatusName.trim()}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={20} />
                إضافة
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {statuses.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Heart size={48} className="mx-auto mb-3 opacity-30" />
                <p>لا توجد حالات خاصة</p>
              </div>
            ) : (
              statuses.map((status) => (
                <div
                  key={status.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-all"
                >
                  {editingStatus?.id === status.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-right"
                        autoFocus
                      />
                      <button
                        onClick={handleUpdateStatus}
                        disabled={loading || !editName.trim()}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save size={16} />
                        حفظ
                      </button>
                      <button
                        onClick={() => {
                          setEditingStatus(null)
                          setEditName('')
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteStatus(status.id)}
                          disabled={loading}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                          title="حذف"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingStatus(status)
                            setEditName(status.name)
                          }}
                          disabled={loading}
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                          title="تعديل"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                      <span className="text-gray-800 font-medium">{status.name}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
