import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Send, Check } from 'lucide-react'
import { Teacher, Group, Student } from '../types'

interface SendToTeacherModalProps {
  isOpen: boolean
  onClose: () => void
  specialStatusStudents: Student[]
}

export function SendToTeacherModal({
  isOpen,
  onClose,
  specialStatusStudents,
}: SendToTeacherModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTeachers()
      fetchGroups()
    }
  }, [isOpen])

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .order('name')

    if (data) setTeachers(data)
  }

  const fetchGroups = async () => {
    const { data } = await supabase
      .from('groups')
      .select('*')
      .order('name')

    if (data) setGroups(data)
  }

  const toggleGroupSelection = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter(id => id !== groupId))
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId])
    }
  }

  const handleSend = async () => {
    if (!selectedTeacherId || selectedGroupIds.length === 0) {
      alert('الرجاء اختيار المعلم والمجموعات')
      return
    }

    setLoading(true)

    try {
      const teacher = teachers.find(t => t.id === selectedTeacherId)
      if (!teacher) return

      // فلترة الطلاب حسب المجموعات المختارة
      const filteredStudents = specialStatusStudents.filter(
        student => selectedGroupIds.includes(student.group_id)
      )

      if (filteredStudents.length === 0) {
        alert('لا يوجد طلاب ذوي حالات خاصة في المجموعات المختارة')
        setLoading(false)
        return
      }

      // إنشاء رسالة واتساب
      let message = `*الطلاب ذوي الحالات الخاصة*\n\n`
      message += `الأستاذ/ة: ${teacher.name}\n`
      message += `التخصص: ${teacher.specialization}\n\n`
      message += `---\n\n`

      // تجميع الطلاب حسب المجموعة
      selectedGroupIds.forEach(groupId => {
        const group = groups.find(g => g.id === groupId)
        const groupStudents = filteredStudents.filter(s => s.group_id === groupId)

        if (groupStudents.length > 0) {
          message += `📚 *${group?.name || 'مجموعة'}*\n\n`
          groupStudents.forEach((student, index) => {
            message += `${index + 1}. *${student.name}*\n`
            message += `   السجل: ${student.national_id}\n`
            message += `   الحالة الخاصة: ${student.special_status?.name || '-'}\n`
            message += `   جوال الطالب: ${student.phone}\n`
            message += `   جوال ولي الأمر: ${student.guardian_phone}\n\n`
          })
          message += `---\n\n`
        }
      })

      message += `\nتم إرسال هذه الرسالة من نظام الإرشاد الطلابي`

      // حفظ ربط المعلم بالمجموعات
      const teacherGroupsData = selectedGroupIds.map(groupId => ({
        teacher_id: selectedTeacherId,
        group_id: groupId,
      }))

      await supabase
        .from('teacher_groups')
        .upsert(teacherGroupsData, { onConflict: 'teacher_id,group_id', ignoreDuplicates: true })

      // فتح واتساب
      const encodedMessage = encodeURIComponent(message)
      const phoneNumber = teacher.phone.replace(/[^0-9]/g, '')
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

      window.open(whatsappUrl, '_blank')

      onClose()
    } catch (error) {
      console.error('Error sending to teacher:', error)
      alert('حدث خطأ أثناء الإرسال')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send className="text-green-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">إرسال للمعلم</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              سيتم إرسال بيانات الطلاب ذوي الحالات الخاصة في المجموعات المختارة إلى المعلم عبر واتساب
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المعلم
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- اختر المعلم --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.specialization} ({teacher.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              اختر المجموعات ({selectedGroupIds.length} مختار)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {groups.map((group) => {
                const isSelected = selectedGroupIds.includes(group.id)
                const groupStudentsCount = specialStatusStudents.filter(
                  s => s.group_id === group.id
                ).length

                return (
                  <button
                    key={group.id}
                    onClick={() => toggleGroupSelection(group.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      isSelected
                        ? 'bg-green-50 border-green-500 text-green-900'
                        : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{group.name}</span>
                      <div className="flex items-center gap-1">
                        {groupStudentsCount > 0 && (
                          <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                            {groupStudentsCount}
                          </span>
                        )}
                        {isSelected && <Check size={16} className="text-green-600" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSend}
              disabled={loading || !selectedTeacherId || selectedGroupIds.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Send size={20} />
              {loading ? 'جاري الإرسال...' : 'إرسال عبر واتساب'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
