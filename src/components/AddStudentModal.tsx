import { useState, useEffect } from 'react'
import { Group, SpecialStatus, Student } from '../types'
import { X } from 'lucide-react'
import { db } from '../lib/db'
import { CustomAlert } from './CustomAlert'

interface AddStudentModalProps {
  onClose: () => void
  preselectedGroupId?: string
  onStudentAdded?: (newStudent: Student) => void | Promise<void>
}

export function AddStudentModal({
  onClose,
  preselectedGroupId,
  onStudentAdded,
}: AddStudentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [groups, setGroups] = useState<Group[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  const preselectedGroup = preselectedGroupId ? groups.find(g => g.id === preselectedGroupId) : null

  const [formData, setFormData] = useState({
    name: '',
    national_id: '',
    phone: '',
    guardian_phone: '',
    grade: preselectedGroup?.stage || '',
    group_id: preselectedGroupId || '',
    special_status_id: '',
  })

  useEffect(() => {
    fetchGroupsAndStatuses()
  }, [])

  useEffect(() => {
    if (preselectedGroupId && preselectedGroup) {
      setFormData(prev => ({
        ...prev,
        grade: preselectedGroup.stage,
        group_id: preselectedGroupId,
      }))
    }
  }, [preselectedGroupId, preselectedGroup])

  const fetchGroupsAndStatuses = async () => {
    const groupsData = await db.groups.orderBy('display_order').toArray()
    const statusesData = await db.special_statuses.toArray()

    setGroups(groupsData)
    setSpecialStatuses(statusesData)
  }

  const stages = Array.from(new Set(groups.map(g => g.stage)))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.name.trim()) {
        setError('يجب إدخال اسم الطالب')
        setLoading(false)
        return
      }

      if (!formData.national_id.trim()) {
        setError('يجب إدخال السجل المدني')
        setLoading(false)
        return
      }

      if (!formData.guardian_phone.trim()) {
        setError('يجب إدخال رقم جوال ولي الأمر')
        setLoading(false)
        return
      }

      if (!formData.grade) {
        setError('يجب اختيار المرحلة')
        setLoading(false)
        return
      }

      if (!formData.group_id) {
        setError('يجب اختيار المجموعة')
        setLoading(false)
        return
      }

      const data = {
        name: formData.name.trim(),
        national_id: formData.national_id.trim(),
        phone: formData.phone.trim() || '',
        guardian_phone: formData.guardian_phone.trim(),
        grade: formData.grade,
        group_id: formData.group_id,
        special_status_id: formData.special_status_id || null,
      }

      const newId = crypto.randomUUID()
      const newStudent = {
        id: newId,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      await db.students.add(newStudent)

      // تحديث البيانات في الصفحة الرئيسية أولاً
      if (onStudentAdded) {
        await onStudentAdded(newStudent as Student)
      }

      setAlertMessage('تم إضافة الطالب بنجاح')
      setShowAlert(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {showAlert && (
        <CustomAlert
          message={alertMessage}
          type="success"
          onClose={() => {
            setShowAlert(false)
            onClose()
          }}
        />
      )}

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
          <h2 className="text-xl font-bold">إضافة طالب جديد</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                اسم الطالب
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                placeholder="الياس"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                السجل المدني
              </label>
              <input
                type="text"
                required
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.national_id}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '')
                  setFormData(prev => ({ ...prev, national_id: value }))
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                placeholder="12564646"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  جوال الطالب
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.phone}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '')
                    setFormData(prev => ({ ...prev, phone: numericValue }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  placeholder="555555465"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  جوال ولي الأمر
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.guardian_phone}
                  onChange={(e) => {
                    const numericValue = e.target.value.replace(/[^0-9]/g, '')
                    setFormData(prev => ({ ...prev, guardian_phone: numericValue }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                  placeholder="565464644"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  الصف
                </label>
                <select
                  required
                  value={formData.grade}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, grade: e.target.value, group_id: '' }))
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right appearance-none bg-white"
                >
                  <option value="">-- اختر الصف --</option>
                  {stages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  المجموعة
                </label>
                <select
                  required
                  value={formData.group_id}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, group_id: e.target.value }))
                  }}
                  disabled={!formData.grade}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- اختر المجموعة --</option>
                  {groups
                    .filter(g => g.stage === formData.grade)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                الحالة الخاصة (اختياري)
              </label>
              <select
                value={formData.special_status_id}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, special_status_id: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right appearance-none bg-white"
              >
                <option value="">بدون حالة خاصة</option>
                {specialStatuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ الطالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}
