import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Check, School, User, Key, Layers, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react'
import { db } from '../lib/db'

interface SetupWizardProps {
  onComplete: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [schoolName, setSchoolName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminPhone, setAdminPhone] = useState('')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [stages, setStages] = useState<Record<string, boolean>>({
    'أول ابتدائي': false,
    'ثاني ابتدائي': false,
    'ثالث ابتدائي': false,
    'رابع ابتدائي': false,
    'خامس ابتدائي': false,
    'سادس ابتدائي': false,
    'أول متوسط': false,
    'ثاني متوسط': false,
    'ثالث متوسط': false,
    'الأول الثانوي': false,
    'الثاني الثانوي': false,
    'الثالث الثانوي': false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const totalSteps = 4

  const validateStep = () => {
    setError('')

    if (currentStep === 1) {
      if (!schoolName.trim()) {
        setError('يرجى إدخال اسم المدرسة')
        return false
      }
      if (!adminName.trim()) {
        setError('يرجى إدخال اسم المسؤول')
        return false
      }
    }

    if (currentStep === 2) {
      if (!username.trim() || username.length < 3) {
        setError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
        return false
      }
      if (!password.trim() || password.length < 4) {
        setError('كلمة المرور يجب أن تكون 4 أحرف على الأقل')
        return false
      }
      if (password !== confirmPassword) {
        setError('كلمة المرور غير متطابقة')
        return false
      }
    }

    if (currentStep === 3) {
      const selectedStages = Object.values(stages).filter(v => v).length
      if (selectedStages === 0) {
        setError('يرجى اختيار صف واحد على الأقل')
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1)
      } else {
        handleComplete()
      }
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')

    try {
      const userId = crypto.randomUUID()

      await db.teacher_profile.add({
        id: userId,
        name: adminName.trim(),
        phone: adminPhone.trim(),
        school_name: schoolName.trim(),
        description: 'مسؤول النظام',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      await db.login_credentials.add({
        id: userId,
        username: username.trim(),
        password_hash: password.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      let displayOrder = 1
      for (const [stageName, isSelected] of Object.entries(stages)) {
        if (isSelected) {
          await db.groups.add({
            id: crypto.randomUUID(),
            stage: stageName,
            name: 'مجموعة 1',
            display_order: displayOrder++,
            created_at: new Date().toISOString()
          })
        }
      }

      const defaultStatuses = [
        { name: 'متعثر دراسياً', color: '#ef4444' },
        { name: 'حالة صحية', color: '#f59e0b' },
        { name: 'حالة اجتماعية', color: '#3b82f6' },
        { name: 'موهوب', color: '#10b981' },
      ]

      for (const status of defaultStatuses) {
        await db.special_statuses.add({
          id: crypto.randomUUID(),
          name: status.name,
          color: status.color,
          created_at: new Date().toISOString()
        })
      }

      localStorage.setItem('setupCompleted', 'true')
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userId', userId)

      onComplete()
    } catch (err) {
      console.error('Setup error:', err)
      setError('حدث خطأ أثناء الإعداد')
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 border-4 border-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 border-4 border-white rounded-full translate-x-1/2 translate-y-1/2"></div>
          </div>

          <div className="relative z-10">
            <School size={64} className="mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">مرحباً بك في نظام إدارة الطلاب</h1>
            <p className="text-xl opacity-90">دعنا نبدأ بإعداد النظام في خطوات بسيطة</p>
          </div>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg transition-all ${
                  currentStep > step
                    ? 'bg-green-500 text-white'
                    : currentStep === step
                    ? 'bg-blue-600 text-white scale-110 shadow-lg'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step ? <Check size={24} /> : step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                )}
              </div>
            ))}
          </div>

          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-8">
                  <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <School size={40} className="text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">معلومات المدرسة</h2>
                  <p className="text-gray-600">أدخل بيانات مدرستك الأساسية</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2 text-right">
                    اسم المدرسة *
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-right text-lg"
                    placeholder="مثال: مدرسة النور الابتدائية"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2 text-right">
                    اسم مسؤول النظام *
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-right text-lg"
                    placeholder="مثال: أحمد محمد"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2 text-right">
                    رقم الجوال (اختياري)
                  </label>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-right text-lg"
                    placeholder="05XXXXXXXX"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-8">
                  <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key size={40} className="text-purple-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">إنشاء حساب المسؤول</h2>
                  <p className="text-gray-600">قم بإنشاء حسابك لتسجيل الدخول إلى النظام</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2 text-right">
                    اسم المستخدم *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 text-right text-lg"
                    placeholder="اسم المستخدم"
                  />
                  <p className="text-sm text-gray-500 mt-1 text-right">3 أحرف على الأقل</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2 text-right">
                    كلمة المرور *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 text-right text-lg"
                    placeholder="كلمة المرور"
                  />
                  <p className="text-sm text-gray-500 mt-1 text-right">4 أحرف على الأقل</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2 text-right">
                    تأكيد كلمة المرور *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 text-right text-lg"
                    placeholder="أعد إدخال كلمة المرور"
                  />
                </div>

                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                    <div className="text-sm text-yellow-800">
                      <p className="font-bold mb-1">تنبيه مهم:</p>
                      <p>احفظ بيانات تسجيل الدخول في مكان آمن. لن تتمكن من الدخول للنظام بدونها!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-8">
                  <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layers size={40} className="text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">اختيار الصفوف الدراسية</h2>
                  <p className="text-gray-600">حدد الصفوف الموجودة في مدرستك</p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <BookOpen className="text-blue-600" size={20} />
                    <p className="text-sm text-blue-800">اختر الصفوف التي تحتاجها. سيتم إنشاء مجموعة افتراضية لكل صف.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-2">
                  {Object.keys(stages).map((stage) => (
                    <button
                      key={stage}
                      onClick={() => setStages({ ...stages, [stage]: !stages[stage] })}
                      className={`p-4 rounded-xl border-2 transition-all text-right font-bold ${
                        stages[stage]
                          ? 'bg-green-500 border-green-600 text-white shadow-lg scale-105'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{stage}</span>
                        {stages[stage] && <CheckCircle2 size={20} />}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    تم اختيار {Object.values(stages).filter(v => v).length} من {Object.keys(stages).length} صف
                  </p>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-8">
                  <div className="bg-pink-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={40} className="text-pink-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">مراجعة البيانات</h2>
                  <p className="text-gray-600">تأكد من صحة البيانات قبل البدء</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5">
                    <h3 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
                      <School size={20} />
                      معلومات المدرسة
                    </h3>
                    <div className="space-y-2 text-right">
                      <p className="text-gray-700"><span className="font-bold">الاسم:</span> {schoolName}</p>
                      <p className="text-gray-700"><span className="font-bold">المسؤول:</span> {adminName}</p>
                      {adminPhone && <p className="text-gray-700"><span className="font-bold">الجوال:</span> {adminPhone}</p>}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl p-5">
                    <h3 className="font-bold text-purple-900 mb-3 text-lg flex items-center gap-2">
                      <User size={20} />
                      بيانات الدخول
                    </h3>
                    <div className="space-y-2 text-right">
                      <p className="text-gray-700"><span className="font-bold">اسم المستخدم:</span> {username}</p>
                      <p className="text-gray-700"><span className="font-bold">كلمة المرور:</span> {'•'.repeat(password.length)}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 rounded-xl p-5">
                    <h3 className="font-bold text-green-900 mb-3 text-lg flex items-center gap-2">
                      <Layers size={20} />
                      الصفوف المختارة ({Object.values(stages).filter(v => v).length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stages)
                        .filter(([_, selected]) => selected)
                        .map(([stage]) => (
                          <span key={stage} className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {stage}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-600 flex-shrink-0 mt-1" size={20} />
                    <div className="text-sm text-green-800">
                      <p className="font-bold mb-1">جاهز للبدء!</p>
                      <p>سيتم إنشاء حسابك وإعداد النظام بشكل تلقائي. يمكنك إضافة المزيد من البيانات لاحقاً.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-4 animate-shake">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                disabled={loading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ChevronRight size={20} />
                السابق
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className={`flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${
                currentStep === 1 ? 'w-full' : ''
              }`}
            >
              {loading ? (
                'جاري الإعداد...'
              ) : currentStep === totalSteps ? (
                <>
                  <Check size={20} />
                  إنهاء الإعداد والبدء
                </>
              ) : (
                <>
                  التالي
                  <ChevronLeft size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 text-center text-gray-600 text-sm border-t">
          <p>نظام إدارة الطلاب • الأستاذ وائل الفيفي</p>
        </div>
      </div>
    </div>
  )
}
