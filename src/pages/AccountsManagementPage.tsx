import { useState, useEffect } from 'react'
import { db, LoginCredentials, RenewalCode } from '../lib/db'
import { UserPlus, Edit2, Trash2, Calendar, Users, AlertCircle, Save, X, Download, Copy, Check, RefreshCw, Key } from 'lucide-react'
import { openWhatsApp } from '../lib/openWhatsApp'
import { CustomAlert } from '../components/CustomAlert'

export function AccountsManagementPage() {
  const [accounts, setAccounts] = useState<LoginCredentials[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<LoginCredentials | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<LoginCredentials | null>(null)
  const [copied, setCopied] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [renewalCode, setRenewalCode] = useState('')
  const [renewalMonths, setRenewalMonths] = useState('1')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    schoolName: '',
    teacherName: '',
    phone: '',
    startDate: '',
    endDate: ''
  })
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    schoolName: '',
    teacherName: '',
    phone: '',
    expiryMonths: '1'
  })
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success')

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
      const accountId = crypto.randomUUID()

      await db.login_credentials.add({
        id: accountId,
        username: formData.username,
        password_hash: formData.password,
        school_name: formData.schoolName,
        teacher_name: formData.teacherName,
        phone: formData.phone,
        expiry_date: expiryDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      // إنشاء سجل اشتراك
      const startDate = new Date()
      const endDate = new Date(expiryDate)

      await db.subscription.add({
        id: crypto.randomUUID(),
        school_id: accountId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        created_at: new Date().toISOString()
      })

      setFormData({ username: '', password: '', schoolName: '', teacherName: '', phone: '', expiryMonths: '1' })
      setShowAddModal(false)
      loadAccounts()
      setAlertMessage('تم إضافة الحساب بنجاح!')
      setAlertType('success')
      setShowAlert(true)
    } catch (error) {
      console.error('Error adding account:', error)
      setAlertMessage('حدث خطأ أثناء إضافة الحساب')
      setAlertType('error')
      setShowAlert(true)
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
      setAlertMessage('تم تحديث الصلاحية بنجاح!')
      setAlertType('success')
      setShowAlert(true)
    } catch (error) {
      console.error('Error updating expiry:', error)
      setAlertMessage('حدث خطأ أثناء تحديث الصلاحية')
      setAlertType('error')
      setShowAlert(true)
    }
  }

  const handleDeleteAccount = async (accountId: string, username: string) => {
    if (username === 'Wael') {
      setAlertMessage('لا يمكن حذف حساب المطور الرئيسي')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    if (confirm(`هل أنت متأكد من حذف حساب: ${username}؟`)) {
      try {
        await db.login_credentials.delete(accountId)
        loadAccounts()
        setAlertMessage('تم حذف الحساب بنجاح!')
        setAlertType('success')
        setShowAlert(true)
      } catch (error) {
        console.error('Error deleting account:', error)
        setAlertMessage('حدث خطأ أثناء حذف الحساب')
        setAlertType('error')
        setShowAlert(true)
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

  const handleExportConfig = (account: LoginCredentials) => {
    setSelectedAccount(account)
    setShowConfigModal(true)
  }

  const copyAccountInfo = () => {
    if (!selectedAccount) return

    const text = `معلومات الدخول:\n\nاسم المستخدم: ${selectedAccount.username}\nكلمة المرور: ${selectedAccount.password_hash}\n\nتاريخ انتهاء الصلاحية: ${selectedAccount.expiry_date ? new Date(selectedAccount.expiry_date).toLocaleDateString('ar-SA') : 'غير محدد'}\n\nيرجى حفظ هذه المعلومات في مكان آمن`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const downloadConfigFile = () => {
    if (!selectedAccount) return

    const config = {
      username: selectedAccount.username,
      password: selectedAccount.password_hash,
      expiry_date: selectedAccount.expiry_date,
      created_at: selectedAccount.created_at
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `account-${selectedAccount.username}-config.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateRenewalCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-'
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleGenerateRenewalCode = async (account: LoginCredentials) => {
    setSelectedAccount(account)
    const code = generateRenewalCode()
    setRenewalCode(code)
    setShowRenewalModal(true)
  }

  const handleSaveRenewalCode = async () => {
    if (!selectedAccount || !renewalCode) return

    try {
      await db.renewal_codes.add({
        id: crypto.randomUUID(),
        code: renewalCode,
        username: selectedAccount.username,
        extension_months: parseInt(renewalMonths),
        used: false,
        created_at: new Date().toISOString(),
        used_at: null
      })

      setAlertMessage(`تم إنشاء رمز التجديد بنجاح!\n\nالرمز: ${renewalCode}\nالحساب: ${selectedAccount.username}\nالمدة: ${renewalMonths} شهر\n\nاحفظ هذا الرمز وأرسله للمستخدم`)
      setAlertType('success')
      setShowAlert(true)

      setShowRenewalModal(false)
      setRenewalCode('')
      setRenewalMonths('1')
      setSelectedAccount(null)
    } catch (error) {
      console.error('Error saving renewal code:', error)
      setAlertMessage('حدث خطأ أثناء حفظ رمز التجديد')
      setAlertType('error')
      setShowAlert(true)
    }
  }

  const handleOpenEditModal = async (account: LoginCredentials) => {
    setSelectedAccount(account)

    // جلب تاريخ الاشتراك من قاعدة البيانات
    const subscription = await db.subscription.where('school_id').equals(account.id!).first()

    setEditFormData({
      username: account.username,
      password: account.password_hash,
      schoolName: account.school_name || '',
      teacherName: account.teacher_name || '',
      phone: account.phone || '',
      startDate: subscription?.start_date ? new Date(subscription.start_date).toISOString().split('T')[0] : '',
      endDate: subscription?.end_date ? new Date(subscription.end_date).toISOString().split('T')[0] : ''
    })

    setShowEditModal(true)
  }

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAccount) return

    try {
      // تحديث بيانات تسجيل الدخول
      await db.login_credentials.update(selectedAccount.id!, {
        username: editFormData.username,
        password_hash: editFormData.password,
        school_name: editFormData.schoolName,
        teacher_name: editFormData.teacherName,
        phone: editFormData.phone,
        expiry_date: editFormData.endDate,
        updated_at: new Date().toISOString()
      })

      // تحديث بيانات الاشتراك
      const subscription = await db.subscription.where('school_id').equals(selectedAccount.id!).first()

      if (subscription) {
        await db.subscription.update(subscription.id!, {
          start_date: editFormData.startDate,
          end_date: editFormData.endDate
        })
      } else {
        // إنشاء اشتراك جديد إذا لم يكن موجوداً
        await db.subscription.add({
          id: crypto.randomUUID(),
          school_id: selectedAccount.id!,
          start_date: editFormData.startDate,
          end_date: editFormData.endDate,
          is_active: true,
          created_at: new Date().toISOString()
        })
      }

      setShowEditModal(false)
      setSelectedAccount(null)
      loadAccounts()
      setAlertMessage('تم تحديث الحساب بنجاح!')
      setAlertType('success')
      setShowAlert(true)
    } catch (error) {
      console.error('Error updating account:', error)
      setAlertMessage('حدث خطأ أثناء تحديث الحساب')
      setAlertType('error')
      setShowAlert(true)
    }
  }

  const sendWhatsAppMessage = (phone: string, name: string) => {
    const formattedPhone = phone.startsWith('0') ? '966' + phone.substring(1) : phone
    const message = `السلام عليكم ${name}`
    openWhatsApp(formattedPhone, message)
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
                <li>حساب المطور (Wael) لا يخضع لقيود الصلاحية ولا يمكن حذفه</li>
                <li>سيتم تنبيه المستخدمين عند بقاء 7 أيام أو أقل على انتهاء صلاحيتهم</li>
                <li>الحسابات المنتهية لن تتمكن من تسجيل الدخول</li>
                <li>يمكن تجديد الصلاحيات عن بعد باستخدام رموز التجديد</li>
              </ul>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">اسم المستخدم</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المدرسة</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">المعلم المسؤول</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">رقم الجوال</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">تاريخ الانتهاء</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">الحالة</th>
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
                        <div className="text-sm text-gray-600">{account.school_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{account.teacher_name || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {account.phone ? (
                          <button
                            onClick={() => sendWhatsAppMessage(account.phone || '', account.teacher_name || account.username)}
                            className="text-sm text-green-600 hover:text-green-800 font-mono hover:underline flex items-center gap-1"
                          >
                            {account.phone}
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </button>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
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
                              onClick={() => handleOpenEditModal(account)}
                              className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="تعديل الحساب"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleGenerateRenewalCode(account)}
                              className="text-purple-600 hover:text-purple-800 p-2 hover:bg-purple-50 rounded-lg transition-colors"
                              title="إنشاء رمز تجديد"
                            >
                              <Key size={18} />
                            </button>
                            <button
                              onClick={() => handleExportConfig(account)}
                              className="text-green-600 hover:text-green-800 p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="تصدير التكوين"
                            >
                              <Download size={18} />
                            </button>
                            {account.username !== 'Wael' && (
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-4">إضافة حساب جديد</h2>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="text-purple-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-purple-800">
                  <p className="font-bold mb-1">ملاحظة مهمة:</p>
                  <p>المعلومات التالية (اسم المدرسة، اسم المعلم، رقم الجوال) هي فقط لمرجعيتك كمطور ولن تظهر للمشترك. المشترك سيدخل معلوماته بنفسه في الملف الشخصي.</p>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                <h3 className="text-base font-bold text-blue-900 mb-2">معلومات المدرسة (للمرجعية فقط)</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      اسم المدرسة
                    </label>
                    <input
                      type="text"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="مثال: مدرسة الملك عبدالله الابتدائية"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      اسم المعلم المسؤول
                    </label>
                    <input
                      type="text"
                      value={formData.teacherName}
                      onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل اسم المعلم المسؤول"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      رقم الجوال
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.phone}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/[^0-9]/g, '')
                        setFormData({ ...formData, phone: numericValue })
                      }}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="05xxxxxxxx"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
                <h3 className="text-base font-bold text-green-900 mb-2">معلومات الدخول</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      اسم المستخدم
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل اسم المستخدم"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      كلمة المرور
                    </label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="أدخل كلمة المرور"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      مدة الاشتراك
                    </label>
                    <select
                      value={formData.expiryMonths}
                      onChange={(e) => setFormData({ ...formData, expiryMonths: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="1">شهر واحد</option>
                      <option value="2">شهرين</option>
                      <option value="3">3 أشهر</option>
                      <option value="6">6 أشهر</option>
                      <option value="12">سنة كاملة</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                <p className="font-bold mb-1">الصلاحية ستنتهي في:</p>
                <p className="text-lg font-bold">{new Date(calculateExpiryDate(parseInt(formData.expiryMonths))).toLocaleDateString('ar-SA')}</p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setFormData({ username: '', password: '', schoolName: '', teacherName: '', phone: '', expiryMonths: '1' })
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2.5 rounded-lg transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg"
                >
                  إضافة الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfigModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">تكوين الحساب</h2>
              <button
                onClick={() => {
                  setShowConfigModal(false)
                  setSelectedAccount(null)
                  setCopied(false)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="text-lg font-bold text-blue-900 mb-3">معلومات المدرسة</h3>

                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">اسم المدرسة</p>
                    <p className="text-base font-bold text-gray-900">{selectedAccount.school_name || '-'}</p>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">المعلم المسؤول</p>
                    <p className="text-base font-bold text-gray-900">{selectedAccount.teacher_name || '-'}</p>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">رقم الجوال</p>
                    <p className="text-base font-bold text-gray-900 font-mono">{selectedAccount.phone || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                <h3 className="text-lg font-bold text-green-900 mb-3">معلومات الدخول</h3>

                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">اسم المستخدم</p>
                    <p className="text-base font-bold text-gray-900">{selectedAccount.username}</p>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">كلمة المرور</p>
                    <p className="text-base font-bold text-gray-900 font-mono">{selectedAccount.password_hash}</p>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">تاريخ انتهاء الاشتراك</p>
                    <p className="text-base font-bold text-gray-900">
                      {selectedAccount.expiry_date
                        ? new Date(selectedAccount.expiry_date).toLocaleDateString('ar-SA')
                        : 'غير محدد'}
                    </p>
                    {selectedAccount.expiry_date && (
                      <p className="text-sm text-gray-600 mt-1">
                        {getStatusText(getDaysRemaining(selectedAccount.expiry_date))}
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">تاريخ الإنشاء</p>
                    <p className="text-base font-bold text-gray-900">
                      {selectedAccount.created_at
                        ? new Date(selectedAccount.created_at).toLocaleDateString('ar-SA')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-800">
                <p className="font-bold mb-1">تنبيه أمني مهم:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>احفظ هذه المعلومات في مكان آمن</li>
                  <li>لا تشارك معلومات الدخول عبر وسائل غير آمنة</li>
                  <li>الحساب سيتوقف تلقائياً عند انتهاء الصلاحية</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyAccountInfo}
                className={`flex-1 ${
                  copied
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2`}
              >
                {copied ? (
                  <>
                    <Check size={20} />
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    نسخ المعلومات
                  </>
                )}
              </button>

              <button
                onClick={downloadConfigFile}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download size={20} />
                تحميل ملف التكوين
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenewalModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Key className="text-purple-600" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">إنشاء رمز تجديد</h2>
              </div>
              <button
                onClick={() => {
                  setShowRenewalModal(false)
                  setRenewalCode('')
                  setRenewalMonths('1')
                  setSelectedAccount(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">الحساب</p>
                  <p className="text-lg font-bold text-gray-900">{selectedAccount.username}</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    مدة التجديد
                  </label>
                  <select
                    value={renewalMonths}
                    onChange={(e) => setRenewalMonths(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="1">شهر واحد</option>
                    <option value="2">شهرين</option>
                    <option value="3">3 أشهر</option>
                    <option value="6">6 أشهر</option>
                    <option value="12">سنة كاملة</option>
                  </select>
                </div>

                <div className="bg-white rounded-xl p-4 border-2 border-purple-300">
                  <p className="text-sm text-gray-600 mb-2">رمز التجديد</p>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold text-purple-600 font-mono flex-1">{renewalCode}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(renewalCode)
                        alert('تم نسخ الرمز!')
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-600 p-2 rounded-lg transition-colors"
                      title="نسخ الرمز"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-yellow-800">
                <p className="font-bold mb-1">تعليمات مهمة:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>احفظ هذا الرمز وأرسله للمستخدم عبر واتساب أو SMS</li>
                  <li>المستخدم سيدخل الرمز في شاشة تسجيل الدخول</li>
                  <li>الرمز يُستخدم مرة واحدة فقط</li>
                  <li>سيتم تجديد الصلاحية تلقائياً عند استخدام الرمز</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenewalModal(false)
                  setRenewalCode('')
                  setRenewalMonths('1')
                  setSelectedAccount(null)
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-xl transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveRenewalCode}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Check size={20} />
                حفظ وإرسال
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Edit2 className="text-blue-600" size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">تعديل الحساب</h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedAccount(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                <h3 className="text-base font-bold text-blue-900 mb-2">معلومات المدرسة</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 text-right">
                      اسم المدرسة
                    </label>
                    <input
                      type="text"
                      value={editFormData.schoolName}
                      onChange={(e) => setEditFormData({ ...editFormData, schoolName: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      placeholder="مثال: مدرسة الملك عبدالله الابتدائية"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 text-right">
                      اسم المعلم المسؤول
                    </label>
                    <input
                      type="text"
                      value={editFormData.teacherName}
                      onChange={(e) => setEditFormData({ ...editFormData, teacherName: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      placeholder="أدخل اسم المعلم المسؤول"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 text-right">
                      رقم الجوال
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editFormData.phone}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/[^0-9]/g, '')
                        setEditFormData({ ...editFormData, phone: numericValue })
                      }}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      placeholder="05xxxxxxxx"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3">
                <h3 className="text-base font-bold text-green-900 mb-2">معلومات الدخول</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 text-right">
                      اسم المستخدم
                    </label>
                    <input
                      type="text"
                      value={editFormData.username}
                      onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      placeholder="أدخل اسم المستخدم"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 text-right">
                      كلمة المرور
                    </label>
                    <input
                      type="text"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      placeholder="أدخل كلمة المرور"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3">
                <h3 className="text-base font-bold text-purple-900 mb-2">فترة الاشتراك</h3>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 text-right">
                      تاريخ بداية الاشتراك
                    </label>
                    <input
                      type="date"
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 text-right">
                      تاريخ نهاية الاشتراك
                    </label>
                    <input
                      type="date"
                      value={editFormData.endDate}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-right"
                      required
                    />
                  </div>
                </div>

                {editFormData.startDate && editFormData.endDate && (
                  <div className="mt-4 bg-white rounded-lg p-3 border border-purple-300">
                    <p className="text-sm text-gray-600 mb-1">مدة الاشتراك</p>
                    <p className="text-lg font-bold text-purple-600">
                      {Math.ceil((new Date(editFormData.endDate).getTime() - new Date(editFormData.startDate).getTime()) / (1000 * 60 * 60 * 24))} يوم
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="font-bold mb-1">ملاحظة مهمة:</p>
                    <p>تأكد من صحة التواريخ والبيانات قبل الحفظ. التغييرات ستؤثر على الحساب فوراً.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedAccount(null)
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2.5 rounded-lg transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAlert && (
        <CustomAlert
          message={alertMessage}
          type={alertType}
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  )
}
