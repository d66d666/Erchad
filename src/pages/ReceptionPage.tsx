import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Student, StudentVisit } from '../types'
import { UserCheck, Search, FileText, Printer, Send, Calendar, Filter } from 'lucide-react'

export function ReceptionPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [visits, setVisits] = useState<StudentVisit[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [formData, setFormData] = useState({
    reason: '',
    action_taken: '',
    referred_to: 'لا يوجد' as const,
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
    fetchVisits()
  }, [])

  async function fetchStudents() {
    const { data } = await supabase
      .from('students')
      .select('*, group:groups(name), special_status:special_statuses(name), visit_count')
      .order('name')

    if (data) setStudents(data as Student[])
  }

  async function fetchVisits(filterDate?: string) {
    let query = supabase
      .from('student_visits')
      .select('*, student:students(name, national_id, guardian_phone, visit_count)')
      .order('visit_date', { ascending: false })

    if (filterDate) {
      const startOfDay = new Date(filterDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(filterDate)
      endOfDay.setHours(23, 59, 59, 999)
      query = query.gte('visit_date', startOfDay.toISOString()).lte('visit_date', endOfDay.toISOString())
    } else {
      query = query.limit(50)
    }

    const { data } = await query
    if (data) setVisits(data as StudentVisit[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return

    setLoading(true)
    const { error } = await supabase.from('student_visits').insert({
      student_id: selectedStudent.id,
      ...formData
    })

    if (!error) {
      alert('تم تسجيل الزيارة بنجاح')
      setFormData({ reason: '', action_taken: '', referred_to: 'لا يوجد', notes: '' })
      setSelectedStudent(null)
      fetchStudents()
      fetchVisits(dateFilter)
    } else {
      alert('حدث خطأ: ' + error.message)
    }
    setLoading(false)
  }

  async function printVisit(visit: StudentVisit) {
    const { data: teacherProfile } = await supabase
      .from('teacher_profile')
      .select('*')
      .maybeSingle()

    const teacherName = teacherProfile?.name || ''

    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>تقرير زيارة طالب</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #2563eb; }
            .header .meta { color: #666; font-size: 12px; margin-top: 10px; }
            .section { margin-bottom: 20px; }
            .section label { font-weight: bold; display: block; margin-bottom: 5px; color: #555; }
            .section div { padding: 10px; background: #f9fafb; border-radius: 5px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقرير زيارة طالب</h1>
            <p>التاريخ: ${new Date(visit.visit_date).toLocaleString('ar-SA')}</p>
            ${teacherName ? `<div class="meta">بواسطة: ${teacherName}</div>` : ''}
          </div>
          <div class="section">
            <label>اسم الطالب:</label>
            <div>${visit.student?.name}</div>
          </div>
          <div class="section">
            <label>السجل المدني:</label>
            <div>${visit.student?.national_id}</div>
          </div>
          <div class="section">
            <label>سبب الزيارة:</label>
            <div>${visit.reason}</div>
          </div>
          <div class="section">
            <label>الإجراء المتخذ:</label>
            <div>${visit.action_taken}</div>
          </div>
          <div class="section">
            <label>التحويل إلى:</label>
            <div>${visit.referred_to}</div>
          </div>
          ${visit.notes ? `
          <div class="section">
            <label>ملاحظات:</label>
            <div>${visit.notes}</div>
          </div>
          ` : ''}
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `)
  }

  function sendWhatsApp(visit: StudentVisit) {
    if (!visit.student?.guardian_phone) {
      alert('رقم جوال ولي الأمر غير مسجل')
      return
    }

    const message = `السلام عليكم ورحمة الله وبركاته

عزيزي ولي أمر الطالب: ${visit.student.name}

نود إعلامكم بأن الطالب قد حضر إلى الإرشاد الطلابي بتاريخ: ${new Date(visit.visit_date).toLocaleDateString('ar-SA')}

سبب الزيارة: ${visit.reason}
الإجراء المتخذ: ${visit.action_taken}
${visit.referred_to !== 'لا يوجد' ? `تم التحويل إلى: ${visit.referred_to}` : ''}

للاستفسار يرجى التواصل مع الإرشاد الطلابي.

مع تحيات إدارة المدرسة`

    const phone = visit.student.guardian_phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/966${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const filteredStudents = students.filter(s =>
    s.name.includes(searchTerm) || s.national_id.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <UserCheck size={28} className="text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">استقبال الطلاب</h2>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full text-right px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-800">{student.name}</div>
                    <div className="text-sm text-gray-600">
                      {student.national_id} - {student.group?.name}
                    </div>
                    <div className="text-xs text-blue-600 font-semibold mt-1">
                      عدد الزيارات: {student.visit_count || 0}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-bold text-blue-900 mb-2">الطالب المحدد:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-semibold">الاسم:</span> {selectedStudent.name}</div>
                  <div><span className="font-semibold">السجل المدني:</span> {selectedStudent.national_id}</div>
                  <div><span className="font-semibold">الفصل:</span> {selectedStudent.group?.name}</div>
                  <div><span className="font-semibold">الصف:</span> {selectedStudent.grade}</div>
                  <div className="col-span-2">
                    <span className="font-semibold">عدد الزيارات السابقة:</span>
                    <span className="text-blue-600 font-bold mr-2">{selectedStudent.visit_count || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  سبب الزيارة / المشكلة
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="اكتب سبب الزيارة أو وصف المشكلة..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الإجراء المتخذ
                </label>
                <textarea
                  required
                  value={formData.action_taken}
                  onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="اكتب الإجراء الذي تم اتخاذه..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  التحويل إلى
                </label>
                <select
                  value={formData.referred_to}
                  onChange={(e) => setFormData({ ...formData, referred_to: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="لا يوجد">لا يوجد</option>
                  <option value="مشرف صحي">مشرف صحي</option>
                  <option value="وكيل">وكيل</option>
                  <option value="مدير">مدير</option>
                  <option value="معلم">معلم</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'جاري الحفظ...' : 'تسجيل الزيارة'}
              </button>
            </>
          )}
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} />
            سجل الزيارات {dateFilter ? 'المفلترة' : 'الأخيرة'}
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => fetchVisits(dateFilter)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                تطبيق الفلتر
              </button>
              <button
                onClick={() => {
                  setDateFilter('')
                  fetchVisits()
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                إعادة تعيين
              </button>
            </div>
            {dateFilter && (
              <p className="text-sm text-blue-600 font-semibold mt-3">
                عرض الزيارات في: {new Date(dateFilter).toLocaleDateString('ar-SA')}
              </p>
            )}
          </div>
        )}

        {visits.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد زيارات {dateFilter ? 'في هذا التاريخ' : ''}</p>
        ) : (
          <div className="space-y-3">
            {visits.map(visit => (
            <div key={visit.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-gray-800">{visit.student?.name}</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(visit.visit_date).toLocaleString('ar-SA')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => printVisit(visit)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <Printer size={16} />
                    طباعة
                  </button>
                  <button
                    onClick={() => sendWhatsApp(visit)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    <Send size={16} />
                    واتساب
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">السبب:</span> {visit.reason}</div>
                <div><span className="font-semibold">الإجراء:</span> {visit.action_taken}</div>
                {visit.referred_to !== 'لا يوجد' && (
                  <div className="text-orange-600 font-semibold">
                    تم التحويل إلى: {visit.referred_to}
                  </div>
                )}
                {visit.notes && (
                  <div className="text-gray-600">
                    <span className="font-semibold">ملاحظات:</span> {visit.notes}
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
