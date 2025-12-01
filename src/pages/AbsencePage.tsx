import { useState, useEffect } from 'react'
import { db, StudentViolation } from '../lib/db'
import { supabase } from '../lib/supabase'
import { Student } from '../types'
import { AlertTriangle, Search, FileText, Printer, Calendar, Filter, Send } from 'lucide-react'
import { formatPhoneForWhatsApp } from '../lib/formatPhone'

interface ViolationWithStudent extends StudentViolation {
  student?: {
    name: string
    national_id: string
    guardian_phone: string
    violation_count: number
    grade: string
    group?: {
      name: string
    }
  }
}

export function AbsencePage() {
  const [students, setStudents] = useState<Student[]>([])
  const [violations, setViolations] = useState<ViolationWithStudent[]>([])
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
  const [teacherName, setTeacherName] = useState('')
  const [schoolName, setSchoolName] = useState('')

  useEffect(() => {
    fetchStudents()
    fetchViolations()
    fetchTeacherProfile()
  }, [])

  async function fetchTeacherProfile() {
    const profile = await db.teacher_profile.toCollection().first()
    if (profile?.name) {
      setTeacherName(profile.name)
    }
    if (profile?.schoolName) {
      setSchoolName(profile.schoolName)
    }
  }

  async function fetchStudents() {
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .order('name')

      const { data: groupsData } = await supabase.from('groups').select('*')
      const { data: statusesData } = await supabase.from('special_statuses').select('*')

      const groups = groupsData || []
      const statuses = statusesData || []

      const studentsWithRelations = (studentsData || []).map(student => {
        const group = groups.find(g => g.id === student.group_id)
        const special_status = statuses.find(s => s.id === student.special_status_id)
        return {
          ...student,
          group: group ? { name: group.name } : undefined,
          special_status: special_status ? { name: special_status.name } : undefined
        }
      })

      setStudents(studentsWithRelations as Student[])

      if (studentsData) await db.students.bulkPut(studentsData)
      if (groups.length > 0) await db.groups.bulkPut(groups)
      if (statuses.length > 0) await db.special_statuses.bulkPut(statuses)
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  async function fetchViolations(filterDate?: string) {
    try {
      let query = supabase
        .from('student_violations')
        .select('*')
        .order('violation_date', { ascending: false })

      if (filterDate) {
        const startOfDay = new Date(filterDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(filterDate)
        endOfDay.setHours(23, 59, 59, 999)

        query = query
          .gte('violation_date', startOfDay.toISOString())
          .lte('violation_date', endOfDay.toISOString())
      } else {
        query = query.limit(50)
      }

      const { data: violationsData } = await query
      const { data: studentsData } = await supabase.from('students').select('*')

      const allStudents = studentsData || []

      const { data: groupsData } = await supabase.from('groups').select('*')
      const groups = groupsData || []

      const violationsWithStudents = (violationsData || []).map((violation) => {
        const student = allStudents.find(s => s.id === violation.student_id)
        const group = student ? groups.find(g => g.id === student.group_id) : undefined
        return {
          ...violation,
          student: student ? {
            name: student.name,
            national_id: student.national_id,
            guardian_phone: student.guardian_phone,
            violation_count: student.violation_count || 0,
            grade: student.grade || '',
            group: group ? { name: group.name } : undefined
          } : undefined
        }
      })

      setViolations(violationsWithStudents)

      if (violationsData) {
        await db.student_violations.bulkPut(violationsData.map(v => ({
          id: v.id,
          student_id: v.student_id,
          violation_type: v.violation_type,
          violation_date: v.violation_date,
          description: v.description,
          action_taken: v.action_taken,
          notes: v.notes || '',
          created_at: v.created_at
        })))
      }
    } catch (error) {
      console.error('Error fetching violations:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return

    setLoading(true)
    try {
      const violationDate = new Date().toISOString()
      const currentCount = selectedStudent.violation_count || 0

      const { data: violationData, error: violationError } = await supabase
        .from('student_violations')
        .insert({
          student_id: selectedStudent.id,
          violation_type: formData.violation_type,
          violation_date: violationDate,
          description: formData.description,
          action_taken: formData.action_taken,
          notes: formData.notes
        })
        .select()
        .single()

      if (violationError) throw violationError

      const { error: updateError } = await supabase
        .from('students')
        .update({ violation_count: currentCount + 1 })
        .eq('id', selectedStudent.id)

      if (updateError) throw updateError

      if (violationData) {
        await db.student_violations.add({
          id: violationData.id,
          student_id: violationData.student_id,
          violation_type: violationData.violation_type,
          violation_date: violationData.violation_date,
          description: violationData.description,
          action_taken: violationData.action_taken,
          notes: violationData.notes || '',
          created_at: violationData.created_at
        })
      }

      await db.students.update(selectedStudent.id, {
        violation_count: currentCount + 1
      })

      alert('تم تسجيل المخالفة بنجاح')
      setFormData({ violation_type: 'هروب من الحصة', description: '', action_taken: '', notes: '' })
      setSelectedStudent(null)
      fetchStudents()
      fetchViolations(dateFilter)
    } catch (error) {
      console.error('Error saving violation:', error)
      alert('حدث خطأ أثناء الحفظ')
    }
    setLoading(false)
  }

  function sendWhatsApp(violation: ViolationWithStudent) {
    if (!violation.student?.guardian_phone) {
      alert('رقم جوال ولي الأمر غير مسجل')
      return
    }

    const phone = formatPhoneForWhatsApp(violation.student.guardian_phone)
    if (!phone) {
      alert('رقم جوال ولي الأمر غير صالح. يرجى التأكد من إدخال الرقم الصحيح في بيانات الطالب.')
      return
    }

    const message = `السلام عليكم ورحمة الله وبركاته

عزيزي ولي أمر الطالب: ${violation.student.name}

نود إعلامكم بتسجيل مخالفة سلوكية على الطالب بتاريخ: ${new Date(violation.violation_date).toLocaleDateString('ar-SA')}

⚠️ نوع المخالفة: ${violation.violation_type}
📝 الوصف: ${violation.description}
✅ الإجراء المتخذ: ${violation.action_taken}

يرجى التواصل مع الموجه الطلابي للاستفسار.

مع تحيات إدارة المدرسة
${teacherName ? teacherName : 'مسؤول النظام'}`

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  async function printViolation(violation: ViolationWithStudent) {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const violationDate = new Date(violation.violation_date)
    const hijriDate = violationDate.toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).replace(/\u200f/g, '')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>إشعار مخالفة</title>
          <meta charset="UTF-8">
          <style>
            @page { margin: 2cm; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 40px; 
              margin: 0;
            }
            .header { 
              text-align: center; 
              margin-bottom: 10px;
            }
            .header-line {
              font-size: 14px;
              color: #374151;
              margin: 3px 0;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin: 15px 0;
            }
            .divider {
              border-bottom: 2px solid #000;
              margin: 15px 0 25px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            .label-cell {
              text-align: right;
              font-weight: bold;
              color: #1f2937;
              width: 30%;
            }
            .value-cell {
              text-align: right;
              color: #374151;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: #6b7280;
            }
            @media print { 
              body { padding: 20px; } 
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-line">نظام المشرف الصحي المدرسي</div>
            <div class="header-line">المرشد الطلابي: ${teacherName || 'اسم المعلم'}</div>
            <div class="header-line" style="font-weight: bold;">إشعار مخالفة سلوكية</div>
          </div>
          
          <div class="divider"></div>
          
          <table>
            <tr>
              <td class="label-cell">نوع الحضور</td>
              <td class="value-cell">مخالفة</td>
            </tr>
            <tr>
              <td class="label-cell">التاريخ</td>
              <td class="value-cell">${hijriDate}</td>
            </tr>
            <tr>
              <td class="label-cell">اسم الطالب</td>
              <td class="value-cell">${violation.student?.name || ''}</td>
            </tr>
            <tr>
              <td class="label-cell">السجل المدني</td>
              <td class="value-cell">${violation.student?.national_id || ''}</td>
            </tr>
            <tr>
              <td class="label-cell">نوع المخالفة</td>
              <td class="value-cell">${violation.violation_type}</td>
            </tr>
            <tr>
              <td class="label-cell">وصف المخالفة</td>
              <td class="value-cell">${violation.description}</td>
            </tr>
            <tr>
              <td class="label-cell">الإجراء المتخذ</td>
              <td class="value-cell">${violation.action_taken}</td>
            </tr>
            ${violation.notes ? `
            <tr>
              <td class="label-cell">ملاحظات</td>
              <td class="value-cell">${violation.notes}</td>
            </tr>
            ` : ''}
          </table>
          
          <div class="footer">
            تم الإنشاء بتاريخ: ${new Date().toLocaleDateString('ar-SA-u-ca-islamic')}<br>
            عدد المخالفات المسجلة: ${violation.student?.violation_count || 1}
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
          <AlertTriangle size={28} className="text-red-600" />
          <h2 className="text-2xl font-bold text-gray-800">المخالفات</h2>
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
                  value={formData.violation_type}
                  onChange={(e) => setFormData({ ...formData, violation_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="هروب من الحصة">هروب من الحصة</option>
                  <option value="تأخر صباحي">تأخر صباحي</option>
                  <option value="غياب بدون عذر">غياب بدون عذر</option>
                  <option value="عدم إحضار الكتب">عدم إحضار الكتب</option>
                  <option value="عدم حل الواجبات">عدم حل الواجبات</option>
                  <option value="سلوك غير لائق">سلوك غير لائق</option>
                  <option value="شجار">شجار</option>
                  <option value="إزعاج">إزعاج</option>
                  <option value="أخرى">أخرى</option>
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
                  placeholder="اكتب وصف تفصيلي للمخالفة..."
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
              <div key={violation.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{violation.student?.name}</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(violation.violation_date).toLocaleString('ar-SA')}
                    </p>
                    <p className="text-sm font-bold text-red-600 mt-1">
                      <AlertTriangle size={14} className="inline ml-1" />
                      {violation.violation_type}
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
