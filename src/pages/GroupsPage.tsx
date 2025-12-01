import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { supabase } from '../lib/supabase'
import { Student, Group, SpecialStatus, SchoolInfo } from '../types'
import { AddStudentModal } from '../components/AddStudentModal'
import { EditStudentModal } from '../components/EditStudentModal'
import { AllowClassEntryModal } from '../components/AllowClassEntryModal'
import { Users, Printer, UserPlus, X, Plus, ChevronDown, ChevronUp, Layers, MoreVertical, Edit2, Trash2, DoorOpen } from 'lucide-react'

export function GroupsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolName, setSchoolName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [systemDescription, setSystemDescription] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [groupFormData, setGroupFormData] = useState({
    stage: '',
    name: '',
  })
  const [showStatusDetails, setShowStatusDetails] = useState(false)
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAllowEntryModal, setShowAllowEntryModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)

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
        setTeacherName(profileRes.data.name || '')
        setSchoolName(profileRes.data.school_name || '')
        setSystemDescription(profileRes.data.system_description || '')
      }

      const { data: schoolInfoData } = await supabase
        .from('school_info')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (schoolInfoData) {
        setSchoolInfo(schoolInfoData)
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
            <p class="header-info">${systemDescription || 'برنامج إدارة الطلاب'}</p>
            <p class="header-info"><strong>الأستاذ:</strong> ${teacherName || 'اسم المعلم'}</p>
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
            <p class="header-info">${systemDescription || 'برنامج إدارة الطلاب'}</p>
            <p class="header-info"><strong>الأستاذ:</strong> ${teacherName || 'اسم المعلم'}</p>
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

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) return

    setLoadingDelete(studentId)
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (error) throw error
      fetchData()
    } finally {
      setLoadingDelete(null)
    }
  }

  const getSpecialStatusName = (statusId: string | null) => {
    if (!statusId) return '-'
    return specialStatuses.find((s) => s.id === statusId)?.name || '-'
  }

  const printStudent = async (student: Student) => {
    const specialStatusName = student.special_status_id
      ? getSpecialStatusName(student.special_status_id)
      : 'لا يوجد'
    const groupName = student.group?.name || '-'
    const now = new Date()
    const date = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>بيانات الطالب - ${student.name}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: A4;
              margin: 15mm;
            }

            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
              color: #1a1a1a;
              line-height: 1.4;
              font-size: 13px;
            }

            .page-container {
              max-width: 210mm;
              margin: 0 auto;
              background: white;
            }

            .header {
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              color: white;
              padding: 15px 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }

            .header h1 {
              font-size: 22px;
              margin-bottom: 4px;
              font-weight: 700;
            }

            .header .school-name {
              font-size: 16px;
              margin-bottom: 8px;
              opacity: 0.95;
              font-weight: 500;
            }

            .header .meta {
              font-size: 11px;
              opacity: 0.9;
              margin-top: 6px;
            }

            .content {
              padding: 20px;
            }

            .student-name-section {
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              border: 2px solid #3b82f6;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 15px;
              text-align: center;
            }

            .student-name-section h2 {
              color: #1e40af;
              font-size: 20px;
              font-weight: 700;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-bottom: 15px;
            }

            .info-item {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 10px;
            }

            .info-label {
              font-size: 11px;
              color: #6b7280;
              font-weight: 600;
              margin-bottom: 4px;
            }

            .info-value {
              font-size: 14px;
              color: #111827;
              font-weight: 600;
            }

            .footer {
              background: #f9fafb;
              padding: 15px 20px;
              border-top: 2px solid #e5e7eb;
              margin-top: 15px;
            }

            .footer-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }

            .signature-box {
              text-align: center;
            }

            .signature-label {
              font-size: 12px;
              color: #6b7280;
              font-weight: 600;
              margin-bottom: 6px;
            }

            .signature-line {
              border-top: 2px solid #374151;
              width: 150px;
              margin: 30px auto 8px;
            }

            .signature-name {
              font-size: 14px;
              color: #111827;
              font-weight: 600;
            }

            .print-info {
              text-align: center;
              color: #9ca3af;
              font-size: 10px;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
            }

            @media print {
              body {
                background: white;
              }

              .page-container {
                border: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header">
              <div class="school-name">${schoolInfo?.school_name || schoolName || 'اسم المدرسة'}</div>
              <h1>بطاقة بيانات الطالب</h1>
              <div class="meta">طُبع بتاريخ: ${date} - الساعة: ${time}${teacherName ? ' - بواسطة: ' + teacherName : ''}</div>
            </div>

            <div class="content">
              <div class="student-name-section">
                <h2>${student.name}</h2>
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">السجل المدني</div>
                  <div class="info-value">${student.national_id}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">الصف الدراسي</div>
                  <div class="info-value">${student.grade}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">الفصل</div>
                  <div class="info-value">${groupName}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">جوال الطالب</div>
                  <div class="info-value">${student.phone}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">جوال ولي الأمر</div>
                  <div class="info-value">${student.guardian_phone}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">الظروف الخاصة</div>
                  <div class="info-value">${specialStatusName}</div>
                </div>
              </div>

            </div>

            <div class="footer">
              <div class="footer-grid">
                <div class="signature-box">
                  <div class="signature-label">الأستاذ</div>
                  <div class="signature-name">${teacherName || 'اسم الأستاذ'}</div>
                  <div class="signature-line"></div>
                  <div style="font-size: 11px; color: #6b7280;">التوقيع</div>
                </div>

                <div class="signature-box">
                  <div class="signature-label">الإدارة</div>
                  <div class="signature-line"></div>
                  <div style="font-size: 11px; color: #6b7280;">التوقيع والختم</div>
                </div>
              </div>

              <div class="print-info">
                هذه الوثيقة صادرة من الإرشاد الطلابي
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
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
                            <div className="p-4 space-y-2">
                              {groupStudents.map((student) => {
                                const hasSpecialStatus = student.special_status_id !== null
                                const bgColorClass = hasSpecialStatus
                                  ? 'bg-amber-50 border-amber-200'
                                  : 'bg-gradient-to-l from-[#fef5e7] to-[#fef9f0] border-[#f0d9b5]'

                                return (
                                  <div
                                    key={student.id}
                                    className={`${bgColorClass} rounded-xl shadow-sm border hover:shadow-md transition-all relative`}
                                  >
                                    <div className="px-5 py-4">
                                      <div className="flex items-center justify-between gap-4">
                                        <div className="text-right">
                                          <div className="text-xs text-gray-500 mb-0.5">الاسم</div>
                                          <h4 className="font-bold text-gray-900 text-base">{student.name}</h4>
                                          <p className="text-xs text-gray-600 mt-0.5">السجل: {student.national_id}</p>
                                        </div>

                                        <div className="flex items-center gap-3 flex-shrink-0">
                                          {student.special_status_id && (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                              {showStatusDetails ? getSpecialStatusName(student.special_status_id) : 'لديه حالة خاصة'}
                                            </span>
                                          )}
                                          {student.status === 'استئذان' && (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                              استئذان
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-6 flex-1">
                                          <div className="text-right min-w-[120px]">
                                            <div className="text-xs text-gray-500 mb-0.5">جوال</div>
                                            <div className="text-sm font-semibold text-gray-800 direction-ltr text-right">{student.phone}</div>
                                          </div>

                                          <div className="text-right min-w-[120px]">
                                            <div className="text-xs text-gray-500 mb-0.5">ولي أمر</div>
                                            <div className="text-sm font-semibold text-gray-800 direction-ltr text-right">{student.guardian_phone}</div>
                                          </div>

                                          <div className="text-right min-w-[80px]">
                                            <div className="text-xs text-gray-500 mb-0.5">الصف</div>
                                            <div className="text-sm font-semibold text-gray-800">{student.grade}</div>
                                          </div>
                                        </div>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setExpandedStudentId(expandedStudentId === student.id ? null : student.id)
                                          }}
                                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm shadow-sm transition-colors flex-shrink-0 relative z-10 flex items-center gap-2"
                                        >
                                          خيارات
                                          <ChevronDown size={16} className={`transition-transform ${expandedStudentId === student.id ? 'rotate-180' : ''}`} />
                                        </button>
                                      </div>

                                      {expandedStudentId === student.id && (
                                        <div className="mt-4 pt-4 border-t border-gray-300/50 space-y-2">
                                          <button
                                            onClick={() => {
                                              setSelectedStudent(student)
                                              setShowAllowEntryModal(true)
                                              setExpandedStudentId(null)
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded font-medium text-sm shadow-sm"
                                          >
                                            <DoorOpen size={16} />
                                            السماح بدخول الفصل
                                          </button>

                                          <button
                                            onClick={() => {
                                              printStudent(student)
                                              setExpandedStudentId(null)
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-800 rounded font-medium text-sm border border-slate-300 shadow-sm"
                                          >
                                            <Printer size={16} />
                                            طباعة بيانات الطالب
                                          </button>

                                          <button
                                            onClick={() => {
                                              setExpandedStudentId(null)
                                              setSelectedStudent(student)
                                              setShowEditModal(true)
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 hover:from-amber-200 hover:to-yellow-200 text-amber-900 rounded font-medium text-sm border border-amber-300 shadow-sm"
                                          >
                                            <Edit2 size={16} />
                                            تعديل
                                          </button>

                                          <button
                                            onClick={() => handleDeleteStudent(student.id)}
                                            disabled={loadingDelete === student.id}
                                            className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-100 to-rose-100 hover:from-red-200 hover:to-rose-200 text-red-700 rounded font-medium text-sm border border-red-300 shadow-sm disabled:opacity-50"
                                          >
                                            <Trash2 size={16} />
                                            {loadingDelete === student.id ? 'جاري...' : 'حذف'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
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

      {showEditModal && selectedStudent && (
        <EditStudentModal
          student={selectedStudent}
          groups={groups}
          specialStatuses={specialStatuses}
          onClose={() => {
            setShowEditModal(false)
            setSelectedStudent(null)
          }}
          onStudentUpdated={fetchData}
        />
      )}

      <AllowClassEntryModal
        isOpen={showAllowEntryModal}
        onClose={() => {
          setShowAllowEntryModal(false)
          setSelectedStudent(null)
        }}
        student={selectedStudent}
      />

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
