import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Group, SpecialStatus, Student } from '../types'
import { Plus, X } from 'lucide-react'

interface StudentFormProps {
  groups: Group[]
  specialStatuses: SpecialStatus[]
  onStudentAdded: () => void
  editingStudent?: Student
  onEditingStudentChange: (student?: Student) => void
}

export function StudentForm({
  groups,
  specialStatuses,
  onStudentAdded,
  editingStudent,
  onEditingStudentChange,
}: StudentFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    national_id: '',
    phone: '',
    guardian_phone: '',
    grade: '',
    group_id: '',
    special_status_id: '',
  })

  useEffect(() => {
    if (editingStudent) {
      setFormData({
        name: editingStudent.name,
        national_id: editingStudent.national_id,
        phone: editingStudent.phone,
        guardian_phone: editingStudent.guardian_phone,
        grade: editingStudent.grade,
        group_id: editingStudent.group_id,
        special_status_id: editingStudent.special_status_id || '',
      })
    }
  }, [editingStudent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.group_id) {
        setError('يجب اختيار مجموعة')
        setLoading(false)
        return
      }

      const data = {
        name: formData.name,
        national_id: formData.national_id,
        phone: formData.phone,
        guardian_phone: formData.guardian_phone,
        grade: formData.grade,
        group_id: formData.group_id,
        special_status_id: formData.special_status_id || null,
      }

      if (editingStudent) {
        const { error: updateError } = await supabase
          .from('students')
          .update(data)
          .eq('id', editingStudent.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('students')
          .insert(data)

        if (insertError) throw insertError
      }

      setFormData({
        name: '',
        national_id: '',
        phone: '',
        guardian_phone: '',
        grade: '',
        group_id: '',
        special_status_id: '',
      })
      onEditingStudentChange(undefined)
      onStudentAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {editingStudent ? 'تعديل الطالب' : 'إضافة طالب جديد'}
        </h2>
        {editingStudent && (
          <button
            onClick={() => onEditingStudentChange(undefined)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم الطالب
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              السجل المدني
            </label>
            <input
              type="text"
              required
              value={formData.national_id}
              onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              جوال الطالب
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              جوال ولي الأمر
            </label>
            <input
              type="tel"
              required
              value={formData.guardian_phone}
              onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الصف
            </label>
            <input
              type="text"
              required
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المجموعة
            </label>
            <select
              required
              value={formData.group_id}
              onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر مجموعة</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الحالة الخاصة (اختياري)
            </label>
            <select
              value={formData.special_status_id}
              onChange={(e) =>
                setFormData({ ...formData, special_status_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          {loading
            ? 'جاري...'
            : editingStudent
              ? 'تحديث الطالب'
              : 'إضافة الطالب'}
        </button>
      </form>
    </div>
  )
}
