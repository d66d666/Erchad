import { useState } from 'react'
import { db } from '../lib/db'
import { Lock, User, Eye, EyeOff, GraduationCap, AlertCircle } from 'lucide-react'

interface LoginPageProps {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetStep, setResetStep] = useState<'token' | 'password'>('token')
  const [resetMessage, setResetMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check hidden master account first
      if (username === 'Wael' && password === '0558890902') {
        localStorage.setItem('isLoggedIn', 'true')
        localStorage.setItem('userId', 'master-admin')
        onLogin()
        return
      }

      const credentials = await db.login_credentials
        .where('username').equals(username)
        .and(cred => cred.password_hash === password)
        .first()

      if (!credentials) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
        return
      }

      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userId', credentials.id || 'user')
      onLogin()
    } catch (err) {
      console.error('Login error:', err)
      setError('حدث خطأ أثناء تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const generateResetToken = async () => {
    setError('')
    setResetMessage('')
    setLoading(true)

    try {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1)

      const credentials = await db.login_credentials.where('username').equals(username).first()

      if (!credentials || !credentials.id) {
        setError('اسم المستخدم غير موجود')
        return
      }

      await db.login_credentials.update(credentials.id, {
        reset_token: token,
        reset_token_expires: expiresAt.toISOString(),
      })

      setResetMessage(`رمز الاستعادة الخاص بك هو: ${token}\n(صالح لمدة ساعة واحدة)`)
      setResetStep('password')
    } catch (err) {
      console.error('Generate token error:', err)
      setError('حدث خطأ أثناء إنشاء رمز الاستعادة')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResetMessage('')
    setLoading(true)

    try {
      const credentials = await db.login_credentials
        .where('username').equals(username)
        .and(cred => cred.reset_token === resetToken)
        .first()

      if (!credentials) {
        setError('الرمز غير صحيح')
        return
      }

      if (credentials.reset_token_expires) {
        const tokenExpires = new Date(credentials.reset_token_expires)
        if (tokenExpires < new Date()) {
          setError('انتهت صلاحية الرمز')
          return
        }
      }

      if (credentials.id) {
        await db.login_credentials.update(credentials.id, {
          password_hash: newPassword,
          reset_token: null,
          reset_token_expires: null,
          updated_at: new Date().toISOString()
        })
      }

      setResetMessage('تم تغيير كلمة المرور بنجاح!')
      setTimeout(() => {
        setShowForgotPassword(false)
        setResetStep('token')
        setResetToken('')
        setNewPassword('')
        setResetMessage('')
      }, 2000)
    } catch (err) {
      console.error('Reset password error:', err)
      setError('حدث خطأ أثناء تغيير كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-500 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
          <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20">
              <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-20 h-20 border-2 border-white rounded-full"></div>
            </div>

            <div className="relative z-10">
              <div className="bg-white/95 backdrop-blur-sm rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Lock className="text-blue-600" size={48} />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">استعادة كلمة المرور</h1>
              <p className="text-white/90 text-lg font-medium">نظام إدارة الطلاب</p>
            </div>
          </div>

          <div className="p-8">
            {resetStep === 'token' ? (
              <form onSubmit={(e) => { e.preventDefault(); generateResetToken(); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم المستخدم
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pr-12 pl-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="أدخل اسم المستخدم"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {resetMessage && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium whitespace-pre-line">{resetMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? 'جاري الإنشاء...' : 'إنشاء رمز الاستعادة'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false)
                    setError('')
                    setResetMessage('')
                  }}
                  className="w-full text-gray-600 hover:text-gray-800 font-medium py-2"
                >
                  العودة لتسجيل الدخول
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رمز الاستعادة
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-lg font-mono"
                    placeholder="أدخل الرمز"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="أدخل كلمة المرور الجديدة"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {resetMessage && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium">{resetMessage}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* خلفية متحركة */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 border border-gray-100">
        {/* القسم العلوي */}
        <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500 p-10 text-center relative overflow-hidden">
          {/* زخرفة خلفية */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20">
            <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-20 h-20 border-2 border-white rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white rounded-full"></div>
          </div>

          <div className="relative z-10">
            <div className="bg-white/95 backdrop-blur-sm rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <GraduationCap className="text-blue-600" size={48} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">مرحباً بك</h1>
            <p className="text-white/90 text-lg font-medium">في نظام إدارة الطلاب</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <div className="w-2 h-2 bg-white/70 rounded-full"></div>
              <div className="w-2 h-2 bg-white/40 rounded-full"></div>
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
              اسم المستخدم
            </label>
            <div className="relative group">
              <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pr-12 pl-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-right">
              كلمة المرور
            </label>
            <div className="relative group">
              <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-12 pl-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                placeholder="أدخل كلمة المرور"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-shake">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:from-blue-700 hover:via-cyan-700 hover:to-teal-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="w-full text-blue-600 hover:text-blue-800 font-medium py-2 transition-colors"
          >
            نسيت كلمة المرور؟
          </button>
        </form>
      </div>
    </div>
  )
}
