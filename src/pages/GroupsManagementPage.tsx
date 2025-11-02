import { useState, useEffect } from 'react'
import { X, Plus, Layers, Trash2, Edit2, ChevronUp, ChevronDown } from 'lucide-react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
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
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState('')
  const [editStage, setEditStage] = useState('')

  useEffect(() => {
    fetchGroups()
    fetchStudentCounts()
  }, [])

  const fetchGroups = async () => {
    // Fetch from Supabase first
    const { data: supabaseGroups } = await supabase
      .from('groups')
      .select('*')
      .order('display_order', { ascending: true })

    if (supabaseGroups) {
      // Sync to IndexedDB
      await db.groups.clear()
      await db.groups.bulkAdd(supabaseGroups)
      setGroups(supabaseGroups)
    } else {
      // Fallback to IndexedDB
      const allGroups = await db.groups.toArray()
      setGroups(allGroups)
    }
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
      // Get max order from Supabase
      const { data: stageGroups } = await supabase
        .from('groups')
        .select('*')
        .eq('stage', newStage.trim())

      const maxOrder = stageGroups && stageGroups.length > 0
        ? Math.max(...stageGroups.map(g => g.display_order || 0))
        : 0

      const newGroup = {
        id: crypto.randomUUID(),
        stage: newStage.trim(),
        name: newGroupName.trim(),
        display_order: maxOrder + 1,
        created_at: new Date().toISOString(),
      }

      // Insert to Supabase
      const { error } = await supabase
        .from('groups')
        .insert(newGroup)

      if (error) throw error

      // Add to IndexedDB
      await db.groups.add(newGroup)

      setNewStage('')
      setNewGroupName('')
      await fetchGroups()
      await fetchStudentCounts()
    } catch (error) {
      console.error('Error adding group:', error)
      alert('حدث خطأ أثناء إضافة المجموعة')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return

    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Delete from IndexedDB
      await db.groups.delete(id)
      await fetchGroups()
      await fetchStudentCounts()
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('حدث خطأ أثناء حذف المجموعة')
    }
  }

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group)
    setEditName(group.name)
    setEditStage(group.stage)
  }

  const handleSaveEdit = async () => {
    if (!editingGroup || !editName.trim() || !editStage.trim()) return

    try {
      // Update in Supabase
      const { error } = await supabase
        .from('groups')
        .update({
          name: editName.trim(),
          stage: editStage.trim(),
        })
        .eq('id', editingGroup.id)

      if (error) throw error

      // Update in IndexedDB
      await db.groups.update(editingGroup.id, {
        name: editName.trim(),
        stage: editStage.trim(),
      })

      setEditingGroup(null)
      setEditName('')
      setEditStage('')
      await fetchGroups()
    } catch (error) {
      console.error('Error updating group:', error)
      alert('حدث خطأ أثناء تحديث المجموعة')
    }
  }

  const handleCancelEdit = () => {
    setEditingGroup(null)
    setEditName('')
    setEditStage('')
  }

  const handleMoveUp = async (group: Group, stageGroups: Group[]) => {
    const currentIndex = stageGroups.findIndex(g => g.id === group.id)
    if (currentIndex === 0) return

    const prevGroup = stageGroups[currentIndex - 1]
    const currentOrder = group.display_order || currentIndex + 1
    const prevOrder = prevGroup.display_order || currentIndex

    try {
      // Update in Supabase
      await supabase.from('groups').update({ display_order: prevOrder }).eq('id', group.id)
      await supabase.from('groups').update({ display_order: currentOrder }).eq('id', prevGroup.id)

      // Update in IndexedDB
      await db.groups.update(group.id, { display_order: prevOrder })
      await db.groups.update(prevGroup.id, { display_order: currentOrder })
      await fetchGroups()
    } catch (error) {
      console.error('Error moving group:', error)
    }
  }

  const handleMoveDown = async (group: Group, stageGroups: Group[]) => {
    const currentIndex = stageGroups.findIndex(g => g.id === group.id)
    if (currentIndex === stageGroups.length - 1) return

    const nextGroup = stageGroups[currentIndex + 1]
    const currentOrder = group.display_order || currentIndex + 1
    const nextOrder = nextGroup.display_order || currentIndex + 2

    try {
      // Update in Supabase
      await supabase.from('groups').update({ display_order: nextOrder }).eq('id', group.id)
      await supabase.from('groups').update({ display_order: currentOrder }).eq('id', nextGroup.id)

      // Update in IndexedDB
      await db.groups.update(group.id, { display_order: nextOrder })
      await db.groups.update(nextGroup.id, { display_order: currentOrder })
      await fetchGroups()
    } catch (error) {
      console.error('Error moving group:', error)
    }
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
                  <div className="space-y-3">
                    {stageGroups
                      .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
                      .map((group, index) => (
                        <div
                          key={group.id}
                          className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border-2 border-emerald-200 hover:shadow-md transition-all"
                        >
                          {editingGroup?.id === group.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={editStage}
                                  onChange={(e) => setEditStage(e.target.value)}
                                  className="px-3 py-2 border-2 border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  placeholder="الصف"
                                />
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="px-3 py-2 border-2 border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  placeholder="اسم المجموعة"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-semibold transition-colors"
                                >
                                  حفظ
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold transition-colors"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-800 text-lg mb-1">{group.name}</h4>
                                <p className="text-sm text-teal-700 font-semibold">
                                  {getStudentCount(group.id)} طالب
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => handleMoveUp(group, stageGroups)}
                                    disabled={index === 0}
                                    className="text-emerald-600 hover:bg-emerald-100 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="تحريك لأعلى"
                                  >
                                    <ChevronUp size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleMoveDown(group, stageGroups)}
                                    disabled={index === stageGroups.length - 1}
                                    className="text-emerald-600 hover:bg-emerald-100 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="تحريك لأسفل"
                                  >
                                    <ChevronDown size={18} />
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleEditGroup(group)}
                                  className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                                  title="تعديل المجموعة"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                                  title="حذف المجموعة"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          )}
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
