import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { Student, Group, SpecialStatus } from '../types'
import { Users, Printer, UserPlus, X, Plus, Edit2, Layers } from 'lucide-react'

export function GroupsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false)
  const [selectedStage, setSelectedStage] = useState<string>('الكل')
  const [formData, setFormData] = useState({
    name: '',
    national_id: '',
    phone: '',
    guardian_phone: '',
    grade: '',
    special_status_id: '',
  })
  const [groupFormData, setGroupFormData] = useState({
    stage: '',
    name: '',
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
      const [groupsData, studentsData, statusesData] = await Promise.all([
        db.groups.toArray(),
        db.students.toArray(),
        db.special_statuses.toArray(),
      ])

      setGroups(groupsData.sort((a, b) => a.name.localeCompare(b.name)))
      setStudents(studentsData as Student[])
      setSpecialStatuses(statusesData)
    } finally {
      setLoading(false)
    }
  }

  const stages = ['الكل', ...Array.from(new Set(groups.map(g => g.stage)))].filter(Boolean)

  const filteredGroups = selectedStage === 'الكل'
    ? groups
    : groups.filter(g => g.stage === selectedStage)

  const groupedData = filteredGroups.map((group) => ({
    group,
    students: students.filter((s) => s.group_id === group.id),
    count: students.filter((s) => s.group_id === group.id).length,
  }))

  const groupedByStage = groups.reduce((acc, group) => {
    if (!acc[group.stage]) {
      acc[group.stage] = []
    }
    acc[group.stage].push(group)
    return acc
  }, {} as Record<string, Group[]>)

  const handlePrintAll = () => {
    const printContent = `
      <html dir="rtl">
        <head>
          <title>جميع المجموعات</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #2563eb; margin-bottom: 30px; }
            .stage-section { margin-bottom: 40px; }
            .stage-title { color: #16a34a; font-size: 28px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #16a34a; }
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
          ${Object.entries(groupedByStage).map(([stage, stageGroups]) => `
            <div class="stage-section">
              <h2 class="stage-title">${stage}</h2>
              ${stageGroups.map((group) => {
                const groupStudents = students.filter(s => s.group_id === group.id)
                return `
                  <div class="group-section">
                    <h3 class="group-title">${group.name}</h3>
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
                `
              }).join('')}
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
            .stage { color: #16a34a; font-size: 20px; margin-bottom: 10px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #2563eb; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <p class="stage">${group.stage}</p>
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

      const newId = crypto.randomUUID()
      await db.students.add({
        id: newId,
        ...formData,
        group_id: selectedGroupId,
        special_status_id: formData.special_status_id || null,
        status: 'نشط',
        visit_count: 0,
        permission_count: 0,
        violation_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any)

      handleCloseModal()
      fetchData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddGroup = async () => {
    if (!groupFormData.stage || !groupFormData.name) {
      alert('يرجى ملء جميع الحقول')
      return
    }

    try {
      const newId = crypto.randomUUID()
      await db.groups.add({
        id: newId,
        stage: groupFormData.stage,
        name: groupFormData.name,
        created_at: new Date().toISOString(),
      })

      setGroupFormData({ stage: '', name: '' })
      fetchData()
      alert('تم إضافة المجموعة بنجاح')
    } catch (error) {
      console.error('Error adding group:', error)
      alert('حدث خطأ أثناء إضافة المجموعة')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    const studentsInGroup = students.filter(s => s.group_id === groupId)

    if (studentsInGroup.length > 0) {
      alert('لا يمكن حذف مجموعة تحتوي على طلاب. يرجى نقل الطلاب أولاً.')
      return
    }

    if (confirm('هل أنت متأكد من حذف هذه المجموعة؟')) {
      try {
        await db.groups.delete(groupId)
        fetchData()
        alert('تم حذف المجموعة بنجاح')
      } catch (error) {
        console.error('Error deleting group:', error)
        alert('حدث خطأ أثناء حذف المجموعة')
      }
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all hover:shadow-md"
            >
              <Printer size={20} />
              <span>طباعة الكل</span>
            </button>
            <button
              onClick={() => setShowManageGroupsModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all hover:shadow-md"
            >
              <Layers size={20} />
              <span>إدارة المجموعات</span>
            </button>
          </div>
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

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`px-6 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                selectedStage === stage
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {groupedData.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Users className="mx-auto mb-4 text-gray-300" size={64} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد مجموعات</h3>
          <p className="text-gray-500">قم بإضافة مجموعات من خلال زر "إدارة المجموعات"</p>
        </div>
      ) : (
        groupedData.map(({ group, students: groupStudents, count }) => (
          <div key={group.id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-semibold mb-1">{group.stage}</p>
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
        ))
      )}

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

      {showManageGroupsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-500 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">إدارة المراحل والمجموعات</h3>
              <button
                onClick={() => setShowManageGroupsModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4">إضافة مجموعة جديدة</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      المرحلة الدراسية
                    </label>
                    <input
                      type="text"
                      value={groupFormData.stage}
                      onChange={(e) => setGroupFormData({ ...groupFormData, stage: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="مثال: المرحلة المتوسطة"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      اسم الفصل / المجموعة
                    </label>
                    <input
                      type="text"
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="مثال: 1/أ"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddGroup}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  إضافة المجموعة
                </button>
              </div>

              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">المجموعات الحالية</h4>
                {Object.entries(groupedByStage).map(([stage, stageGroups]) => (
                  <div key={stage} className="mb-6">
                    <h5 className="text-md font-bold text-green-700 mb-3 flex items-center gap-2">
                      <Layers size={20} />
                      {stage}
                    </h5>
                    <div className="grid md:grid-cols-2 gap-3">
                      {stageGroups.map((group) => {
                        const studentCount = students.filter(s => s.group_id === group.id).length
                        return (
                          <div
                            key={group.id}
                            className="bg-gray-50 rounded-lg p-4 flex items-center justify-between border border-gray-200"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">{group.name}</p>
                              <p className="text-sm text-gray-600">{studentCount} طالب</p>
                            </div>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              disabled={studentCount > 0}
                              className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
