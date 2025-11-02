import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Teacher, Group, TeacherGroup } from '../types'
import { Users, Plus, Edit2, Trash2, BookOpen } from 'lucide-react'

interface TeacherWithGroups extends Teacher {
  teacher_groups?: TeacherGroup[]
  groups?: Group[]
}

export function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherWithGroups[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const [teachersRes, groupsRes, teacherGroupsRes] = await Promise.all([
      supabase.from('teachers').select('*').order('name'),
      supabase.from('groups').select('*').order('name'),
      supabase.from('teacher_groups').select('*, groups(*)')
    ])

    if (groupsRes.data) setGroups(groupsRes.data)

    if (teachersRes.data) {
      const teachersWithGroups = teachersRes.data.map(teacher => ({
        ...teacher,
        groups: teacherGroupsRes.data
          ?.filter(tg => tg.teacher_id === teacher.id)
          .map(tg => tg.groups)
          .filter(Boolean) as Group[]
      }))
      setTeachers(teachersWithGroups)
    }

    setLoading(false)
  }

  const handleAddNew = () => {
    setEditingTeacher(null)
    setShowModal(true)
  }

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setShowModal(true)
  }

  const handleDelete = async (teacherId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المعلم؟')) return

    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', teacherId)

    if (error) {
      alert('حدث خطأ أثناء الحذف')
      console.error(error)
    } else {
      fetchData()
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <Users size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">المعلمين</h1>
              <p className="text-blue-100 text-lg mt-1">
                إجمالي المعلمين: {teachers.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all hover:shadow-md"
          >
            <Plus size={20} />
            <span>إضافة معلم</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
          <p className="text-gray-500 text-lg">جاري التحميل...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-200">
          <Users className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-xl mb-4">لا يوجد معلمين</p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>إضافة أول معلم</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-400 p-4">
                <h3 className="text-xl font-bold text-white">{teacher.name}</h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">المقرر الدراسي</p>
                    <p className="text-sm font-semibold text-gray-800">{teacher.specialization}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <span className="text-lg">📱</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">رقم الجوال</p>
                    <p className="text-sm font-semibold text-gray-800">{teacher.phone}</p>
                  </div>
                </div>

                {teacher.groups && teacher.groups.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">المجموعات</p>
                    <div className="flex flex-wrap gap-2">
                      {teacher.groups.map((group) => (
                        <span
                          key={group.id}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg"
                        >
                          {group.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(teacher)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 size={16} />
                    <span>تعديل</span>
                  </button>
                  <button
                    onClick={() => handleDelete(teacher.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TeacherFormModal
          teacher={editingTeacher}
          groups={groups}
          onClose={() => setShowModal(false)}
          onSave={fetchData}
        />
      )}
    </div>
  )
}

interface TeacherFormModalProps {
  teacher: Teacher | null
  groups: Group[]
  onClose: () => void
  onSave: () => void
}

function TeacherFormModal({ teacher, groups, onClose, onSave }: TeacherFormModalProps) {
  const [name, setName] = useState(teacher?.name || '')
  const [phone, setPhone] = useState(teacher?.phone || '')
  const [specialization, setSpecialization] = useState(teacher?.specialization || '')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)

  useEffect(() => {
    if (teacher) {
      fetchTeacherGroups()
    } else {
      setLoadingGroups(false)
    }
  }, [teacher])

  const fetchTeacherGroups = async () => {
    if (!teacher) return

    const { data } = await supabase
      .from('teacher_groups')
      .select('group_id')
      .eq('teacher_id', teacher.id)

    if (data) {
      setSelectedGroupIds(data.map(tg => tg.group_id))
    }
    setLoadingGroups(false)
  }

  const toggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter(id => id !== groupId))
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !phone.trim() || !specialization.trim()) {
      alert('الرجاء تعبئة جميع الحقول المطلوبة')
      return
    }

    setLoading(true)

    try {
      if (teacher) {
        const { error: updateError } = await supabase
          .from('teachers')
          .update({
            name: name.trim(),
            phone: phone.trim(),
            specialization: specialization.trim()
          })
          .eq('id', teacher.id)

        if (updateError) {
          console.error('Update error:', updateError)
          throw new Error(`فشل تحديث المعلم: ${updateError.message}`)
        }

        const { error: deleteError } = await supabase
          .from('teacher_groups')
          .delete()
          .eq('teacher_id', teacher.id)

        if (deleteError) {
          console.error('Delete groups error:', deleteError)
        }

        if (selectedGroupIds.length > 0) {
          const teacherGroupsData = selectedGroupIds.map(groupId => ({
            teacher_id: teacher.id,
            group_id: groupId,
          }))

          const { error: groupsError } = await supabase
            .from('teacher_groups')
            .insert(teacherGroupsData)

          if (groupsError) {
            console.error('Insert groups error:', groupsError)
            throw new Error(`فشل ربط المجموعات: ${groupsError.message}`)
          }
        }
      } else {
        const { data: newTeacher, error: insertError } = await supabase
          .from('teachers')
          .insert({
            name: name.trim(),
            phone: phone.trim(),
            specialization: specialization.trim()
          })
          .select()
          .single()

        if (insertError) {
          console.error('Insert error:', insertError)
          throw new Error(`فشل إضافة المعلم: ${insertError.message}`)
        }

        if (newTeacher && selectedGroupIds.length > 0) {
          const teacherGroupsData = selectedGroupIds.map(groupId => ({
            teacher_id: newTeacher.id,
            group_id: groupId,
          }))

          const { error: groupsError } = await supabase
            .from('teacher_groups')
            .insert(teacherGroupsData)

          if (groupsError) {
            console.error('Insert groups error:', groupsError)
            throw new Error(`فشل ربط المجموعات: ${groupsError.message}`)
          }
        }
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving teacher:', error)
      const errorMessage = error?.message || 'حدث خطأ غير معروف'
      alert(`حدث خطأ أثناء الحفظ:\n${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {teacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المعلم <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: أ. محمد أحمد"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الجوال <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="05xxxxxxxx"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المقرر الدراسي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: رياضيات، لغة عربية، علوم"
              required
            />
          </div>

          {loadingGroups ? (
            <div className="text-center py-4 text-gray-500">جاري تحميل المجموعات...</div>
          ) : groups.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                المجموعات التي يدرسها (اختياري)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {groups.map((group) => {
                  const isSelected = selectedGroupIds.includes(group.id)
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-900'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {group.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'جاري الحفظ...' : teacher ? 'حفظ التعديلات' : 'إضافة المعلم'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
