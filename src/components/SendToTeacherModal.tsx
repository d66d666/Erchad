import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Send } from 'lucide-react'
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
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedStage, setSelectedStage] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
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
      .order('display_order')

    if (data) {
      setAllGroups(data)
      const uniqueStages = [...new Set(data.map(g => g.stage))]
      setStages(uniqueStages)
    }
  }

  useEffect(() => {
    if (selectedStage) {
      const stageGroups = allGroups.filter(g => g.stage === selectedStage)
      setGroups(stageGroups)
      setSelectedGroupId('')
    } else {
      setGroups([])
      setSelectedGroupId('')
    }
  }, [selectedStage, allGroups])


  const handleSend = async () => {
    if (!selectedTeacherId) {
      alert('الرجاء اختيار المعلم')
      return
    }

    if (!selectedStage) {
      alert('الرجاء اختيار المرحلة')
      return
    }

    if (!selectedGroupId) {
      alert('الرجاء اختيار المجموعة')
      return
    }

    setLoading(true)

    try {
      const teacher = teachers.find(t => t.id === selectedTeacherId)
      if (!teacher) return

      // فلتر الطلاب حسب المجموعة المختارة
      const filteredStudents = specialStatusStudents.filter(
        student => student.group_id === selectedGroupId
      )

      if (filteredStudents.length === 0) {
        alert('لا يوجد طلاب ذوي حالات خاصة في هذه المجموعة')
        setLoading(false)
        return
      }

      // إنشاء رسالة واتساب
      let message = ''
      const selectedGroup = allGroups.find(g => g.id === selectedGroupId)

      message += `*الحالات الخاصة - ${selectedGroup?.stage} - ${selectedGroup?.name}*\n\n`

      filteredStudents.forEach((student, index) => {
        message += `${index + 1}. *${student.name}*\n`
        message += `   الحالة: ${student.special_status?.name || '-'}\n`
        message += `   جوال الطالب: ${student.phone || '-'}\n`
        message += `   جوال ولي الأمر: ${student.parent_phone || '-'}\n\n`
      })

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
              سيتم إرسال بيانات الطلاب ذوي الحالات الخاصة في المجموعة المحددة إلى المعلم عبر واتساب
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المعلم <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- اختر المعلم --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.specialization}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المرحلة <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">-- اختر المرحلة --</option>
              {stages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المجموعة <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={!selectedStage}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- اختر المجموعة --</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {!selectedStage && (
              <p className="text-xs text-gray-500 mt-1">اختر المرحلة أولاً</p>
            )}
          </div>


          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSend}
              disabled={loading || !selectedTeacherId || !selectedStage || !selectedGroupId}
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
