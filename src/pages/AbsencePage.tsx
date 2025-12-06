import { useState, useEffect } from 'react'
import { db, StudentViolation } from '../lib/db'
import { Student } from '../types'
import { AlertTriangle, Search, FileText, Printer, Calendar, Filter, Send, Trash2, X } from 'lucide-react'
import { formatPhoneForWhatsApp } from '../lib/formatPhone'
import { openWhatsApp } from '../lib/openWhatsApp'
import { arabicTextIncludes } from '../lib/normalizeArabic'
import { formatBothDates } from '../lib/hijriDate'
import { CustomAlert } from '../components/CustomAlert'

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

interface AbsencePageProps {
  onUpdateStats?: () => void
}

export function AbsencePage({ onUpdateStats }: AbsencePageProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [violations, setViolations] = useState<ViolationWithStudent[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [formData, setFormData] = useState({
    violation_type: 'هروب من الحصة' as const,
    description: '',
    action_taken: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [violationSearchTerm, setViolationSearchTerm] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [teacherPhone, setTeacherPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [systemDescription, setSystemDescription] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success')

  useEffect(() => {
    fetchStudents()
    fetchViolations()
    fetchTeacherProfile()
  }, [])

  useEffect(() => {
    fetchViolations(dateFilter, violationSearchTerm)
  }, [violationSearchTerm])

  async function fetchTeacherProfile() {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    const profile = await db.teacher_profile.where('id').equals(userId).first()

    if (profile?.name) {
      setTeacherName(profile.name)
    }
    if (profile?.phone) {
      setTeacherPhone(profile.phone)
    }
    if (profile?.school_name) {
      setSchoolName(profile.school_name)
    }
    if (profile?.system_description) {
      setSystemDescription(profile.system_description)
    }
  }

  async function fetchStudents() {
    try {
      const allStudents = await db.students.toArray()
      const groups = await db.groups.toArray()
      const statuses = await db.special_statuses.toArray()

      const studentsWithRelations = allStudents.map(student => {
        const group = groups.find(g => g.id === student.group_id)
        const special_status = statuses.find(s => s.id === student.special_status_id)
        return {
          ...student,
          group: group ? { name: group.name } : undefined,
          special_status: special_status ? { name: special_status.name } : undefined
        }
      })

      setStudents(studentsWithRelations as Student[])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  async function fetchViolations(filterDate?: string, searchQuery?: string, viewAll?: boolean) {
    try {
      let violationsData = await db.student_violations.orderBy('violation_date').reverse().toArray()

      // تطبيق الفلاتر
      if (searchQuery && searchQuery.trim() !== '') {
        // لا تحديد بالتاريخ، جلب كل المخالفات للبحث
        violationsData = violationsData.slice(0, 200)
      } else if (filterDate) {
        const startOfDay = new Date(filterDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(filterDate)
        endOfDay.setHours(23, 59, 59, 999)

        violationsData = violationsData.filter(v => {
          const violationDate = new Date(v.violation_date)
          return violationDate >= startOfDay && violationDate <= endOfDay
        })
      } else if (!viewAll) {
        // عرض مخالفات اليوم الحالي فقط بشكل افتراضي
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endOfToday = new Date()
        endOfToday.setHours(23, 59, 59, 999)

        violationsData = violationsData.filter(v => {
          const violationDate = new Date(v.violation_date)
          return violationDate >= today && violationDate <= endOfToday
        })
      }

      const allStudents = await db.students.toArray()
      const groups = await db.groups.toArray()

      const violationsWithStudents = violationsData.map((violation) => {
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

      const violationId = crypto.randomUUID()
      await db.student_violations.add({
        id: violationId,
        student_id: selectedStudent.id,
        violation_type: formData.violation_type,
        violation_date: violationDate,
        description: formData.description,
        action_taken: formData.action_taken,
        notes: formData.notes || '',
        created_at: new Date().toISOString()
      })

      await db.students.update(selectedStudent.id, {
        violation_count: currentCount + 1
      })

      setAlertMessage('تم تسجيل المخالفة بنجاح')
      setAlertType('success')
      setShowAlert(true)
      setFormData({ violation_type: 'هروب من الحصة', description: '', action_taken: '', notes: '' })
      setSelectedStudent(null)
      fetchStudents()
      fetchViolations(dateFilter)
      if (onUpdateStats) onUpdateStats()
    } catch (error) {
      console.error('Error saving violation:', error)
      setAlertMessage('حدث خطأ أثناء الحفظ')
      setAlertType('error')
      setShowAlert(true)
    }
    setLoading(false)
  }

  function sendWhatsApp(violation: ViolationWithStudent) {
    if (!violation.student?.guardian_phone) {
      setAlertMessage('رقم جوال ولي الأمر غير مسجل')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    const phone = formatPhoneForWhatsApp(violation.student.guardian_phone)
    if (!phone) {
      setAlertMessage('رقم جوال ولي الأمر غير صالح. يرجى التأكد من إدخال الرقم الصحيح في بيانات الطالب.')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    const violationDate = new Date(violation.violation_date)
    const message = `*إشعار مخالفة سلوكية*

السلام عليكم ورحمة الله وبركاته

عزيزي ولي أمر الطالب: *${violation.student.name}*

نود إعلامكم بتسجيل مخالفة سلوكية على الطالب

*تفاصيل المخالفة*

*التاريخ:* ${violationDate.toLocaleDateString('ar-SA')}
*الوقت:* ${violationDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
*نوع المخالفة:* ${violation.violation_type}

الأستاذ ${teacherName || 'مسؤول النظام'}

مع تحيات إدارة المدرسة`

    openWhatsApp(phone, message)
  }

  async function handleDeleteViolation(violationId: string, studentId: string) {
    if (!confirm('هل أنت متأكد من حذف هذه المخالفة؟')) return

    try {
      await db.student_violations.delete(violationId)

      const student = students.find(s => s.id === studentId)
      if (student && student.violation_count > 0) {
        await db.students.update(studentId, {
          violation_count: student.violation_count - 1
        })
      }

      setAlertMessage('تم حذف المخالفة بنجاح')
      setAlertType('success')
      setShowAlert(true)
      fetchStudents()
      fetchViolations(dateFilter)
      if (onUpdateStats) onUpdateStats()
    } catch (error) {
      console.error('Error deleting violation:', error)
      setAlertMessage('حدث خطأ أثناء الحذف')
      setAlertType('error')
      setShowAlert(true)
    }
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
            <div class="header-line" style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${schoolName || 'اسم المدرسة'}</div>
            <div class="header-line">${systemDescription || 'برنامج إدارة الطلاب'}</div>
            <div class="header-line">الأستاذ: ${teacherName || 'اسم المعلم'}</div>
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

  const filteredStudents = students.filter(s => {
    const search = searchTerm.trim().toLowerCase()
    const name = (s.name || '').toLowerCase().trim()
    const nationalId = (s.national_id || '').trim()
    const phone = (s.phone || '').trim()
    const guardianPhone = (s.guardian_phone || '').trim()

    return name.includes(search) ||
           nationalId.includes(search) ||
           phone.includes(search) ||
           guardianPhone.includes(search)
  })

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl shadow-lg p-6 border border-red-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-600 p-3 rounded-lg shadow-md">
            <AlertTriangle size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">المخالفات</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Search size={16} className="inline ml-1" />
              البحث عن طالب
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو السجل المدني..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  إعادة تعيين
                </button>
              )}
            </div>

            {searchTerm && (
              <div className="mt-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    لا توجد نتائج للبحث
                  </div>
                ) : (
                  filteredStudents.map(student => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(student)
                      setSearchTerm('')
                    }}
                    className="w-full text-right px-4 py-3 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 border-b border-red-100 last:border-0 transition-all duration-200"
                  >
                    <div className="font-semibold text-gray-800">{student.name}</div>
                    <div className="text-sm text-gray-600 mb-2">
                      {student.national_id} - {student.group?.name}
                    </div>
                    <div className="flex gap-3 text-xs font-semibold">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        الاستقبال: {student.visit_count || 0}
                      </span>
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                        الاستئذانات: {student.permission_count || 0}
                      </span>
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                        المخالفات: {student.violation_count || 0}
                      </span>
                    </div>
                  </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedStudent && (
            <>
              <div className="bg-gradient-to-br from-red-100 to-rose-100 rounded-xl p-5 border-2 border-red-300 shadow-md">
                <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  الطالب المحدد:
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-2"><span className="font-semibold text-red-700">الاسم:</span> <span className="text-gray-800">{selectedStudent.name}</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="font-semibold text-red-700">السجل المدني:</span> <span className="text-gray-800">{selectedStudent.national_id}</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="font-semibold text-red-700">الفصل:</span> <span className="text-gray-800">{selectedStudent.group?.name}</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="font-semibold text-red-700">الصف:</span> <span className="text-gray-800">{selectedStudent.grade}</span></div>
                  <div className="col-span-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg p-3 shadow-md">
                    <span className="font-semibold">عدد المخالفات السابقة:</span>
                    <span className="font-bold mr-2 text-2xl">{selectedStudent.violation_count || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  نوع المخالفة
                </label>
                <select
                  value={formData.violation_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, violation_type: e.target.value as any }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="هروب من الحصة">هروب من الحصة</option>
                  <option value="غياب بدون عذر">غياب بدون عذر</option>
                  <option value="تأخر صباحي">تأخر صباحي</option>
                  <option value="عدم إحضار الكتب">عدم إحضار الكتب</option>
                  <option value="سلوك غير لائق">سلوك غير لائق</option>
                  <option value="استخدام الجوال">استخدام الجوال</option>
                  <option value="عدم ارتداء الزي المدرسي">عدم ارتداء الزي المدرسي</option>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, action_taken: e.target.value }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={2}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null)
                    setFormData({
                      violation_type: 'هروب من الحصة' as const,
                      description: '',
                      action_taken: '',
                      notes: ''
                    })
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'جاري الحفظ...' : 'تسجيل المخالفة'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText size={24} />
              سجل المخالفات {showAll ? 'الكاملة' : dateFilter ? 'المفلترة' : 'اليوم'}
            </h3>
            {!dateFilter && !showAll && (
              <p className="text-sm text-gray-500 mt-1">عرض مخالفات اليوم الحالي فقط</p>
            )}
            {showAll && (
              <p className="text-sm text-blue-600 mt-1 font-semibold">عرض جميع المخالفات</p>
            )}
          </div>
          <div className="flex gap-2">
            {(dateFilter || showAll) && (
              <button
                onClick={() => {
                  setDateFilter('')
                  setShowAll(false)
                  fetchViolations()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                إعادة تعيين
              </button>
            )}
            <button
              onClick={() => {
                setShowAll(!showAll)
                setDateFilter('')
                fetchViolations('', '', !showAll)
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAll
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              }`}
            >
              <AlertTriangle size={16} />
              {showAll ? 'إخفاء الجميع' : 'عرض الجميع'}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Filter size={16} />
              فلتر بالتاريخ
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={violationSearchTerm}
              onChange={(e) => {
                setViolationSearchTerm(e.target.value)
              }}
              placeholder="ابحث في السجل بالاسم أو السجل المدني..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {violationSearchTerm && (
              <button
                onClick={() => {
                  setViolationSearchTerm('')
                  fetchViolations(dateFilter, '')
                }}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                إعادة تعيين
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowFilters(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="bg-red-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={24} />
                    <h3 className="text-xl font-bold">فلتر بالتاريخ</h3>
                  </div>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="hover:bg-red-700 rounded-full p-2 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <p className="text-gray-600 text-center">
                  اختر التاريخ لعرض زيارات ذلك اليوم
                </p>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    اختر التاريخ من التقويم:
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value)
                      fetchViolations(e.target.value)
                      setShowFilters(false)
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                  />
                </div>

                <div className="text-center text-sm text-gray-500">
                  أو اختر من التواريخ المتاحة
                </div>

                {dateFilter && (
                  <button
                    onClick={() => {
                      setDateFilter('')
                      fetchViolations()
                      setShowFilters(false)
                    }}
                    className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                  >
                    إعادة تعيين الفلتر
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {violations.filter(violation =>
          violationSearchTerm === '' ||
          arabicTextIncludes(violation.student?.name || '', violationSearchTerm) ||
          violation.student?.national_id.includes(violationSearchTerm)
        ).length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {violationSearchTerm ? 'لا توجد نتائج للبحث' : `لا توجد مخالفات ${dateFilter ? 'في هذا التاريخ' : ''}`}
          </p>
        ) : (
          <div className="space-y-3">
            {violations.filter(violation =>
              violationSearchTerm === '' ||
              arabicTextIncludes(violation.student?.name || '', violationSearchTerm) ||
              violation.student?.national_id.includes(violationSearchTerm)
            ).map(violation => (
              <div key={violation.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{violation.student?.name}</h4>
                    <p className="text-xs text-gray-500">
                      {formatBothDates(violation.violation_date)}
                    </p>
                    <p className="text-sm font-bold text-red-600 mt-1">
                      <AlertTriangle size={14} className="inline ml-1" />
                      {violation.violation_type}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleDeleteViolation(violation.id, violation.student_id)}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
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
