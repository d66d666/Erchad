import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Group, SpecialStatus } from '../types'
import { Plus, X } from 'lucide-react'

interface AddStudentModalProps {
  groups: Group[]
  specialStatuses: SpecialStatus[]
  onClose: () => void
  onStudentAdded: () => void
}

export function AddStudentModal({
  groups,
  specialStatuses,
  onClose,
  onStudentAdded,
}: AddStudentModalProps) {
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

      const { error: insertError } = await supabase
        .from('students')
        .insert(data)

      if (insertError) throw insertError

      onStudentAdded()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ ما')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plus size={28} />
            <h2 className="text-2xl font-bold">إضافة طالب جديد</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border-2 border-red-400 text-red-700 rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                اسم الطالب <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="أدخل اسم الطالب الكامل"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                السجل المدني <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.national_id}
                onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="أدخل رقم السجل المدني"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  رقم جوال الطالب (اختياري)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  رقم جوال ولي الأمر <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.guardian_phone}
                  onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="05xxxxxxxx"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  المرحلة <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.grade}
                  onChange={(e) => {
                    setFormData({ ...formData, grade: e.target.value, group_id: '' })
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg cursor-pointer"
                >
                  <option value="">اختر المرحلة</option>
                  {stages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  المجموعة <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.group_id}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg cursor-pointer"
                  disabled={!formData.grade}
                >
                  <option value="">اختر المجموعة</option>
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
              <label className="block text-sm font-bold text-gray-700 mb-2">
                الحالة الخاصة (اختياري)
              </label>
              <select
                value={formData.special_status_id}
                onChange={(e) =>
                  setFormData({ ...formData, special_status_id: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg cursor-pointer"
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

          <div className="flex gap-3 mt-8">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-md"
            >
              <Plus size={24} />
              {loading ? 'جاري الإضافة...' : 'إضافة الطالب'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-4 px-6 rounded-xl transition-colors text-lg"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
