import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { X, Save, User, Trash2, AlertTriangle, Lock, Key } from 'lucide-react'

interface ProfileSettingsProps {
  onClose: () => void
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [teacherPhone, setTeacherPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [profileId, setProfileId] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentUsername, setCurrentUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const profile = await db.teacher_profile.toCollection().first()

      if (profile) {
        setProfileId(profile.id || '')
        setTeacherName(profile.name || '')
        setTeacherPhone(profile.phone || '')
        setSchoolName(profile.school_name || '')
      }

      // Fetch current username
      const credentials = await db.login_credentials.limit(1).first()

      if (credentials) {
        setCurrentUsername(credentials.username)
        setNewUsername(credentials.username)
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
        await db.teacher_profile.update(profileId, {
          name: teacherName,
          phone: teacherPhone,
          school_name: schoolName,
        })
      } else {
        const newId = crypto.randomUUID()
        await db.teacher_profile.add({
          id: newId,
          name: teacherName,
          phone: teacherPhone,
          school_name: schoolName,
          created_at: new Date().toISOString(),
        })
        setProfileId(newId)
      }

      alert('تم حفظ البيانات بنجاح')
      onClose()
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('حدث خطأ في حفظ البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور غير متطابقة')
      return
    }

    if (newPassword.length < 4) {
      setPasswordError('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
      return
    }

    setPasswordLoading(true)

    try {
      const credentials = await db.login_credentials.where('username').equals(currentUsername).first()

      if (credentials && credentials.id) {
        await db.login_credentials.update(credentials.id, {
          username: newUsername,
          password_hash: newPassword,
          updated_at: new Date().toISOString()
        })

        alert('تم تغيير بيانات الدخول بنجاح!')
        setCurrentUsername(newUsername)
        setShowPasswordSection(false)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPasswordError('لم يتم العثور على بيانات الدخول')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordError('حدث خطأ أثناء تغيير بيانات الدخول')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleResetDatabase = async () => {
    setResetLoading(true)
    try {
      await db.students.clear()
      await db.groups.clear()
      await db.special_statuses.clear()
      await db.student_visits.clear()
      await db.student_permissions.clear()
      await db.student_violations.clear()

      alert('تم حذف جميع البيانات بنجاح! يمكنك الآن رفع ملف إكسل جديد.')
      setShowResetConfirm(false)
      onClose()
      window.location.reload()
    } catch (error) {
      console.error('Error resetting database:', error)
      alert('حدث خطأ أثناء حذف البيانات')
    } finally {
      setResetLoading(false)
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

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <Lock className="text-green-600 flex-shrink-0 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-900 mb-2">
                  إعدادات تسجيل الدخول
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  يمكنك تغيير اسم المستخدم وكلمة المرور من هنا
                </p>

                {!showPasswordSection ? (
                  <button
                    type="button"
                    onClick={() => setShowPasswordSection(true)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <Key size={18} />
                    تغيير بيانات الدخول
                  </button>
                ) : (
                  <div className="space-y-4 bg-white rounded-lg p-4 border border-green-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم المستخدم الجديد
                      </label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="أدخل اسم المستخدم الجديد"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        كلمة المرور الجديدة
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="أدخل كلمة المرور الجديدة"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        تأكيد كلمة المرور
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="أعد إدخال كلمة المرور"
                        required
                      />
                    </div>

                    {passwordError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">{passwordError}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleChangePassword}
                        disabled={passwordLoading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                      >
                        {passwordLoading ? 'جاري التغيير...' : 'حفظ التغييرات'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordSection(false)
                          setPasswordError('')
                          setNewPassword('')
                          setConfirmPassword('')
                          setNewUsername(currentUsername)
                        }}
                        className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="text-xl font-bold text-red-900 mb-2">
                  تصفير قاعدة البيانات
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  تحذير: سيتم حذف جميع البيانات بشكل نهائي (الطلاب، الفصول، الزيارات، الاستئذانات، المخالفات).
                  هذا الإجراء لا يمكن التراجع عنه!
                </p>
                <p className="text-sm text-gray-700">
                  استخدم هذا الخيار في نهاية العام الدراسي لتصفير النظام والبدء من جديد.
                </p>
              </div>
            </div>

            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 size={20} />
                تصفير قاعدة البيانات
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3">
                  <p className="text-sm font-bold text-yellow-900 text-center">
                    هل أنت متأكد من حذف جميع البيانات؟
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleResetDatabase}
                    disabled={resetLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    {resetLoading ? 'جاري الحذف...' : 'نعم، احذف جميع البيانات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 rounded-lg transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
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
