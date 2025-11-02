import { useState } from 'react'
import { db } from '../lib/db'
import { X, Trash2, Plus, Layers, ChevronUp, ChevronDown } from 'lucide-react'
import { Group } from '../types'

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
        const maxOrder = await db.groups
          .where('stage').equals(newStage.trim())
          .toArray()
          .then(groups => Math.max(0, ...groups.map(g => g.display_order || 0)))

        await db.groups.add({
          id: newId,
          stage: newStage.trim(),
          name: newItem.trim(),
          display_order: maxOrder + 1,
          created_at: new Date().toISOString(),
        })
      } else {
        const newId = crypto.randomUUID()
        await db.special_statuses.add({
          id: newId,
          name: newItem.trim(),
          created_at: new Date().toISOString(),
        })
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
        await db.special_statuses.delete(id)
      }
      onDataUpdated()
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleMoveUp = async (group: Group, stageGroups: Group[]) => {
    const currentIndex = stageGroups.findIndex(g => g.id === group.id)
    if (currentIndex <= 0) return

    const previousGroup = stageGroups[currentIndex - 1]
    const tempOrder = group.display_order

    await db.groups.update(group.id, { display_order: previousGroup.display_order })
    await db.groups.update(previousGroup.id, { display_order: tempOrder })

    onDataUpdated()
  }

  const handleMoveDown = async (group: Group, stageGroups: Group[]) => {
    const currentIndex = stageGroups.findIndex(g => g.id === group.id)
    if (currentIndex >= stageGroups.length - 1) return

    const nextGroup = stageGroups[currentIndex + 1]
    const tempOrder = group.display_order

    await db.groups.update(group.id, { display_order: nextGroup.display_order })
    await db.groups.update(nextGroup.id, { display_order: tempOrder })

    onDataUpdated()
  }

  if (!isOpen) return null

  const title = type === 'groups' ? 'إدارة المجموعات' : 'إدارة الحالات الخاصة'

  // Define stage order
  const stageOrder: Record<string, number> = {
    'الصف الاول الثانوي': 1,
    'الصف الثاني الثانوي': 2,
    'الصف الثالث الثانوي': 3,
  }

  const groupedByStage =
    type === 'groups'
      ? (existingItems as Group[]).reduce((acc, group) => {
          if (!acc[group.stage]) {
            acc[group.stage] = []
          }
          acc[group.stage].push(group)
          return acc
        }, {} as Record<string, Group[]>)
      : {}

  // Sort stages by defined order and sort groups within each stage by display_order
  const sortedStages = Object.entries(groupedByStage)
    .sort((a, b) => {
      const orderA = stageOrder[a[0]] || 999
      const orderB = stageOrder[b[0]] || 999
      return orderA - orderB
    })
    .map(([stage, groups]) => [
      stage,
      groups.sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
    ] as [string, Group[]])

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
            {type === 'groups' ? (
              sortedStages.map(([stage, stageGroups]) => (
                <div key={stage} className="border-2 border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Layers size={18} className="text-white" />
                      <span className="font-bold text-white">{stage}</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-2 bg-gray-50">
                    {stageGroups.map((group, index) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <span className="font-medium text-gray-800">{group.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveUp(group, stageGroups)}
                            disabled={index === 0}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="\u062a\u062d\u0631\u064a\u0643 \u0644\u0644\u0623\u0639\u0644\u0649"
                          >
                            <ChevronUp size={18} />
                          </button>
                          <button
                            onClick={() => handleMoveDown(group, stageGroups)}
                            disabled={index === stageGroups.length - 1}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="\u062a\u062d\u0631\u064a\u0643 \u0644\u0644\u0623\u0633\u0641\u0644"
                          >
                            <ChevronDown size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(group.id)}
                            disabled={deleteLoading === group.id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors"
                            title="\u062d\u0630\u0641"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              existingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span className="font-medium text-gray-800">{item.name}</span>
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

        <div className="border-t border-gray-200 p-6 bg-blue-50">
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
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
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
