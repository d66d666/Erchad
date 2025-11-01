import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Student, StudentPermission } from '../types'
import { LogOut, Search, Send, Clock, Printer, Calendar, Filter } from 'lucide-react'

export function PermissionPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [permissions, setPermissions] = useState<StudentPermission[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    reason: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
    fetchPermissions()
  }, [])

  async function fetchStudents() {
    const { data } = await supabase
      .from('students')
      .select('*, group:groups(name), special_status:special_statuses(name), permission_count')
      .eq('status', 'نشط')
      .order('name')

    if (data) setStudents(data as Student[])
  }

  async function fetchPermissions(filterDate?: string) {
    let query = supabase
      .from('student_permissions')
      .select('*, student:students(name, national_id, guardian_phone, permission_count, group:groups(name))')
      .order('permission_date', { ascending: false })

    if (filterDate) {
      const startOfDay = new Date(filterDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(filterDate)
      endOfDay.setHours(23, 59, 59, 999)
      query = query.gte('permission_date', startOfDay.toISOString()).lte('permission_date', endOfDay.toISOString())
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      query = query.gte('permission_date', today.toISOString())
    }

    const { data } = await query
    if (data) setPermissions(data as StudentPermission[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return

    setLoading(true)

    const { data: permissionData, error } = await supabase
      .from('student_permissions')
      .insert({
        student_id: selectedStudent.id,
        ...formData,
        guardian_notified: true
      })
      .select()
      .single()

    if (!error) {
      await supabase
        .from('students')
        .update({ status: 'استئذان' })
        .eq('id', selectedStudent.id)

      sendWhatsAppNotification(selectedStudent, formData.reason)

      alert('تم تسجيل الاستئذان وإرسال رسالة لولي الأمر')
      setFormData({ reason: '', notes: '' })
      setSelectedStudent(null)
      fetchStudents()
      fetchPermissions(dateFilter)
    } else {
      alert('حدث خطأ: ' + error.message)
    }
    setLoading(false)
  }

  function sendWhatsAppNotification(student: Student, reason: string) {
    if (!student.guardian_phone) {
      alert('رقم جوال ولي الأمر غير مسجل')
      return
    }

    const now = new Date()
    const message = `السلام عليكم ورحمة الله وبركاته

عزيزي ولي أمر الطالب: ${student.name}
الفصل: ${student.group?.name}

نود إعلامكم بأن الطالب قد استأذن بالمغادرة من المدرسة.

⏰ الوقت: ${now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
📅 التاريخ: ${now.toLocaleDateString('ar-SA')}
📝 السبب: ${reason}

يرجى استلام الطالب من المدرسة.

مع تحيات إدارة المدرسة`

    const phone = student.guardian_phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/966${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  function sendWhatsAppForPermission(permission: StudentPermission) {
    if (!permission.student?.guardian_phone) {
      alert('رقم جوال ولي الأمر غير مسجل')
      return
    }

    const permissionDate = new Date(permission.permission_date)
    const message = `السلام عليكم ورحمة الله وبركاته

عزيزي ولي أمر الطالب: ${permission.student.name}
الفصل: ${permission.student.group?.name}

نود إعلامكم بأن الطالب قد استأذن بالمغادرة من المدرسة.

⏰ الوقت: ${permissionDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
📅 التاريخ: ${permissionDate.toLocaleDateString('ar-SA')}
📝 السبب: ${permission.reason}

يرجى استلام الطالب من المدرسة.

مع تحيات إدارة المدرسة`

    const phone = permission.student.guardian_phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/966${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  async function printPermission(permission: StudentPermission) {
    const { data: teacherProfile } = await supabase
      .from('teacher_profile')
      .select('*')
      .maybeSingle()

    const teacherName = teacherProfile?.name || ''
    const permissionDate = new Date(permission.permission_date)

    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>نموذج استئذان طالب</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #ea580c; }
            .header .meta { color: #666; font-size: 12px; margin-top: 10px; }
            .section { margin-bottom: 20px; }
            .section label { font-weight: bold; display: block; margin-bottom: 5px; color: #555; }
            .section div { padding: 10px; background: #f9fafb; border-radius: 5px; }
            .highlight { background: #fed7aa; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; color: #9a3412; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>نموذج استئذان طالب</h1>
            ${teacherName ? `<div class="meta">بواسطة: ${teacherName}</div>` : ''}
          </div>
          <div class="section">
            <label>اسم الطالب:</label>
            <div>${permission.student?.name}</div>
          </div>
          <div class="section">
            <label>الفصل:</label>
            <div>${permission.student?.group?.name || '-'}</div>
          </div>
          <div class="highlight">
            ⏰ وقت الاستئذان: ${permissionDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
            <br>
            📅 ${permissionDate.toLocaleDateString('ar-SA')}
          </div>
          <div class="section">
            <label>سبب الاستئذان:</label>
            <div>${permission.reason}</div>
          </div>
          ${permission.notes ? `
          <div class="section">
            <label>ملاحظات:</label>
            <div>${permission.notes}</div>
          </div>
          ` : ''}
          <div class="section">
            <label>حالة الإبلاغ:</label>
            <div>${permission.guardian_notified ? '✅ تم إبلاغ ولي الأمر' : '❌ لم يتم الإبلاغ'}</div>
          </div>
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `)
  }

  const filteredStudents = students.filter(s =>
    s.name.includes(searchTerm) || s.national_id.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <LogOut size={28} className="text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-800">استئذان الطلاب</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Search size={16} className="inline ml-1" />
              البحث عن طالب
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو السجل المدني..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            {searchTerm && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredStudents.map(student => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(student)
                      setSearchTerm('')
                    }}
                    className="w-full text-right px-4 py-3 hover:bg-orange-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-800">{student.name}</div>
                    <div className="text-sm text-gray-600">
                      {student.national_id} - {student.group?.name}
                    </div>
                    <div className="text-xs text-orange-600 font-semibold mt-1">
                      عدد الاستئذانات: {student.permission_count || 0}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <h3 className="font-bold text-orange-900 mb-2">الطالب المحدد:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-semibold">الاسم:</span> {selectedStudent.name}</div>
                  <div><span className="font-semibold">السجل المدني:</span> {selectedStudent.national_id}</div>
                  <div><span className="font-semibold">الفصل:</span> {selectedStudent.group?.name}</div>
                  <div><span className="font-semibold">جوال ولي الأمر:</span> {selectedStudent.guardian_phone}</div>
                  <div className="col-span-2">
                    <span className="font-semibold">عدد الاستئذانات السابقة:</span>
                    <span className="text-orange-600 font-bold mr-2">{selectedStudent.permission_count || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  سبب الاستئذان
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                  placeholder="اكتب سبب استئذان الطالب..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-sm text-yellow-800">
                <div className="flex items-start gap-2">
                  <Send size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">سيتم إرسال رسالة واتساب تلقائياً</p>
                    <p>سيتم إبلاغ ولي الأمر برسالة واتساب تتضمن سبب الاستئذان ووقت المغادرة</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                {loading ? 'جاري التسجيل...' : 'تسجيل الاستئذان وإرسال واتساب'}
              </button>
            </>
          )}
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Clock size={24} />
            {dateFilter ? 'استئذانات المفلترة' : 'استئذانات اليوم'} ({permissions.length})
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors"
          >
            <Filter size={16} />
            فلتر بالتاريخ
          </button>
        </div>

        {showFilters && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Calendar size={16} className="inline ml-1" />
                  اختر التاريخ
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => fetchPermissions(dateFilter)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
              >
                تطبيق الفلتر
              </button>
              <button
                onClick={() => {
                  setDateFilter('')
                  fetchPermissions()
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                إعادة تعيين
              </button>
            </div>
            {dateFilter && (
              <p className="text-sm text-orange-600 font-semibold mt-3">
                عرض الاستئذانات في: {new Date(dateFilter).toLocaleDateString('ar-SA')}
              </p>
            )}
          </div>
        )}

        {permissions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد استئذانات {dateFilter ? 'في هذا التاريخ' : 'اليوم'}</p>
        ) : (
          <div className="space-y-3">
            {permissions.map(permission => (
              <div key={permission.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{permission.student?.name}</h4>
                    <p className="text-sm text-gray-600">
                      {permission.student?.group?.name}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-left">
                      <p className="text-sm font-semibold text-orange-600">
                        {new Date(permission.permission_date).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {permission.guardian_notified && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold">
                          <Send size={12} />
                          تم الإبلاغ
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => printPermission(permission)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        title="طباعة"
                      >
                        <Printer size={16} />
                        طباعة
                      </button>
                      <button
                        onClick={() => sendWhatsAppForPermission(permission)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        title="إرسال واتساب"
                      >
                        <Send size={16} />
                        واتساب
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div><span className="font-semibold">السبب:</span> {permission.reason}</div>
                  {permission.notes && (
                    <div className="text-gray-600">
                      <span className="font-semibold">ملاحظات:</span> {permission.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
