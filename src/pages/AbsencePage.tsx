import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Student, StudentViolation } from '../types'
import { AlertTriangle, Search, FileText, Printer, Calendar, Filter, Send } from 'lucide-react'

export function AbsencePage() {
  const [students, setStudents] = useState<Student[]>([])
  const [violations, setViolations] = useState<StudentViolation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    violation_type: 'هروب من الحصة' as const,
    description: '',
    action_taken: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchStudents()
    fetchViolations()
  }, [])

  async function fetchStudents() {
    const { data } = await supabase
      .from('students')
      .select('*, group:groups(name), special_status:special_statuses(name), violation_count')
      .order('name')

    if (data) setStudents(data as Student[])
  }

  async function fetchViolations(filterDate?: string) {
    let query = supabase
      .from('student_violations')
      .select('*, student:students(name, national_id, guardian_phone, violation_count)')
      .order('violation_date', { ascending: false })

    if (filterDate) {
      const startOfDay = new Date(filterDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(filterDate)
      endOfDay.setHours(23, 59, 59, 999)
      query = query.gte('violation_date', startOfDay.toISOString()).lte('violation_date', endOfDay.toISOString())
    } else {
      query = query.limit(50)
    }

    const { data } = await query
    if (data) setViolations(data as StudentViolation[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return

    setLoading(true)
    const { error } = await supabase.from('student_violations').insert({
      student_id: selectedStudent.id,
      ...formData
    })

    if (!error) {
      alert('تم تسجيل المخالفة بنجاح')
      setFormData({ violation_type: 'هروب من الحصة', description: '', action_taken: '', notes: '' })
      setSelectedStudent(null)
      fetchStudents()
      fetchViolations(dateFilter)
    } else {
      alert('حدث خطأ: ' + error.message)
    }
    setLoading(false)
  }

  function sendWhatsApp(violation: StudentViolation) {
    if (!violation.student?.guardian_phone) {
      alert('رقم جوال ولي الأمر غير مسجل')
      return
    }

    const message = `السلام عليكم ورحمة الله وبركاته

عزيزي ولي أمر الطالب: ${violation.student.name}

نود إعلامكم بتسجيل مخالفة سلوكية على الطالب بتاريخ: ${new Date(violation.violation_date).toLocaleDateString('ar-SA')}

⚠️ نوع المخالفة: ${violation.violation_type}
📝 الوصف: ${violation.description}
✅ الإجراء المتخذ: ${violation.action_taken}

يرجى التواصل مع الإرشاد الطلابي للاستفسار.

مع تحيات إدارة المدرسة`

    const phone = violation.student.guardian_phone.replace(/\D/g, '')
    const whatsappUrl = `https://wa.me/966${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  async function printViolation(violation: StudentViolation) {
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
          <title>تقرير مخالفة طالب</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #dc2626; }
            .header .meta { color: #666; font-size: 12px; margin-top: 10px; }
            .section { margin-bottom: 20px; }
            .section label { font-weight: bold; display: block; margin-bottom: 5px; color: #555; }
            .section div { padding: 10px; background: #f9fafb; border-radius: 5px; }
            .violation-type { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 5px; font-weight: bold; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقرير مخالفة طالب</h1>
            <p>التاريخ: ${new Date(violation.violation_date).toLocaleString('ar-SA')}</p>
            ${teacherName ? `<div class="meta">بواسطة: ${teacherName}</div>` : ''}
          </div>
          <div class="section">
            <label>اسم الطالب:</label>
            <div>${violation.student?.name}</div>
          </div>
          <div class="section">
            <label>السجل المدني:</label>
            <div>${violation.student?.national_id}</div>
          </div>
          <div class="section">
            <label>نوع المخالفة:</label>
            <div class="violation-type">${violation.violation_type}</div>
          </div>
          <div class="section">
            <label>وصف المخالفة:</label>
            <div>${violation.description}</div>
          </div>
          <div class="section">
            <label>الإجراء المتخذ:</label>
            <div>${violation.action_taken}</div>
          </div>
          ${violation.notes ? `
          <div class="section">
            <label>ملاحظات:</label>
            <div>${violation.notes}</div>
          </div>
          ` : ''}
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `)
  }

  const filteredStudents = students.filter(s =>
    s.name.includes(searchTerm) || s.national_id.includes(searchTerm)
  )

  const violationTypes = [
    'هروب من الحصة',
    'غياب بدون عذر',
    'تأخر صباحي',
    'عدم إحضار الكتب',
    'سلوك غير لائق',
    'استخدام الجوال',
    'عدم ارتداء الزي المدرسي',
    'أخرى'
  ]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle size={28} className="text-red-600" />
          <h2 className="text-2xl font-bold text-gray-800">المخالفات السلوكية</h2>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                    className="w-full text-right px-4 py-3 hover:bg-red-50 border-b border-gray-100 last:border-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-800">{student.name}</div>
                    <div className="text-sm text-gray-600">
                      {student.national_id} - {student.group?.name}
                    </div>
                    <div className="text-xs text-red-600 font-semibold mt-1">
                      عدد المخالفات: {student.violation_count || 0}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStudent && (
            <>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h3 className="font-bold text-red-900 mb-2">الطالب المحدد:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-semibold">الاسم:</span> {selectedStudent.name}</div>
                  <div><span className="font-semibold">السجل المدني:</span> {selectedStudent.national_id}</div>
                  <div><span className="font-semibold">الفصل:</span> {selectedStudent.group?.name}</div>
                  <div><span className="font-semibold">الصف:</span> {selectedStudent.grade}</div>
                  <div className="col-span-2">
                    <span className="font-semibold">عدد المخالفات السابقة:</span>
                    <span className="text-red-600 font-bold mr-2">{selectedStudent.violation_count || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع المخالفة
                </label>
                <select
                  required
                  value={formData.violation_type}
                  onChange={(e) => setFormData({ ...formData, violation_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {violationTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  وصف المخالفة
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="اكتب تفاصيل المخالفة..."
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  placeholder="اكتب الإجراء الذي تم اتخاذه..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'جاري الحفظ...' : 'تسجيل المخالفة'}
              </button>
            </>
          )}
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} />
            سجل المخالفات {dateFilter ? 'المفلترة' : 'الأخيرة'}
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => fetchViolations(dateFilter)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                تطبيق الفلتر
              </button>
              <button
                onClick={() => {
                  setDateFilter('')
                  fetchViolations()
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                إعادة تعيين
              </button>
            </div>
            {dateFilter && (
              <p className="text-sm text-red-600 font-semibold mt-3">
                عرض المخالفات في: {new Date(dateFilter).toLocaleDateString('ar-SA')}
              </p>
            )}
          </div>
        )}

        {violations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">لا توجد مخالفات {dateFilter ? 'في هذا التاريخ' : ''}</p>
        ) : (
          <div className="space-y-3">
            {violations.map(violation => (
              <div key={violation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{violation.student?.name}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(violation.violation_date).toLocaleString('ar-SA')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => printViolation(violation)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Printer size={16} />
                      طباعة
                    </button>
                    <button
                      onClick={() => sendWhatsApp(violation)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Send size={16} />
                      واتساب
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="bg-red-100 text-red-800 px-3 py-2 rounded-lg font-semibold">
                    نوع المخالفة: {violation.violation_type}
                  </div>
                  <div><span className="font-semibold">الوصف:</span> {violation.description}</div>
                  <div><span className="font-semibold">الإجراء:</span> {violation.action_taken}</div>
                  {violation.notes && (
                    <div className="text-gray-600">
                      <span className="font-semibold">ملاحظات:</span> {violation.notes}
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
