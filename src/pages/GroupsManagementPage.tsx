import { useState, useEffect } from 'react'
import { X, Plus, Layers, Trash2, Edit2, ChevronUp, ChevronDown, Printer, UserPlus } from 'lucide-react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { Group, Student } from '../types'
import { AddStudentModal } from '../components/AddStudentModal'

export function GroupsManagementPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [newStage, setNewStage] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState('')
  const [editStage, setEditStage] = useState('')
  const [showStatusDetails, setShowStatusDetails] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(() => {
    const allStages = {} as Record<string, boolean>
    return allStages
  })

  useEffect(() => {
    fetchGroups()
    fetchStudentCounts()
    fetchStudents()
  }, [])

  useEffect(() => {
    const allStages = {} as Record<string, boolean>
    groups.forEach(group => {
      allStages[group.stage] = true
    })
    setExpandedStages(allStages)
  }, [groups])

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

  const fetchStudents = async () => {
    // Fetch from Supabase first
    const { data: supabaseStudents } = await supabase
      .from('students')
      .select('*')

    if (supabaseStudents) {
      // Sync to IndexedDB
      await db.students.clear()
      await db.students.bulkAdd(supabaseStudents)
      setStudents(supabaseStudents as Student[])
    } else {
      // Fallback to IndexedDB
      const allStudents = await db.students.toArray()
      setStudents(allStudents as Student[])
    }
  }

  const fetchStudentCounts = async () => {
    // Fetch from Supabase first
    const { data: supabaseStudents } = await supabase
      .from('students')
      .select('*')

    const studentsToCount = supabaseStudents || await db.students.toArray()
    const counts: Record<string, number> = {}

    studentsToCount.forEach(student => {
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
      alert('تمت إضافة المجموعة بنجاح')
    } catch (error) {
      console.error('Error adding group:', error)
      alert('حدث خطأ أثناء إضافة المجموعة')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    const studentCount = studentCounts[id] || 0

    if (studentCount > 0) {
      alert(`لا يمكن حذف هذه المجموعة لأنها تحتوي على ${studentCount} طالب/طالبة`)
      return
    }

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
      alert('تم حذف المجموعة بنجاح')
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

  const getStageStudentsForGroup = (groupId: string) => {
    return students.filter(s => s.group_id === groupId)
  }

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stage]: !prev[stage]
    }))
  }

  const getStageColor = (stage: string) => {
    const colors = {
      'الصف الأول الابتدائي': { bg: 'from-slate-600 to-slate-700', light: 'from-slate-50 to-slate-100', border: 'border-slate-300' },
      'الصف الثاني الابتدائي': { bg: 'from-gray-600 to-gray-700', light: 'from-gray-50 to-gray-100', border: 'border-gray-300' },
      'الصف الثالث الابتدائي': { bg: 'from-zinc-600 to-zinc-700', light: 'from-zinc-50 to-zinc-100', border: 'border-zinc-300' },
      'الصف الرابع الابتدائي': { bg: 'from-stone-600 to-stone-700', light: 'from-stone-50 to-stone-100', border: 'border-stone-300' },
      'الصف الخامس الابتدائي': { bg: 'from-neutral-600 to-neutral-700', light: 'from-neutral-50 to-neutral-100', border: 'border-neutral-300' },
      'الصف السادس الابتدائي': { bg: 'from-slate-700 to-slate-800', light: 'from-slate-50 to-slate-100', border: 'border-slate-300' },
      'الصف الأول المتوسط': { bg: 'from-gray-700 to-gray-800', light: 'from-gray-50 to-gray-100', border: 'border-gray-300' },
      'الصف الثاني المتوسط': { bg: 'from-zinc-700 to-zinc-800', light: 'from-zinc-50 to-zinc-100', border: 'border-zinc-300' },
      'الصف الثالث المتوسط': { bg: 'from-stone-700 to-stone-800', light: 'from-stone-50 to-stone-100', border: 'border-stone-300' },
      'الصف الأول الثانوي': { bg: 'from-neutral-700 to-neutral-800', light: 'from-neutral-50 to-neutral-100', border: 'border-neutral-300' },
      'الصف الثاني الثانوي': { bg: 'from-slate-800 to-slate-900', light: 'from-slate-50 to-slate-100', border: 'border-slate-300' },
      'الصف الثالث الثانوي': { bg: 'from-gray-800 to-gray-900', light: 'from-gray-50 to-gray-100', border: 'border-gray-300' },
    }
    return colors[stage as keyof typeof colors] || { bg: 'from-gray-600 to-gray-700', light: 'from-gray-50 to-gray-100', border: 'border-gray-300' }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-100 via-green-100 to-teal-100 rounded-xl shadow-md border border-emerald-200 p-5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={showStatusDetails}
              onChange={(e) => setShowStatusDetails(e.target.checked)}
              className="w-5 h-5 rounded cursor-pointer"
            />
            <span className="text-emerald-800 font-semibold">إظهار تفاصيل الحالة</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
            >
              <UserPlus size={16} />
              <span>إضافة طالب</span>
            </button>
            <button
              onClick={() => setShowManageModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-all shadow-sm"
            >
              <Layers size={16} />
              <span>إدارة المجموعات</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-all shadow-sm"
            >
              <Printer size={16} />
              <span>طباعة الكل</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedStages.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500">
            لا توجد مجموعات حالياً
          </div>
        ) : (
          sortedStages.map(([stage, stageGroups]) => {
            const colors = getStageColor(stage)
            const isExpanded = expandedStages[stage]
            const totalStudents = stageGroups.reduce((sum, g) => sum + getStudentCount(g.id), 0)

            return (
              <div key={stage} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <button
                  onClick={() => toggleStage(stage)}
                  className={`w-full bg-gradient-to-r ${colors.bg} px-6 py-4 flex items-center justify-between hover:opacity-90 transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <Layers size={20} className="text-white" />
                    <h3 className="text-lg font-bold text-white text-right">{stage}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white/90 font-medium">
                      {totalStudents} طالب في {stageGroups.length} مجموعة
                    </span>
                    {isExpanded ? <ChevronUp className="text-white" size={24} /> : <ChevronDown className="text-white" size={24} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {stageGroups
                        .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
                        .map((group, index) => {
                          const groupStudents = getStageStudentsForGroup(group.id)

                          return (
                            <div
                              key={group.id}
                              className={`bg-gradient-to-r ${colors.light} rounded-lg border-2 ${colors.border} overflow-hidden`}
                            >
                              {editingGroup?.id === group.id ? (
                                <div className="p-4 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <input
                                      type="text"
                                      value={editStage}
                                      onChange={(e) => setEditStage(e.target.value)}
                                      className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="الصف"
                                    />
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                <>
                                  <div className="p-4 flex items-center justify-between">
                                    <div className="flex-1">
                                      <h4 className="font-bold text-gray-800 text-lg mb-1">{group.name}</h4>
                                      <p className="text-sm text-gray-600 font-medium">
                                        {getStudentCount(group.id)} طالب
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex flex-col gap-1">
                                        <button
                                          onClick={() => handleMoveUp(group, stageGroups)}
                                          disabled={index === 0}
                                          className="text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                          title="تحريك لأعلى"
                                        >
                                          <ChevronUp size={18} />
                                        </button>
                                        <button
                                          onClick={() => handleMoveDown(group, stageGroups)}
                                          disabled={index === stageGroups.length - 1}
                                          className="text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

                                  {groupStudents.length > 0 && (
                                    <div className="border-t-2 border-white/50 bg-white/30 px-4 py-3">
                                      <div className="space-y-2">
                                        {groupStudents.map(student => (
                                          <div key={student.id} className="flex items-center justify-between text-sm bg-white/50 px-3 py-2 rounded">
                                            <span className="font-medium text-gray-700">{student.name}</span>
                                            <span className="text-gray-500">{student.status}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {showManageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers size={28} />
                <h2 className="text-2xl font-bold">إدارة المراحل والمجموعات</h2>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 mb-4">إضافة مجموعة جديدة</h3>

                <form onSubmit={handleAddGroup} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-right">
                        الصف (المرحلة)
                      </label>
                      <select
                        value={newStage}
                        onChange={(e) => setNewStage(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right bg-white/70"
                        required
                      >
                        <option value="">اختر المرحلة</option>
                        <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                        <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                        <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                        <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                        <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                        <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                        <option value="الصف الأول المتوسط">الصف الأول المتوسط</option>
                        <option value="الصف الثاني المتوسط">الصف الثاني المتوسط</option>
                        <option value="الصف الثالث المتوسط">الصف الثالث المتوسط</option>
                        <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                        <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                        <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-right">
                        اسم المجموعة
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: مجموعة 1"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right bg-white/70"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !newStage.trim() || !newGroupName.trim()}
                    className="w-full bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white py-2 text-sm rounded-lg font-semibold transition-colors"
                  >
                    إضافة المجموعة
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddStudentModal && (
        <AddStudentModal
          onClose={() => {
            setShowAddStudentModal(false)
            fetchStudents()
            fetchStudentCounts()
          }}
        />
      )}
    </div>
  )
}
