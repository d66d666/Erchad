import { useState, useEffect } from 'react'
import { db } from '../lib/db'
import { X, Save, User, Trash2, AlertTriangle, Lock, Key, ChevronDown, Calendar } from 'lucide-react'
import { formatSubscriptionDate, getDaysRemaining, isSubscriptionActive } from '../lib/licenseKey'

interface ProfileSettingsProps {
  onClose: () => void
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [teacherPhone, setTeacherPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [systemDescription, setSystemDescription] = useState('')
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
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState('disabled')
  const [deleteOptions, setDeleteOptions] = useState({
    students: false,
    teachers: false,
    specialStatuses: false,
    visits: false,
    permissions: false,
    violations: false,
    profile: false,
    all: false,
  })
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string>('')
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<string>('')
  const [isDeveloper, setIsDeveloper] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const userId = localStorage.getItem('userId')
      if (!userId) return

      // جلب إعدادات auto logout لجميع المستخدمين
      const savedTimeout = localStorage.getItem('autoLogoutMinutes')
      if (savedTimeout) {
        setAutoLogoutMinutes(savedTimeout)
      }

      // جلب بيانات المستخدم الحالي فقط
      const credentials = await db.login_credentials.get(userId)

      if (credentials) {
        setCurrentUsername(credentials.username)
        setNewUsername(credentials.username)

        // تحقق إذا كان المستخدم مطور
        if (credentials.username === 'admin') {
          setIsDeveloper(true)
          // لا نحتاج لجلب ملف شخصي أو اشتراك للمطور
          return
        }
      }

      // جلب الملف الشخصي
      const profile = await db.teacher_profile.get(userId)

      if (profile) {
        setProfileId(profile.id || '')
        setTeacherName(profile.name || '')
        setTeacherPhone(profile.phone || '')
        setSchoolName(profile.school_name || '')
        setSystemDescription(profile.system_description || '')
      } else {
        setTeacherName('')
        setTeacherPhone('')
        setSchoolName('')
        setSystemDescription('')
      }

      // جلب الاشتراك
      const subscription = await db.subscription
        .where('school_id')
        .equals(userId)
        .first()

      if (subscription) {
        setSubscriptionStartDate(subscription.start_date)
        setSubscriptionEndDate(subscription.end_date)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // حفظ إعدادات auto logout للجميع
      localStorage.setItem('autoLogoutMinutes', autoLogoutMinutes)

      // المطور لا يحتاج لحفظ ملف شخصي
      if (isDeveloper) {
        alert('تم حفظ الإعدادات بنجاح')
        onClose()
        window.location.reload()
        return
      }

      const profileData = {
        name: teacherName,
        phone: teacherPhone,
        school_name: schoolName,
        system_description: systemDescription,
      }

      if (profileId) {
        await db.teacher_profile.update(profileId, profileData)
      } else {
        const newId = crypto.randomUUID()
        const newProfile = {
          id: newId,
          ...profileData,
          created_at: new Date().toISOString(),
        }

        await db.teacher_profile.add(newProfile)
        setProfileId(newId)
      }

      alert('تم حفظ البيانات بنجاح')
      onClose()
      window.location.reload()
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
      const localCreds = await db.login_credentials.where('username').equals(currentUsername).first()

      if (localCreds && localCreds.id) {
        await db.login_credentials.update(localCreds.id, {
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

  const handleDeleteOptionChange = (option: keyof typeof deleteOptions) => {
    if (option === 'all') {
      const newValue = !deleteOptions.all
      setDeleteOptions({
        students: newValue,
        teachers: newValue,
        specialStatuses: newValue,
        visits: newValue,
        permissions: newValue,
        violations: newValue,
        profile: newValue,
        all: newValue,
      })
    } else {
      setDeleteOptions(prev => ({
        ...prev,
        [option]: !prev[option],
        all: false,
      }))
    }
  }

  const handleResetDatabase = async () => {
    if (!deleteOptions.students && !deleteOptions.teachers && !deleteOptions.specialStatuses &&
        !deleteOptions.visits && !deleteOptions.permissions && !deleteOptions.violations &&
        !deleteOptions.profile && !deleteOptions.all) {
      alert('الرجاء اختيار البيانات المراد حذفها')
      return
    }

    setResetLoading(true)
    try {
      if (deleteOptions.violations || deleteOptions.all) {
        await db.student_violations.clear()
      }

      if (deleteOptions.permissions || deleteOptions.all) {
        await db.student_permissions.clear()
      }

      if (deleteOptions.visits || deleteOptions.all) {
        await db.student_visits.clear()
      }

      if (deleteOptions.students || deleteOptions.all) {
        await db.students.clear()
      }

      if (deleteOptions.teachers || deleteOptions.all) {
        await db.teacher_groups.clear()
        await db.teachers.clear()
      }

      if (deleteOptions.specialStatuses || deleteOptions.all) {
        await db.special_statuses.clear()
      }

      if (deleteOptions.all) {
        await db.groups.clear()
      }

      if (deleteOptions.profile || deleteOptions.all) {
        await db.teacher_profile.clear()
      }

      alert('تم حذف البيانات المحددة بنجاح!')
      setShowResetConfirm(false)
      setDeleteOptions({
        students: false,
        teachers: false,
        specialStatuses: false,
        visits: false,
        permissions: false,
        violations: false,
        profile: false,
        all: false,
      })
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
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">إعداد</h2>
            <User className="text-blue-600" size={24} />
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {isDeveloper && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-600">
                    <User className="text-white" size={16} />
                  </div>
                  <h3 className="text-base font-bold text-blue-900">
                    حساب المطور
                  </h3>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                  ✓ مطور
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2">
                <p className="text-xs text-blue-800 text-center font-semibold">
                  حساب مطور النظام - الصلاحيات الكاملة بدون حاجة لاشتراك
                </p>
              </div>
            </div>
          )}

          {!isDeveloper && subscriptionEndDate && (
            <div className={`${
              isSubscriptionActive(subscriptionEndDate)
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
                : 'bg-gradient-to-br from-red-50 to-orange-50 border border-red-200'
            } rounded-lg p-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    isSubscriptionActive(subscriptionEndDate)
                      ? 'bg-green-600'
                      : 'bg-red-600'
                  }`}>
                    <Calendar className="text-white" size={16} />
                  </div>
                  <h3 className={`text-base font-bold ${
                    isSubscriptionActive(subscriptionEndDate)
                      ? 'text-green-900'
                      : 'text-red-900'
                  }`}>
                    حالة الاشتراك
                  </h3>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isSubscriptionActive(subscriptionEndDate)
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}>
                  {isSubscriptionActive(subscriptionEndDate) ? '✓ نشط' : '✗ منتهي'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2">
                  <label className="block text-xs font-medium text-gray-600 mb-0.5 text-right">
                    تاريخ بداية الاشتراك
                  </label>
                  <div className="text-sm font-bold text-gray-800 text-right">
                    {formatSubscriptionDate(subscriptionStartDate)}
                  </div>
                </div>

                <div className="bg-white/70 backdrop-blur-sm rounded-lg p-2">
                  <label className="block text-xs font-medium text-gray-600 mb-0.5 text-right">
                    تاريخ انتهاء الاشتراك
                  </label>
                  <div className="text-sm font-bold text-gray-800 text-right">
                    {formatSubscriptionDate(subscriptionEndDate)}
                  </div>
                </div>

                {isSubscriptionActive(subscriptionEndDate) && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-2">
                    <p className="text-xs text-green-800 text-center font-semibold">
                      {getDaysRemaining(subscriptionEndDate) > 0
                        ? `باقي ${getDaysRemaining(subscriptionEndDate)} يوم على انتهاء الاشتراك`
                        : 'ينتهي الاشتراك اليوم'
                      }
                    </p>
                  </div>
                )}

                {!isSubscriptionActive(subscriptionEndDate) && (
                  <div className="bg-red-100 border border-red-300 rounded-lg p-2">
                    <p className="text-xs text-red-800 text-center font-semibold">
                      انتهى الاشتراك - يرجى التواصل مع المطور للتجديد
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isDeveloper && (
            <div className="bg-blue-50 rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-right">
                معلومات النظام
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  اسم مسؤول النظام
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  placeholder="أدخل اسم مسؤول النظام"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  رقم الجوال
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  وصف النظام
                </label>
                <input
                  type="text"
                  value={systemDescription}
                  onChange={(e) => setSystemDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  placeholder="مثال: نظام إدارة شاملة لبيانات الطلاب"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  اسم المدرسة
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                  placeholder="مثال: مدرسة الملك عبدالله الابتدائية"
                />
              </div>
            </div>
          )}

          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <Lock className="text-purple-600 flex-shrink-0" size={24} />
                  <h3 className="text-xl font-bold text-purple-900">
                    تسجيل الخروج التلقائي
                  </h3>
                </div>
                <p className="text-sm text-purple-700 mb-4 text-right">
                  حدد المدة الزمنية التي يتم بعدها تسجيل الخروج تلقائياً في حالة عدم النشاط لحماية بيانات الطلاب
                </p>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    مدة عدم النشاط قبل تسجيل الخروج
                  </label>
                  <select
                    value={autoLogoutMinutes}
                    onChange={(e) => setAutoLogoutMinutes(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right appearance-none cursor-pointer"
                  >
                    <option value="disabled">معطل - عدم تسجيل الخروج التلقائي</option>
                    <option value="5">5 دقائق</option>
                    <option value="10">10 دقائق</option>
                    <option value="15">15 دقيقة</option>
                    <option value="30">30 دقيقة</option>
                    <option value="60">ساعة واحدة</option>
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 translate-y-1 text-gray-500 pointer-events-none" size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <Lock className="text-green-600 flex-shrink-0" size={24} />
                  <h3 className="text-xl font-bold text-green-900">
                    إعدادات تسجيل الدخول
                  </h3>
                </div>
                <p className="text-sm text-green-700 mb-4 text-right">
                  يمكنك تغيير اسم المستخدم وكلمة المرور من هنا
                </p>
                <button
                  type="button"
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                >
                  <Key size={18} />
                  تغيير بيانات الدخول
                </button>
              </div>
            </div>
          </div>

          {showPasswordSection && (
            <div className="bg-white border-2 border-green-200 rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  اسم المستخدم الجديد
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
                  placeholder="أدخل اسم المستخدم الجديد"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
                  placeholder="أعد إدخال كلمة المرور"
                  required
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 text-right">{passwordError}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordSection(false)
                    setPasswordError('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setNewUsername(currentUsername)
                  }}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {passwordLoading ? 'جاري التغيير...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="text-red-600 flex-shrink-0" size={24} />
                  <h3 className="text-xl font-bold text-red-900">
                    تصفير قاعدة البيانات
                  </h3>
                </div>
                <p className="text-sm text-red-700 mb-2 text-right">
                  تحذير: سيتم حذف جميع البيانات بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه!
                </p>
                <p className="text-sm text-gray-700 text-right">
                  استخدم هذا الخيار في نهاية العام الدراسي لتصفير النظام والبدء من جديد.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                اختر البيانات المراد حذفها:
              </label>

              <div className="bg-white rounded-lg p-4 space-y-2">
                <label className="flex items-center justify-end gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">الطلاب</span>
                  <input
                    type="checkbox"
                    checked={deleteOptions.students}
                    onChange={() => handleDeleteOptionChange('students')}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-end gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">المعلمين</span>
                  <input
                    type="checkbox"
                    checked={deleteOptions.teachers}
                    onChange={() => handleDeleteOptionChange('teachers')}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-end gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">الحالات الخاصة</span>
                  <input
                    type="checkbox"
                    checked={deleteOptions.specialStatuses}
                    onChange={() => handleDeleteOptionChange('specialStatuses')}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-end gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">استقبال الطلاب</span>
                  <input
                    type="checkbox"
                    checked={deleteOptions.visits}
                    onChange={() => handleDeleteOptionChange('visits')}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-end gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">الاستئذانات</span>
                  <input
                    type="checkbox"
                    checked={deleteOptions.permissions}
                    onChange={() => handleDeleteOptionChange('permissions')}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-end gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">المخالفات</span>
                  <input
                    type="checkbox"
                    checked={deleteOptions.violations}
                    onChange={() => handleDeleteOptionChange('violations')}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <label className="flex items-center justify-end gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">معلومات النظام</span>
                  <input
                    type="checkbox"
                    checked={deleteOptions.profile}
                    onChange={() => handleDeleteOptionChange('profile')}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                  />
                </label>

                <div className="border-t pt-2 mt-2">
                  <label className="flex items-center justify-end gap-3 cursor-pointer hover:bg-purple-50 p-2 rounded">
                    <span className="text-sm font-bold text-purple-700">جميع البيانات</span>
                    <input
                      type="checkbox"
                      checked={deleteOptions.all}
                      onChange={() => handleDeleteOptionChange('all')}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                  </label>
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
                      هل أنت متأكد من حذف البيانات المحددة؟
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 rounded-lg transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDatabase}
                      disabled={resetLoading}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                      {resetLoading ? 'جاري الحذف...' : 'نعم، احذف البيانات'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Save size={20} />
              {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
