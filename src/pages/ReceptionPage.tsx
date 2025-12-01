import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { db, StudentVisit } from '../lib/db'
import { Student } from '../types'
import { UserCheck, Search, FileText, Printer, Send, Calendar, Filter } from 'lucide-react'
import { formatPhoneForWhatsApp } from '../lib/formatPhone'

interface VisitWithStudent extends StudentVisit {
  student?: {
    name: string
    national_id: string
    guardian_phone: string
    visit_count: number
  }
}

export function ReceptionPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [visits, setVisits] = useState<VisitWithStudent[]>([])
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
  const [teacherName, setTeacherName] = useState('')

  useEffect(() => {
    fetchStudents()
    fetchVisits()
    fetchTeacherProfile()
  }, [])

  async function fetchTeacherProfile() {
    const profile = await db.teacher_profile.toCollection().first()
    if (profile?.name) {
      setTeacherName(profile.name)
    }
  }

  async function fetchStudents() {
    // جلب الطلاب من Supabase أولاً
    const { data: supabaseStudents } = await supabase
      .from('students')
      .select('*')
      .order('name')

    // مزامنة مع IndexedDB
    if (supabaseStudents && supabaseStudents.length > 0) {
      await db.students.clear()
      for (const student of supabaseStudents) {
        await db.students.put(student)
      }
    }

    // جلب المجموعات والحالات
    const { data: supabaseGroups } = await supabase.from('groups').select('*')
    const { data: supabaseStatuses } = await supabase.from('special_statuses').select('*')

    // مزامنة المجموعات
    if (supabaseGroups && supabaseGroups.length > 0) {
      await db.groups.clear()
      for (const group of supabaseGroups) {
        await db.groups.put(group)
      }
    }

    // مزامنة الحالات الخاصة
    if (supabaseStatuses && supabaseStatuses.length > 0) {
      await db.special_statuses.clear()
      for (const status of supabaseStatuses) {
        await db.special_statuses.put(status)
      }
    }

    // قراءة من IndexedDB بعد المزامنة
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
  }

  async function fetchVisits(filterDate?: string) {
    try {
      let query = supabase
        .from('student_visits')
        .select('*')
        .order('visit_date', { ascending: false })

      if (filterDate) {
        const startOfDay = new Date(filterDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(filterDate)
        endOfDay.setHours(23, 59, 59, 999)

        query = query
          .gte('visit_date', startOfDay.toISOString())
          .lte('visit_date', endOfDay.toISOString())
      } else {
        query = query.limit(50)
      }

      const { data: visitsData } = await query
      const { data: studentsData } = await supabase.from('students').select('*')

      const allStudents = studentsData || []

      const visitsWithStudents = (visitsData || []).map((visit) => {
        const student = allStudents.find(s => s.id === visit.student_id)
        return {
          ...visit,
          student: student ? {
            name: student.name,
            national_id: student.national_id,
            guardian_phone: student.guardian_phone,
            visit_count: student.visit_count || 0
          } : undefined
        }
      })

      setVisits(visitsWithStudents)

      if (visitsData) {
        await db.student_visits.bulkPut(visitsData.map(v => ({
          id: v.id,
          student_id: v.student_id,
          visit_date: v.visit_date,
          reason: v.reason,
          action_taken: v.action_taken,
          referred_to: v.referred_to,
          notes: v.notes || '',
          created_at: v.created_at
        })))
      }
    } catch (error) {
      console.error('Error fetching visits:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return

    setLoading(true)
    try {
      const visitDate = new Date().toISOString()
      const currentCount = selectedStudent.visit_count || 0

      const { data: visitData, error: visitError } = await supabase
        .from('student_visits')
        .insert({
          student_id: selectedStudent.id,
          visit_date: visitDate,
          reason: formData.reason,
          action_taken: formData.action_taken,
          referred_to: formData.referred_to,
          notes: formData.notes
        })
        .select()
        .single()

      if (visitError) throw visitError

      const { error: updateError } = await supabase
        .from('students')
        .update({ visit_count: currentCount + 1 })
        .eq('id', selectedStudent.id)

      if (updateError) throw updateError

      if (visitData) {
        await db.student_visits.add({
          id: visitData.id,
          student_id: visitData.student_id,
          visit_date: visitData.visit_date,
          reason: visitData.reason,
          action_taken: visitData.action_taken,
          referred_to: visitData.referred_to,
          notes: visitData.notes || '',
          created_at: visitData.created_at
        })
      }

      await db.students.update(selectedStudent.id, {
        visit_count: currentCount + 1
      })

      alert('تم تسجيل الزيارة بنجاح')
      setFormData({ reason: '', action_taken: '', referred_to: 'لا يوجد', notes: '' })
      setSelectedStudent(null)
      fetchStudents()
      fetchVisits(dateFilter)
    } catch (error) {
      console.error('Error saving visit:', error)
      alert('حدث خطأ أثناء الحفظ')
    }
    setLoading(false)
  }

  async function printVisit(visit: VisitWithStudent) {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const visitDate = new Date(visit.visit_date)
    const hijriDate = visitDate.toLocaleDateString('ar-SA-u-ca-islamic', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\u200f/g, '')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>تقرير زيارة طالب</title>
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
            <div class="header-line" style="font-weight: bold;">تقرير زيارة طالب</div>
          </div>
          
          <div class="divider"></div>
          
          <table>
            <tr>
              <td class="label-cell">نوع الحضور</td>
              <td class="value-cell">حضر</td>
            </tr>
            <tr>
              <td class="label-cell">التاريخ</td>
              <td class="value-cell">${hijriDate}</td>
            </tr>
            <tr>
              <td class="label-cell">اسم الطالب</td>
              <td class="value-cell">${visit.student?.name || ''}</td>
            </tr>
            <tr>
              <td class="label-cell">السجل المدني</td>
              <td class="value-cell">${visit.student?.national_id || ''}</td>
            </tr>
            <tr>
              <td class="label-cell">سبب الزيارة</td>
              <td class="value-cell">${visit.reason}</td>
            </tr>
            <tr>
              <td class="label-cell">الإجراء المتخذ</td>
              <td class="value-cell">${visit.action_taken}</td>
            </tr>
            <tr>
              <td class="label-cell">التحويل إلى</td>
              <td class="value-cell">${visit.referred_to}</td>
            </tr>
            ${visit.notes ? `
            <tr>
              <td class="label-cell">ملاحظات</td>
              <td class="value-cell">${visit.notes}</td>
            </tr>
            ` : ''}
          </table>
          
          <div class="footer">
            تم الإنشاء بتاريخ: ${new Date().toLocaleDateString('ar-SA-u-ca-islamic')}
          </div>
          
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>
    `)
  }

  function sendWhatsApp(visit: VisitWithStudent) {
    if (!visit.student?.guardian_phone) {
      alert('رقم جوال ولي الأمر غير مسجل')
      return
    }

    const phone = formatPhoneForWhatsApp(visit.student.guardian_phone)
    if (!phone) {
      alert('رقم جوال ولي الأمر غير صالح. يرجى التأكد من إدخال الرقم الصحيح في بيانات الطالب.')
      return
    }

    const message = `السلام عليكم ورحمة الله وبركاته

عزيزي ولي أمر الطالب: ${visit.student.name}

نود إعلامكم بأن الطالب قد حضر إلى الإرشاد الطلابي بتاريخ: ${new Date(visit.visit_date).toLocaleDateString('ar-SA')}

سبب الزيارة: ${visit.reason}
الإجراء المتخذ: ${visit.action_taken}
${visit.referred_to !== 'لا يوجد' ? `تم التحويل إلى: ${visit.referred_to}` : ''}

للاستفسار يرجى التواصل مع الموجه الطلابي.

مع تحيات إدارة المدرسة
${teacherName ? teacherName : 'مسؤول النظام'}`

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
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
