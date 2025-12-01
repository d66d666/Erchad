import { useState, useEffect } from 'react'
import { db, StudentPermission } from '../lib/db'
import { supabase } from '../lib/supabase'
import { Student } from '../types'
import { LogOut, Search, Send, Clock, Printer, Calendar, Filter, Trash2, X } from 'lucide-react'
import { formatPhoneForWhatsApp } from '../lib/formatPhone'
import { formatBothDates } from '../lib/hijriDate'

interface PermissionWithStudent extends StudentPermission {
  student?: {
    name: string
    national_id: string
    guardian_phone: string
    permission_count: number
    group?: { name: string }
  }
}

interface PermissionPageProps {
  onUpdateStats?: () => void
}

export function PermissionPage({ onUpdateStats }: PermissionPageProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [permissions, setPermissions] = useState<PermissionWithStudent[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [dateFilter, setDateFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    reason: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [teacherName, setTeacherName] = useState('')

  useEffect(() => {
    fetchStudents()
    fetchPermissions()
    fetchTeacherProfile()
  }, [])

  useEffect(() => {
    fetchPermissions(dateFilter, permissionSearchTerm)
  }, [permissionSearchTerm])

  async function fetchTeacherProfile() {
    const profile = await db.teacher_profile.toCollection().first()
    if (profile?.name) {
      setTeacherName(profile.name)
    }
  }

  async function fetchStudents() {
    try {
      // جلب الطلاب من Supabase
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'نشط')
        .order('name')

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        return
      }

      // جلب المجموعات من Supabase
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')

      // جلب الحالات الخاصة من Supabase
      const { data: statusesData } = await supabase
        .from('special_statuses')
        .select('*')

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

      // تحديث IndexedDB المحلية
      if (studentsData) {
        await db.students.bulkPut(studentsData)
      }
      if (groups.length > 0) {
        await db.groups.bulkPut(groups)
      }
      if (statuses.length > 0) {
        await db.special_statuses.bulkPut(statuses)
      }
    } catch (error) {
      console.error('Error in fetchStudents:', error)
    }
  }

  async function fetchPermissions(filterDate?: string, searchQuery?: string) {
    try {
      // إعداد الفلتر الزمني
      let query = supabase
        .from('student_permissions')
        .select('*')
        .order('permission_date', { ascending: false })

      // إذا كان هناك بحث، لا تطبق فلتر التاريخ
      if (searchQuery && searchQuery.trim() !== '') {
        // لا تحديد بالتاريخ، جلب كل الاستئذانات للبحث
        query = query.limit(200)
      } else if (filterDate) {
        const startOfDay = new Date(filterDate)
        startOfDay.setHours(0, 0, 0, 0)
        const endOfDay = new Date(filterDate)
        endOfDay.setHours(23, 59, 59, 999)

        query = query
          .gte('permission_date', startOfDay.toISOString())
          .lte('permission_date', endOfDay.toISOString())
      } else {
        // عرض استئذانات اليوم الحالي فقط بشكل افتراضي
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const endOfToday = new Date()
        endOfToday.setHours(23, 59, 59, 999)

        query = query
          .gte('permission_date', today.toISOString())
          .lte('permission_date', endOfToday.toISOString())
      }

      const { data: permissionsData, error: permissionsError } = await query

      if (permissionsError) {
        console.error('Error fetching permissions:', permissionsError)
        return
      }

      // جلب المجموعات والطلاب
      const { data: groupsData } = await supabase.from('groups').select('*')
      const { data: studentsData } = await supabase.from('students').select('*')

      const groups = groupsData || []
      const allStudents = studentsData || []

      const permissionsWithStudents = (permissionsData || []).map((permission) => {
        const student = allStudents.find(s => s.id === permission.student_id)
        const group = student ? groups.find(g => g.id === student.group_id) : undefined
        return {
          ...permission,
          student: student ? {
            name: student.name,
            national_id: student.national_id,
            guardian_phone: student.guardian_phone,
            permission_count: student.permission_count || 0,
            group: group ? { name: group.name } : undefined
          } : undefined
        }
      })

      setPermissions(permissionsWithStudents)

      // تحديث IndexedDB المحلية
      if (permissionsData) {
        await db.student_permissions.bulkPut(permissionsData.map(p => ({
          id: p.id,
          student_id: p.student_id,
          permission_date: p.permission_date,
          reason: p.reason,
          guardian_notified: p.guardian_notified,
          notes: p.notes || '',
          created_at: p.created_at
        })))
      }
    } catch (error) {
      console.error('Error in fetchPermissions:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedStudent) return

    setLoading(true)
    try {
      const permissionDate = new Date().toISOString()
      const currentCount = selectedStudent.permission_count || 0

      // حفظ الاستئذان في Supabase
      const { data: permissionData, error: permissionError } = await supabase
        .from('student_permissions')
        .insert({
          student_id: selectedStudent.id,
          permission_date: permissionDate,
          reason: formData.reason,
          notes: formData.notes,
          guardian_notified: true
        })
        .select()
        .single()

      if (permissionError) {
        console.error('Error saving permission:', permissionError)
        throw permissionError
      }

      // تحديث حالة الطالب في Supabase
      const { error: updateError } = await supabase
        .from('students')
        .update({
          status: 'استئذان',
          permission_count: currentCount + 1
        })
        .eq('id', selectedStudent.id)

      if (updateError) {
        console.error('Error updating student:', updateError)
        throw updateError
      }

      // حفظ في IndexedDB المحلية
      if (permissionData) {
        await db.student_permissions.add({
          id: permissionData.id,
          student_id: permissionData.student_id,
          permission_date: permissionData.permission_date,
          reason: permissionData.reason,
          guardian_notified: permissionData.guardian_notified,
          notes: permissionData.notes || '',
          created_at: permissionData.created_at
        })
      }

      await db.students.update(selectedStudent.id, {
        status: 'استئذان',
        permission_count: currentCount + 1
      })

      sendWhatsAppNotification(selectedStudent, formData.reason)

      alert('تم تسجيل الاستئذان وإرسال رسالة لولي الأمر')
      setFormData({ reason: '', notes: '' })
      setSelectedStudent(null)
      fetchStudents()
      fetchPermissions(dateFilter)
      if (onUpdateStats) onUpdateStats()
    } catch (error) {
      console.error('Error saving permission:', error)
      alert('حدث خطأ أثناء الحفظ')
    }
    setLoading(false)
  }

  function sendWhatsAppNotification(student: Student, reason: string) {
    if (!student.guardian_phone) {
      alert('رقم جوال ولي الأمر غير مسجل')
      return
    }

    const phone = formatPhoneForWhatsApp(student.guardian_phone)
    if (!phone) {
      alert('رقم جوال ولي الأمر غير صالح. يرجى التأكد من إدخال الرقم الصحيح في بيانات الطالب.')
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

مع تحيات إدارة المدرسة
${teacherName ? teacherName : 'مسؤول النظام'}`

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  function sendWhatsAppForPermission(permission: PermissionWithStudent) {
    if (!permission.student?.guardian_phone) {
      alert('رقم جوال ولي الأمر غير مسجل')
      return
    }

    const phone = formatPhoneForWhatsApp(permission.student.guardian_phone)
    if (!phone) {
      alert('رقم جوال ولي الأمر غير صالح. يرجى التأكد من إدخال الرقم الصحيح في بيانات الطالب.')
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

مع تحيات إدارة المدرسة
${teacherName ? teacherName : 'مسؤول النظام'}`

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  async function handleDeletePermission(permissionId: string, studentId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا الاستئذان؟')) return

    try {
      const { error } = await supabase
        .from('student_permissions')
        .delete()
        .eq('id', permissionId)

      if (error) throw error

      const student = students.find(s => s.id === studentId)
      if (student && student.permission_count > 0) {
        await supabase
          .from('students')
          .update({ permission_count: student.permission_count - 1 })
          .eq('id', studentId)

        await db.students.update(studentId, {
          permission_count: student.permission_count - 1
        })
      }

      await db.student_permissions.delete(permissionId)

      alert('تم حذف الاستئذان بنجاح')
      fetchStudents()
      fetchPermissions(dateFilter)
      if (onUpdateStats) onUpdateStats()
    } catch (error) {
      console.error('Error deleting permission:', error)
      alert('حدث خطأ أثناء الحذف')
    }
  }

  async function printPermission(permission: PermissionWithStudent) {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    const permissionDate = new Date(permission.permission_date)
    const hijriDate = permissionDate.toLocaleDateString('ar-SA-u-ca-islamic', {
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
          <title>إذن مغادرة طالب</title>
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
            <div class="header-line" style="font-weight: bold;">إذن مغادرة طالب</div>
          </div>
          
          <div class="divider"></div>
          
          <table>
            <tr>
              <td class="label-cell">نوع الحضور</td>
              <td class="value-cell">استئذان</td>
            </tr>
            <tr>
              <td class="label-cell">التاريخ</td>
              <td class="value-cell">${hijriDate}</td>
            </tr>
            <tr>
              <td class="label-cell">اسم الطالب</td>
              <td class="value-cell">${permission.student?.name || ''}</td>
            </tr>
            <tr>
              <td class="label-cell">الفصل</td>
              <td class="value-cell">${permission.student?.group?.name || ''}</td>
            </tr>
            <tr>
              <td class="label-cell">سبب الاستئذان</td>
              <td class="value-cell">${permission.reason}</td>
            </tr>
            ${permission.notes ? `
            <tr>
              <td class="label-cell">ملاحظات</td>
              <td class="value-cell">${permission.notes}</td>
            </tr>
            ` : ''}
          </table>
          
          <div class="footer">
            تم الإنشاء بتاريخ: ${new Date().toLocaleDateString('ar-SA-u-ca-islamic')}<br>
            تم إشعار ولي الأمر - يرجى التأكد من استلام الطالب
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
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl shadow-lg p-6 border border-orange-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-orange-600 p-3 rounded-lg shadow-md">
            <LogOut size={28} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">الاستئذان</h2>
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
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
                    className="w-full text-right px-4 py-3 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 border-b border-orange-100 last:border-0 transition-all duration-200"
                  >
                    <div className="font-semibold text-gray-800">{student.name}</div>
                    <div className="text-sm text-gray-600">
                      {student.national_id} - {student.group?.name}
                    </div>
                    <div className="text-xs text-orange-600 font-semibold mt-1">
                      عدد الاستئذانات: {student.permission_count || 0}
                    </div>
                  </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedStudent && (
            <>
              <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl p-5 border-2 border-orange-300 shadow-md">
                <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                  الطالب المحدد:
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-2"><span className="font-semibold text-orange-700">الاسم:</span> <span className="text-gray-800">{selectedStudent.name}</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="font-semibold text-orange-700">السجل المدني:</span> <span className="text-gray-800">{selectedStudent.national_id}</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="font-semibold text-orange-700">الفصل:</span> <span className="text-gray-800">{selectedStudent.group?.name}</span></div>
                  <div className="bg-white rounded-lg p-2"><span className="font-semibold text-orange-700">الصف:</span> <span className="text-gray-800">{selectedStudent.grade}</span></div>
                  <div className="col-span-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg p-3 shadow-md">
                    <span className="font-semibold">عدد الاستئذانات السابقة:</span>
                    <span className="font-bold mr-2 text-2xl">{selectedStudent.permission_count || 0}</span>
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
                  placeholder="اكتب سبب الاستئذان..."
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

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null)
                    setFormData({
                      reason: '',
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
                  className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'جاري الحفظ...' : 'تسجيل الاستئذان وإشعار ولي الأمر'}
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
              <Clock size={24} />
              سجل الاستئذانات {dateFilter ? 'المفلترة' : 'اليوم'}
            </h3>
            {!dateFilter && (
              <p className="text-sm text-gray-500 mt-1">عرض استئذانات اليوم الحالي فقط</p>
            )}
          </div>
          <div className="flex gap-2">
            {dateFilter && (
              <button
                onClick={() => {
                  setDateFilter('')
                  fetchPermissions()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                إعادة تعيين
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors"
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
              value={permissionSearchTerm}
              onChange={(e) => setPermissionSearchTerm(e.target.value)}
              placeholder="ابحث في السجل بالاسم أو السجل المدني..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {permissionSearchTerm && (
              <button
                onClick={() => {
                  setPermissionSearchTerm('')
                  fetchPermissions(dateFilter, '')
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
              <div className="bg-orange-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={24} />
                    <h3 className="text-xl font-bold">فلتر بالتاريخ</h3>
                  </div>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="hover:bg-orange-700 rounded-full p-2 transition-colors"
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
                      fetchPermissions(e.target.value)
                      setShowFilters(false)
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                  />
                </div>

                <div className="text-center text-sm text-gray-500">
                  أو اختر من التواريخ المتاحة
                </div>

                {dateFilter && (
                  <button
                    onClick={() => {
                      setDateFilter('')
                      fetchPermissions()
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

        {permissions.filter(permission =>
          permissionSearchTerm === '' ||
          permission.student?.name.toLowerCase().includes(permissionSearchTerm.toLowerCase()) ||
          permission.student?.national_id.includes(permissionSearchTerm)
        ).length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {permissionSearchTerm ? 'لا توجد نتائج للبحث' : `لا توجد استئذانات ${dateFilter ? 'في هذا التاريخ' : 'اليوم'}`}
          </p>
        ) : (
          <div className="space-y-3">
            {permissions.filter(permission =>
              permissionSearchTerm === '' ||
              permission.student?.name.toLowerCase().includes(permissionSearchTerm.toLowerCase()) ||
              permission.student?.national_id.includes(permissionSearchTerm)
            ).map(permission => (
              <div key={permission.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-800">{permission.student?.name}</h4>
                    <p className="text-sm text-gray-600">{permission.student?.group?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatBothDates(permission.permission_date)}
                    </p>
                    <p className="text-sm text-orange-600 font-semibold mt-1">
                      <Clock size={14} className="inline ml-1" />
                      {new Date(permission.permission_date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleDeletePermission(permission.id, permission.student_id)}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
                    <button
                      onClick={() => printPermission(permission)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Printer size={16} />
                      طباعة
                    </button>
                    <button
                      onClick={() => sendWhatsAppForPermission(permission)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Send size={16} />
                      واتساب
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
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
