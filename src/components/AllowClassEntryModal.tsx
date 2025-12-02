import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Send, DoorOpen } from 'lucide-react'
import { Teacher, Student } from '../types'
import { formatPhoneForWhatsApp } from '../lib/formatPhone'

interface AllowClassEntryModalProps {
  isOpen: boolean
  onClose: () => void
  student: Student | null
}

export function AllowClassEntryModal({
  isOpen,
  onClose,
  student,
}: AllowClassEntryModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [loading, setLoading] = useState(false)
  const [counselorName, setCounselorName] = useState('')
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchTeachers()
      fetchCounselorInfo()
    }
  }, [isOpen])

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .order('name')

    if (data) setTeachers(data)
  }

  const fetchCounselorInfo = async () => {
    const { data } = await supabase
      .from('teacher_profile')
      .select('name, school_name')
      .maybeSingle()

    if (data) {
      setCounselorName(data.name || '')
      setSchoolName(data.school_name || '')
    }
  }

  const handleSend = async () => {
    if (!selectedTeacherId || !student) {
      alert('الرجاء اختيار المعلم')
      return
    }

    setLoading(true)

    try {
      const teacher = teachers.find(t => t.id === selectedTeacherId)
      if (!teacher) return

      const currentDate = new Date().toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })

      const currentTime = new Date().toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit'
      })

      // إنشاء رسالة السماح بالدخول
      let message = `✅ *السماح بدخول الطالب للفصل*\n\n`
      message += `اسم الطالب: *${student.name}*\n\n`
      message += `المرسل: ${counselorName || 'الأستاذ'}`

      // فتح واتساب
      const encodedMessage = encodeURIComponent(message)
      const phoneNumber = formatPhoneForWhatsApp(teacher.phone)
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`

      window.open(whatsappUrl, '_blank')

      onClose()
    } catch (error) {
      console.error('Error sending entry permission:', error)
      alert('حدث خطأ أثناء الإرسال')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !student) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DoorOpen className="text-white" size={24} />
            <h2 className="text-2xl font-bold text-white">السماح بدخول الفصل</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2">معلومات الطالب:</h3>
            <div className="space-y-1 text-sm text-blue-900">
              <p><strong>الاسم:</strong> {student.name}</p>
              <p><strong>السجل المدني:</strong> {student.national_id}</p>
              <p><strong>الصف:</strong> {student.grade}</p>
              <p><strong>المجموعة:</strong> {student.group?.name || '-'}</p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              سيتم إرسال رسالة السماح بدخول الطالب للفصل إلى المعلم المختار عبر واتساب
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المعلم
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- اختر المعلم --</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.specialization} ({teacher.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">معاينة الرسالة:</h4>
            <div className="text-sm text-gray-700 whitespace-pre-line space-y-2">
              <p className="text-blue-600 font-bold">✅ السماح بدخول الطالب للفصل</p>
              <p>اسم الطالب: <strong>{student.name}</strong></p>
              <p>المرسل: {counselorName || 'الأستاذ'}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSend}
              disabled={loading || !selectedTeacherId}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
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
