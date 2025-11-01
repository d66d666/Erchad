import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Group, SpecialStatus, Student } from '../types'
import { X } from 'lucide-react'

interface EditStudentModalProps {
  student: Student
  groups: Group[]
  specialStatuses: SpecialStatus[]
  onClose: () => void
  onStudentUpdated: () => void
}

export function EditStudentModal({
  student,
  groups,
  specialStatuses,
  onClose,
  onStudentUpdated,
}: EditStudentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: student.name,
    national_id: student.national_id,
    phone: student.phone,
    guardian_phone: student.guardian_phone,
    grade: student.grade,
    group_id: student.group_id,
    special_status_id: student.special_status_id || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = {
        name: formData.name,
        national_id: formData.national_id,
        phone: formData.phone,
        guardian_phone: formData.guardian_phone,
        grade: formData.grade,
        group_id: formData.group_id,
        special_status_id: formData.special_status_id || null,
      }

      const { error: updateError } = await supabase
        .from('students')
        .update(data)
        .eq('id', student.id)

      if (updateError) throw updateError

      onStudentUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">تعديل الطالب</h2>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      اسم الطالب
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      السجل المدني
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.national_id}
                      onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      جوال الطالب
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      جوال ولي الأمر
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.guardian_phone}
                      onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      الصف
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      المجموعة
                    </label>
                    <select
                      required
                      value={formData.group_id}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white"
                    >
                      <option value="">اختر مجموعة</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      الحالة الخاصة (اختياري)
                    </label>
                    <select
                      value={formData.special_status_id}
                      onChange={(e) =>
                        setFormData({ ...formData, special_status_id: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg bg-white"
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

                <div className="flex gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {loading ? 'جاري الحفظ...' : 'تحديث الطالب'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-8 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-xl text-lg transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
