import { useState, useEffect, useMemo } from 'react'
import { db } from '../lib/db'
import { X, Send, DoorOpen, Search, UserPlus, UserMinus } from 'lucide-react'
import { Teacher, Student } from '../types'
import { formatPhoneForWhatsApp } from '../lib/formatPhone'
import { openWhatsApp } from '../lib/openWhatsApp'
import { CustomAlert } from './CustomAlert'
import { normalizeArabic } from '../lib/normalizeArabic'

interface AllowClassEntryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AllowClassEntryModal({
  isOpen,
  onClose,
}: AllowClassEntryModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [counselorName, setCounselorName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success')

  useEffect(() => {
    if (isOpen) {
      fetchTeachers()
      fetchStudents()
      fetchCounselorInfo()
      setSelectedStudentIds([])
      setSearchTerm('')
      setSelectedTeacherId('')
    }
  }, [isOpen])

  const fetchTeachers = async () => {
    const data = await db.teachers.orderBy('name').toArray()
    setTeachers(data)
  }

  const fetchStudents = async () => {
    const data = await db.students
      .orderBy('name')
      .toArray()
      .then(students =>
        students.map(s => ({
          ...s,
          group: undefined
        }))
      )

    const groups = await db.groups.toArray()
    const studentsWithGroups = data.map(s => ({
      ...s,
      group: groups.find(g => g.id === s.group_id)
    }))

    setStudents(studentsWithGroups)
  }

  const fetchCounselorInfo = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    const data = await db.teacher_profile.where('id').equals(userId).first()
    if (data) {
      setCounselorName(data.name || '')
      setSchoolName(data.school_name || '')
    }
  }

  const arabicTextIncludes = (text: string, search: string) => {
    return normalizeArabic(text).includes(normalizeArabic(search))
  }

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return []

    return students.filter(s =>
      arabicTextIncludes(s.name, searchTerm) ||
      s.national_id.includes(searchTerm) ||
      s.phone.includes(searchTerm) ||
      s.guardian_phone.includes(searchTerm)
    ).slice(0, 50)
  }, [students, searchTerm])

  const selectedStudents = useMemo(() => {
    return students.filter(s => selectedStudentIds.includes(s.id))
  }, [students, selectedStudentIds])

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId)
      } else {
        return [...prev, studentId]
      }
    })
  }

  const handleSend = async () => {
    if (!selectedTeacherId) {
      setAlertMessage('الرجاء اختيار المعلم')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    if (selectedStudentIds.length === 0) {
      setAlertMessage('الرجاء اختيار طالب واحد على الأقل')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    setLoading(true)

    try {
      const teacher = teachers.find(t => t.id === selectedTeacherId)
      if (!teacher) return

      let message = `✅ *السماح بدخول الطلاب للفصل*\n\n`

      if (selectedStudents.length === 1) {
        message += `اسم الطالب: *${selectedStudents[0].name}*\n`
        message += `الصف: ${selectedStudents[0].grade}\n\n`
      } else {
        message += `عدد الطلاب: *${selectedStudents.length}*\n\n`
        message += `أسماء الطلاب:\n`
        selectedStudents.forEach((student, index) => {
          message += `${index + 1}. ${student.name} - ${student.grade}\n`
        })
        message += `\n`
      }

      message += `المرسل: ${counselorName || 'مسؤول النظام'}`

      const phoneNumber = formatPhoneForWhatsApp(teacher.phone)
      openWhatsApp(phoneNumber, message)

      setAlertMessage(`تم إرسال ${selectedStudents.length} طالب بنجاح`)
      setAlertType('success')
      setShowAlert(true)

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error sending entry permission:', error)
      setAlertMessage('حدث خطأ أثناء الإرسال')
      setAlertType('error')
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              ابحث عن الطلاب وأضفهم للقائمة، ثم اختر المعلم لإرسال رسالة واحدة تحتوي على جميع الطلاب
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              بحث عن طالب
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم، السجل المدني، أو رقم الجوال..."
                className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {searchTerm && filteredStudents.length > 0 && (
              <div className="mt-2 border-2 border-gray-300 rounded-lg max-h-60 overflow-y-auto bg-white">
                {filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id)
                  return (
                    <button
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      disabled={isSelected}
                      className={`w-full text-right px-4 py-3 border-b border-gray-200 hover:bg-blue-50 transition-colors flex items-center justify-between ${
                        isSelected ? 'bg-green-50 opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-600">
                          {student.grade} - {student.group?.name || '-'}
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="text-green-600 text-sm font-medium">تم الإضافة ✓</span>
                      ) : (
                        <UserPlus className="text-blue-600" size={20} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {selectedStudents.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-green-900">
                  الطلاب المختارون ({selectedStudents.length})
                </h3>
                <button
                  onClick={() => setSelectedStudentIds([])}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  حذف الكل
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className="bg-white rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {index + 1}. {student.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {student.grade} - {student.group?.name || '-'}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleStudent(student.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                    >
                      <UserMinus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {selectedStudents.length > 0 && selectedTeacherId && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">معاينة الرسالة:</h4>
              <div className="text-sm text-gray-700 whitespace-pre-line space-y-1">
                <p className="text-blue-600 font-bold">✅ السماح بدخول الطلاب للفصل</p>
                {selectedStudents.length === 1 ? (
                  <>
                    <p>اسم الطالب: <strong>{selectedStudents[0].name}</strong></p>
                    <p>الصف: {selectedStudents[0].grade}</p>
                  </>
                ) : (
                  <>
                    <p>عدد الطلاب: <strong>{selectedStudents.length}</strong></p>
                    <p className="mt-1">أسماء الطلاب:</p>
                    {selectedStudents.slice(0, 5).map((student, index) => (
                      <p key={student.id} className="mr-2">
                        {index + 1}. {student.name} - {student.grade}
                      </p>
                    ))}
                    {selectedStudents.length > 5 && (
                      <p className="mr-2 text-gray-500">... و {selectedStudents.length - 5} آخرين</p>
                    )}
                  </>
                )}
                <p className="mt-2">المرسل: {counselorName || 'مسؤول النظام'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-6">
          <div className="flex gap-3">
            <button
              onClick={handleSend}
              disabled={loading || !selectedTeacherId || selectedStudentIds.length === 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Send size={20} />
              {loading ? 'جاري الإرسال...' : `إرسال عبر واتساب (${selectedStudentIds.length})`}
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
      {showAlert && (
        <CustomAlert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  )
}
