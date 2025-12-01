import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { Student, Group, SpecialStatus } from '../types'
import { AddStudentModal } from '../components/AddStudentModal'
import { Users, Printer, UserPlus, X, Plus, ChevronDown, ChevronUp, Layers } from 'lucide-react'

export function GroupsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [groupFormData, setGroupFormData] = useState({
    stage: '',
    name: '',
  })
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

      // Fetch school info from Supabase
      const profileRes = await supabase.from('teacher_profile').select('*').maybeSingle()
      if (profileRes.data) {
        setSchoolName(profileRes.data.school_name || '')
        setTeacherName(profileRes.data.name || '')
      }

      // Sort groups by stage and display_order
      const sortedGroups = groupsData.sort((a, b) => {
        const stageA = stageOrder[a.stage] || 999
        const stageB = stageOrder[b.stage] || 999
        if (stageA !== stageB) return stageA - stageB
        return (a.display_order || 999) - (b.display_order || 999)
      })
      setGroups(sortedGroups)
      setStudents(studentsData as Student[])
      setSpecialStatuses(statusesData)
    } finally {
      setLoading(false)
    }
  }

  // Define stage order
  const stageOrder: Record<string, number> = {
    'الصف الاول الثانوي': 1,
    'الصف الثاني الثانوي': 2,
    'الصف الثالث الثانوي': 3,
  }

  const groupedByStage = groups.reduce((acc, group) => {
    if (!acc[group.stage]) {
      acc[group.stage] = []
    }
    acc[group.stage].push(group)
    return acc
  }, {} as Record<string, Group[]>)

  // Sort stages by defined order and sort groups within each stage
  const sortedStages = Object.entries(groupedByStage)
    .sort((a, b) => {
      const orderA = stageOrder[a[0]] || 999
      const orderB = stageOrder[b[0]] || 999
      return orderA - orderB
    })
    .map(([stage, stageGroups]) => [
      stage,
      stageGroups.sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
    ] as [string, Group[]])

  const toggleStage = (stage: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  const handlePrintAll = () => {
    const currentDate = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })

    const printContent = `
      <html dir="rtl">
        <head>
          <title>جميع المجموعات</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
            .header h1 { color: #2563eb; margin-bottom: 10px; font-size: 32px; }
            .header-info { color: #666; font-size: 16px; margin: 5px 0; }
            .header-info strong { color: #333; }
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
          <div class="header">
            <h1>${schoolName || 'اسم المدرسة'}</h1>
            <p class="header-info"><strong>المرشد الطلابي:</strong> ${teacherName || 'اسم المعلم'}</p>
            <p class="header-info"><strong>التاريخ:</strong> ${currentDate}</p>
          </div>
          <h2 style="text-align: center; color: #16a34a; margin-bottom: 30px;">جميع المجموعات</h2>
          ${sortedStages.map(([stage, stageGroups]) => `
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
    const currentDate = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })

    const printContent = `
      <html dir="rtl">
        <head>
          <title>طلاب ${group.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
            .header h1 { color: #2563eb; margin-bottom: 10px; font-size: 32px; }
            .header-info { color: #666; font-size: 16px; margin: 5px 0; }
            .header-info strong { color: #333; }
            h1 { text-align: center; color: #2563eb; }
            .stage { color: #16a34a; font-size: 20px; margin-bottom: 10px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #2563eb; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${schoolName || 'اسم المدرسة'}</h1>
            <p class="header-info"><strong>المرشد الطلابي:</strong> ${teacherName || 'اسم المعلم'}</p>
            <p class="header-info"><strong>التاريخ:</strong> ${currentDate}</p>
          </div>
          <p class="stage">${group.stage}</p>
          <h2 style="text-align: center; color: #2563eb; margin-bottom: 20px;">قائمة طلاب ${group.name}</h2>
          <p style="text-align: center; margin-bottom: 20px;"><strong>عدد الطلاب:</strong> ${groupStudents.length}</p>
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
  }

  const handleCloseModal = () => {
    setShowAddStudentModal(false)
    setSelectedGroupId(null)
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
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all hover:shadow-lg"
            >
              <Printer size={20} />
              <span>طباعة الكل</span>
            </button>
            <button
              onClick={() => setShowManageGroupsModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all hover:shadow-lg"
            >
              <Layers size={20} />
              <span>إدارة المجموعات</span>
            </button>
            <button
              onClick={() => {
                setSelectedGroupId(null)
                setShowAddStudentModal(true)
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all hover:shadow-lg"
            >
              <UserPlus size={20} />
              <span>إضافة طالب</span>
            </button>
          </div>
          <label className="flex items-center gap-3 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 rounded-xl cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-all border-2 border-purple-200">
            <input
              type="checkbox"
              checked={showStatusDetails}
              onChange={(e) => setShowStatusDetails(e.target.checked)}
              className="w-5 h-5 rounded cursor-pointer"
            />
            <span className="text-purple-700 font-semibold">إظهار تفاصيل الحالة</span>
          </label>
        </div>
      </div>

      {Object.keys(groupedByStage).length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Users className="mx-auto mb-4 text-gray-300" size={64} />
          <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد مجموعات</h3>
          <p className="text-gray-500">قم بإضافة مجموعات من خلال زر "إدارة المجموعات"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedStages.map(([stage, stageGroups]) => {
            const isExpanded = expandedStages.has(stage)
            const totalStudents = stageGroups.reduce((sum, group) => {
              return sum + students.filter(s => s.group_id === group.id).length
            }, 0)

            return (
              <div key={stage} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => toggleStage(stage)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 p-6 flex items-center justify-between hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <Layers size={28} className="text-white" />
                    <div className="text-right">
                      <h2 className="text-2xl font-bold text-white">{stage}</h2>
                      <p className="text-emerald-50 text-sm">
                        {stageGroups.length} مجموعة • {totalStudents} طالب
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={28} className="text-white" />
                  ) : (
                    <ChevronDown size={28} className="text-white" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {stageGroups.map((group) => {
                      const groupStudents = students.filter(s => s.group_id === group.id)
                      return (
                        <div key={group.id} className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-4 flex items-center justify-between">
                            <div>
                              <h3 className="text-xl font-bold text-white">{group.name}</h3>
                              <p className="text-cyan-50 text-sm">عدد الطلاب: {groupStudents.length}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePrint(group, groupStudents)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-cyan-700 rounded-lg font-semibold hover:bg-cyan-50 transition-all text-sm shadow-sm"
                              >
                                <Printer size={18} />
                                طباعة
                              </button>
                              <button
                                onClick={() => handleAddStudent(group.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-cyan-700 rounded-lg font-semibold hover:bg-cyan-50 transition-all text-sm shadow-sm"
                              >
                                <UserPlus size={18} />
                                إضافة طالب
                              </button>
                            </div>
                          </div>

                          {groupStudents.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 bg-gray-50">
                              <Users className="mx-auto mb-2 text-gray-300" size={36} />
                              <p>لا يوجد طلاب في هذه المجموعة</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 border-b-2 border-gray-200">
                                  <tr>
                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الاسم</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">السجل المدني</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">جوال الطالب</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">جوال ولي الأمر</th>
                                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">الحالة الخاصة</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {groupStudents.map((student, index) => {
                                    const status = specialStatuses.find(
                                      (s) => s.id === student.special_status_id
                                    )
                                    return (
                                      <tr key={student.id} className={`hover:bg-blue-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                          {student.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          {student.national_id}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          {student.phone || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                          {student.guardian_phone}
                                        </td>
                                        <td className="px-4 py-3 text-center">
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
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddStudentModal && (
        <AddStudentModal
          groups={groups}
          specialStatuses={specialStatuses}
          onClose={handleCloseModal}
          onStudentAdded={fetchData}
          preselectedGroupId={selectedGroupId || undefined}
        />
      )}

      {showManageGroupsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">إدارة المراحل والمجموعات</h3>
              <button
                onClick={() => setShowManageGroupsModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
                <h4 className="text-lg font-bold text-gray-900 mb-4">إضافة مجموعة جديدة</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      الصف (المرحلة)
                    </label>
                    <input
                      type="text"
                      value={groupFormData.stage}
                      onChange={(e) => setGroupFormData({ ...groupFormData, stage: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="مثال: الصف الأول الثانوي"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      اسم المجموعة
                    </label>
                    <input
                      type="text"
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="مثال: مجموعة 1"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddGroup}
                  className="mt-4 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-md"
                >
                  <Plus size={20} />
                  إضافة المجموعة
                </button>
              </div>

              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">المجموعات الحالية</h4>
                {Object.entries(groupedByStage).map(([stage, stageGroups]) => (
                  <div key={stage} className="mb-6">
                    <h5 className="text-md font-bold text-emerald-800 mb-3 flex items-center gap-2 bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2 rounded-lg">
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
                              title={studentCount > 0 ? 'لا يمكن حذف مجموعة تحتوي على طلاب' : 'حذف المجموعة'}
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
