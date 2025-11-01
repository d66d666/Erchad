import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Student, Group, SpecialStatus } from '../types'
import { Users, Printer, UserPlus, X } from 'lucide-react'

export function GroupsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    national_id: '',
    phone: '',
    guardian_phone: '',
    grade: '',
    special_status_id: '',
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [showStatusDetails, setShowStatusDetails] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [groupsRes, studentsRes, statusesRes] = await Promise.all([
        supabase.from('groups').select('*').order('name'),
        supabase.from('students').select('*').order('name'),
        supabase.from('special_statuses').select('*').order('name'),
      ])

      if (groupsRes.data) setGroups(groupsRes.data)
      if (studentsRes.data) setStudents(studentsRes.data as Student[])
      if (statusesRes.data) setSpecialStatuses(statusesRes.data)
    } finally {
      setLoading(false)
    }
  }

  const groupedData = groups.map((group) => ({
    group,
    students: students.filter((s) => s.group_id === group.id),
    count: students.filter((s) => s.group_id === group.id).length,
  }))

  const handlePrintAll = () => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>جميع المجموعات</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #2563eb; margin-bottom: 30px; }
            .group-section { margin-bottom: 40px; page-break-after: always; }
            .group-title { color: #2563eb; font-size: 24px; margin-bottom: 10px; }
            .group-info { margin-bottom: 15px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #2563eb; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>جميع المجموعات</h1>
          ${groupedData.map(({ group, students: groupStudents }) => `
            <div class="group-section">
              <h2 class="group-title">${group.name}</h2>
              <p class="group-info"><strong>عدد الطلاب:</strong> ${groupStudents.length}</p>
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>السجل المدني</th>
                    <th>جوال الطالب</th>
                    <th>جوال ولي الأمر</th>
                    <th>الحالة الخاصة</th>
                  </tr>
                </thead>
                <tbody>
                  ${groupStudents
                    .map(
                      (student) => {
                        const status = specialStatuses.find(
                          (s) => s.id === student.special_status_id
                        )
                        const statusText = student.special_status_id
                          ? (showStatusDetails ? (status?.name || 'لديه حالة خاصة') : 'لديه حالة خاصة')
                          : '-'
                        return `
                    <tr>
                      <td>${student.name}</td>
                      <td>${student.national_id}</td>
                      <td>${student.phone}</td>
                      <td>${student.guardian_phone}</td>
                      <td>${statusText}</td>
                    </tr>
                  `
                      }
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handlePrint = (group: Group, groupStudents: Student[]) => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>طلاب ${group.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #2563eb; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>قائمة طلاب ${group.name}</h1>
          <p><strong>عدد الطلاب:</strong> ${groupStudents.length}</p>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>السجل المدني</th>
                <th>جوال الطالب</th>
                <th>جوال ولي الأمر</th>
                <th>الحالة الخاصة</th>
              </tr>
            </thead>
            <tbody>
              ${groupStudents
                .map(
                  (student) => {
                    const status = specialStatuses.find(
                      (s) => s.id === student.special_status_id
                    )
                    const statusText = student.special_status_id
                      ? (showStatusDetails ? (status?.name || 'لديه حالة خاصة') : 'لديه حالة خاصة')
                      : '-'
                    return `
                <tr>
                  <td>${student.name}</td>
                  <td>${student.national_id}</td>
                  <td>${student.phone}</td>
                  <td>${student.guardian_phone}</td>
                  <td>${statusText}</td>
                </tr>
              `
                  }
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleAddStudent = (groupId: string) => {
    setSelectedGroupId(groupId)
    setShowAddStudentModal(true)
    setFormData({
      name: '',
      national_id: '',
      phone: '',
      guardian_phone: '',
      grade: '',
      special_status_id: '',
    })
    setFormError('')
  }

  const handleCloseModal = () => {
    setShowAddStudentModal(false)
    setSelectedGroupId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.name || !formData.national_id || !selectedGroupId) {
      setFormError('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    try {
      setFormLoading(true)

      const { error } = await supabase.from('students').insert([
        {
          ...formData,
          group_id: selectedGroupId,
          special_status_id: formData.special_status_id || null,
          status: 'نشط',
        },
      ])

      if (error) throw error

      handleCloseModal()
      fetchData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrintAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all hover:shadow-md"
          >
            <Printer size={20} />
            <span>طباعة الكل</span>
          </button>
          <label className="flex items-center gap-3 bg-white bg-opacity-20 px-4 py-3 rounded-xl cursor-pointer hover:bg-opacity-30 transition-all">
            <input
              type="checkbox"
              checked={showStatusDetails}
              onChange={(e) => setShowStatusDetails(e.target.checked)}
              className="w-5 h-5 rounded cursor-pointer"
            />
            <span className="text-white font-semibold">إظهار تفاصيل الحالة</span>
          </label>
        </div>
      </div>

      {groupedData.map(({ group, students: groupStudents, count }) => (
        <div key={group.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">{group.name}</h2>
                <p className="text-blue-100">عدد الطلاب: {count}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handlePrint(group, groupStudents)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all hover:shadow-md"
                >
                  <Printer size={20} />
                  <span>طباعة</span>
                </button>
                <button
                  onClick={() => handleAddStudent(group.id)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all hover:shadow-md"
                >
                  <UserPlus size={20} />
                  <span>إضافة طالب</span>
                </button>
              </div>
            </div>
          </div>

          {groupStudents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-lg">لا يوجد طلاب في هذه المجموعة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      الاسم
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      السجل المدني
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      جوال الطالب
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      جوال ولي الأمر
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      الحالة الخاصة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupStudents.map((student) => {
                    const status = specialStatuses.find(
                      (s) => s.id === student.special_status_id
                    )
                    return (
                      <tr key={student.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.national_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.guardian_phone}
                        </td>
                        <td className="px-6 py-4">
                          {student.special_status_id ? (
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              {showStatusDetails ? (status?.name || 'لديه حالة خاصة') : 'لديه حالة خاصة'}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-500 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">إضافة طالب جديد</h3>
              <button
                onClick={handleCloseModal}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="أدخل اسم الطالب"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    السجل المدني *
                  </label>
                  <input
                    type="text"
                    value={formData.national_id}
                    onChange={(e) =>
                      setFormData({ ...formData, national_id: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="رقم السجل المدني"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الصف
                  </label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="مثال: الأول متوسط"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    جوال الطالب
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="05xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    جوال ولي الأمر
                  </label>
                  <input
                    type="tel"
                    value={formData.guardian_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, guardian_phone: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="05xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    الحالة الخاصة
                  </label>
                  <select
                    value={formData.special_status_id}
                    onChange={(e) =>
                      setFormData({ ...formData, special_status_id: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">لا يوجد</option>
                    {specialStatuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? 'جاري الحفظ...' : 'حفظ الطالب'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
