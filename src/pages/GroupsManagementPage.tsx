import { useState, useEffect } from 'react'
import { X, Plus, Layers } from 'lucide-react'
import { db } from '../lib/db'
import { Group } from '../types'

interface GroupsManagementPageProps {
  onClose: () => void
}

export function GroupsManagementPage({ onClose }: GroupsManagementPageProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [newStage, setNewStage] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchGroups()
    fetchStudentCounts()
  }, [])

  const fetchGroups = async () => {
    const allGroups = await db.groups.toArray()
    setGroups(allGroups)
  }

  const fetchStudentCounts = async () => {
    const allStudents = await db.students.toArray()
    const counts: Record<string, number> = {}

    allStudents.forEach(student => {
      if (student.group_id) {
        counts[student.group_id] = (counts[student.group_id] || 0) + 1
      }
    })

    setStudentCounts(counts)
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStage.trim() || !newGroupName.trim()) return

    setLoading(true)
    try {
      const stageGroups = await db.groups
        .where('stage')
        .equals(newStage.trim())
        .toArray()
      const maxOrder = stageGroups.length > 0
        ? Math.max(...stageGroups.map(g => g.display_order || 0))
        : 0

      await db.groups.add({
        id: crypto.randomUUID(),
        stage: newStage.trim(),
        name: newGroupName.trim(),
        display_order: maxOrder + 1,
        created_at: new Date().toISOString(),
      })

      setNewStage('')
      setNewGroupName('')
      await fetchGroups()
      await fetchStudentCounts()
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return
    await db.groups.delete(id)
    await fetchGroups()
    await fetchStudentCounts()
  }

  const stageOrder: Record<string, number> = {
    'الصف الاول الثانوي': 1,
    'الصف الأول الثانوي': 1,
    'الصف الثاني الثانوي': 2,
    'الصف الثالث الثانوي': 3,
  }

  const groupedByStage = groups.reduce((acc, group) => {
    if (!acc[group.stage]) {
      acc[group.stage] = []
    }
    acc[group.stage].push(group)
    return acc
  }, {} as Record<string, Group[]>)

  const sortedStages = Object.entries(groupedByStage).sort((a, b) => {
    const orderA = stageOrder[a[0]] || 999
    const orderB = stageOrder[b[0]] || 999
    return orderA - orderB
  })

  const getStudentCount = (groupId: string) => {
    return studentCounts[groupId] || 0
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">إدارة المراحل والمجموعات</h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-emerald-800 mb-6">إضافة مجموعة جديدة</h2>

          <form onSubmit={handleAddGroup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الصف (المرحلة)
                </label>
                <input
                  type="text"
                  placeholder="مثال: الصف الأول الثانوي"
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  اسم المجموعة
                </label>
                <input
                  type="text"
                  placeholder="مثال: مجموعة 1"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !newStage.trim() || !newGroupName.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={20} />
              إضافة المجموعة
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800">المجموعات الحالية</h2>

          {sortedStages.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              لا توجد مجموعات حالياً
            </div>
          ) : (
            sortedStages.map(([stage, stageGroups]) => (
              <div key={stage} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 flex items-center gap-3">
                  <Layers size={20} className="text-white" />
                  <h3 className="text-lg font-bold text-white">{stage}</h3>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stageGroups
                      .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
                      .map((group) => (
                        <div
                          key={group.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-gray-800 text-lg">{group.name}</h4>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                              title="حذف المجموعة"
                            >
                              <X size={20} />
                            </button>
                          </div>
                          <p className="text-sm text-teal-600">
                            {getStudentCount(group.id)} طالب
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
