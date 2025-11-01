import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Save, User } from 'lucide-react'

interface ProfileSettingsProps {
  onClose: () => void
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [teacherPhone, setTeacherPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [profileId, setProfileId] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('teacher_profile')
        .select('*')
        .maybeSingle()

      if (profile) {
        setProfileId(profile.id)
        setTeacherName(profile.name || '')
        setTeacherPhone(profile.phone || '')
        setSchoolName(profile.school_name || '')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (profileId) {
        await supabase
          .from('teacher_profile')
          .update({
            name: teacherName,
            phone: teacherPhone,
            school_name: schoolName,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profileId)
      }

      onClose()
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="text-blue-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">الإعدادات</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="bg-blue-50 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              معلومات المرشد الطلابي
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المرشد الطلابي
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="أدخل اسم المرشد الطلابي"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رقم الجوال
              </label>
              <input
                type="tel"
                value={teacherPhone}
                onChange={(e) => setTeacherPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="05xxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المدرسة / المؤسسة التعليمية
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: مدرسة الملك فهد الثانوية"
              />
            </div>
          </div>


          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={20} />
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
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
