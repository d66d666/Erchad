import { useState } from 'react'
import { supabase } from '../lib/supabase'
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

      const { data, error: fetchError } = await supabase
        .from('login_credentials')
        .select('*')
        .eq('username', username)
        .eq('password_hash', password)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (!data) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة')
        return
      }

      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userId', data.id)
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

      // Get credentials from Supabase
      const { data: credentials } = await supabase
        .from('login_credentials')
        .select('*')
        .eq('username', username)
        .maybeSingle()

      if (!credentials || !credentials.id) {
        setError('اسم المستخدم غير موجود')
        return
      }

      // Update in Supabase
      const { error: updateError } = await supabase
        .from('login_credentials')
        .update({
          reset_token: token,
          reset_token_expires: expiresAt.toISOString(),
        })
        .eq('id', credentials.id)

      if (updateError) throw updateError

      // Update in IndexedDB
      const localCreds = await db.login_credentials.where('username').equals(username).first()
      if (localCreds && localCreds.id) {
        await db.login_credentials.update(localCreds.id, {
          reset_token: token,
          reset_token_expires: expiresAt.toISOString(),
        })
      }

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
      // Get credentials from Supabase
      const { data: credentials } = await supabase
        .from('login_credentials')
        .select('*')
        .eq('username', username)
        .eq('reset_token', resetToken)
        .maybeSingle()

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
        // Update in Supabase
        const { error: updateError } = await supabase
          .from('login_credentials')
          .update({
            password_hash: newPassword,
            reset_token: null,
            reset_token_expires: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', credentials.id)

        if (updateError) throw updateError

        // Update in IndexedDB
        const localCreds = await db.login_credentials.where('username').equals(username).first()
        if (localCreds && localCreds.id) {
          await db.login_credentials.update(localCreds.id, {
            password_hash: newPassword,
            reset_token: null,
            reset_token_expires: null,
            updated_at: new Date().toISOString()
          })
        }
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center">
            <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <Lock className="text-emerald-600" size={40} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">استعادة كلمة المرور</h1>
            <p className="text-emerald-50">نظام الإرشاد الطلابي</p>
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
    <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-8 text-center">
          <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="text-cyan-600" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">نظام الإرشاد الطلابي</h1>
          <p className="text-cyan-50">تسجيل الدخول</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
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
                className="w-full pr-12 pl-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-12 pl-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="أدخل كلمة المرور"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="w-full text-cyan-600 hover:text-cyan-800 font-medium py-2"
          >
            نسيت كلمة المرور؟
          </button>
        </form>
      </div>
    </div>
  )
}
