import { useState, useEffect } from 'react'
import { db, LoginCredentials } from '../lib/db'
import { UserPlus, Edit2, Trash2, Calendar, Users, AlertCircle, Save, X } from 'lucide-react'

export function AccountsManagementPage() {
  const [accounts, setAccounts] = useState<LoginCredentials[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<LoginCredentials | null>(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    expiryMonths: '1'
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    const allAccounts = await db.login_credentials.toArray()
    setAccounts(allAccounts)
  }

  const calculateExpiryDate = (months: number): string => {
    const date = new Date()
    date.setMonth(date.getMonth() + months)
    return date.toISOString().split('T')[0]
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const expiryDate = calculateExpiryDate(parseInt(formData.expiryMonths))

      await db.login_credentials.add({
        id: crypto.randomUUID(),
        username: formData.username,
        password_hash: formData.password,
        expiry_date: expiryDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      setFormData({ username: '', password: '', expiryMonths: '1' })
      setShowAddModal(false)
      loadAccounts()
      alert('تم إضافة الحساب بنجاح!')
    } catch (error) {
      console.error('Error adding account:', error)
      alert('حدث خطأ أثناء إضافة الحساب')
    }
  }

  const handleUpdateExpiry = async (accountId: string, months: number) => {
    try {
      const expiryDate = calculateExpiryDate(months)
      await db.login_credentials.update(accountId, {
        expiry_date: expiryDate,
        updated_at: new Date().toISOString()
      })
      loadAccounts()
      setEditingAccount(null)
      alert('تم تحديث الصلاحية بنجاح!')
    } catch (error) {
      console.error('Error updating expiry:', error)
      alert('حدث خطأ أثناء تحديث الصلاحية')
    }
  }

  const handleDeleteAccount = async (accountId: string, username: string) => {
    if (username === 'admin') {
      alert('لا يمكن حذف حساب المسؤول الرئيسي')
      return
    }

    if (confirm(`هل أنت متأكد من حذف حساب: ${username}؟`)) {
      try {
        await db.login_credentials.delete(accountId)
        loadAccounts()
        alert('تم حذف الحساب بنجاح!')
      } catch (error) {
        console.error('Error deleting account:', error)
        alert('حدث خطأ أثناء حذف الحساب')
      }
    }
  }

  const getDaysRemaining = (expiryDate: string | null | undefined): number | null => {
    if (!expiryDate) return null

    const expiry = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  const getStatusColor = (days: number | null): string => {
    if (days === null) return 'bg-gray-100 text-gray-800'
    if (days < 0) return 'bg-red-100 text-red-800'
    if (days <= 7) return 'bg-orange-100 text-orange-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (days: number | null): string => {
    if (days === null) return 'غير محدد'
    if (days < 0) return 'منتهية'
    if (days === 0) return 'تنتهي اليوم'
    if (days === 1) return 'تنتهي غداً'
    return `${days} يوم متبقي`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Users className="text-blue-600" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">إدارة الحسابات</h1>
                <p className="text-gray-600 mt-1">إضافة وتعديل صلاحيات المستخدمين</p>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg transition-all transform hover:scale-105"
            >
              <UserPlus size={20} />
              إضافة حساب جديد
            </button>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-1">ملاحظات مهمة:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>حساب المسؤول الرئيسي (admin) وحساب المطور (Wael) لا يخضعان لقيود الصلاحية</li>
                <li>سيتم تنبيه المستخدمين عند بقاء 7 أيام أو أقل على انتهاء صلاحيتهم</li>
                <li>الحسابات المنتهية لن تتمكن من تسجيل الدخول</li>
              </ul>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">اسم المستخدم</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">تاريخ الانتهاء</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الحالة</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">تاريخ الإنشاء</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accounts.map((account) => {
                  const daysRemaining = getDaysRemaining(account.expiry_date)
                  const isEditing = editingAccount?.id === account.id

                  return (
                    <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{account.username}</div>
                      </td>
                      <td className="px-6 py-4">
                        {account.expiry_date ? (
                          <div className="text-sm text-gray-600">
                            {new Date(account.expiry_date).toLocaleDateString('ar-SA')}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">غير محدد</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(daysRemaining)}`}>
                          {getStatusText(daysRemaining)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {account.created_at ? new Date(account.created_at).toLocaleDateString('ar-SA') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              defaultValue="1"
                              onChange={(e) => handleUpdateExpiry(account.id!, parseInt(e.target.value))}
                            >
                              <option value="1">شهر واحد</option>
                              <option value="2">شهرين</option>
                              <option value="3">3 أشهر</option>
                              <option value="6">6 أشهر</option>
                              <option value="12">سنة</option>
                            </select>
                            <button
                              onClick={() => setEditingAccount(null)}
                              className="text-gray-500 hover:text-gray-700 p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingAccount(account)}
                              className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="تعديل الصلاحية"
                            >
                              <Calendar size={18} />
                            </button>
                            {account.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteAccount(account.id!, account.username)}
                                className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="حذف الحساب"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">إضافة حساب جديد</h2>

            <form onSubmit={handleAddAccount} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  اسم المستخدم
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="أدخل اسم المستخدم"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  كلمة المرور
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="أدخل كلمة المرور"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  مدة الصلاحية
                </label>
                <select
                  value={formData.expiryMonths}
                  onChange={(e) => setFormData({ ...formData, expiryMonths: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">شهر واحد</option>
                  <option value="2">شهرين</option>
                  <option value="3">3 أشهر</option>
                  <option value="6">6 أشهر</option>
                  <option value="12">سنة كاملة</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                <p className="font-bold mb-1">الصلاحية ستنتهي في:</p>
                <p>{new Date(calculateExpiryDate(parseInt(formData.expiryMonths))).toLocaleDateString('ar-SA')}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({ username: '', password: '', expiryMonths: '1' })
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                >
                  إضافة الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
