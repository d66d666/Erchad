import { useState, useEffect } from 'react'
import { X, Plus, Layers, Trash2, Edit2, ChevronUp, ChevronDown, Printer, UserPlus } from 'lucide-react'
import { db } from '../lib/db'
import { Group, Student, SpecialStatus } from '../types'
import { AddStudentModal } from '../components/AddStudentModal'
import { CustomAlert } from '../components/CustomAlert'
import { normalizeArabicText } from '../lib/normalizeArabic'

export function GroupsManagementPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [teacherName, setTeacherName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [newStage, setNewStage] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState('')
  const [editStage, setEditStage] = useState('')
  const [showStatusDetails, setShowStatusDetails] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success')
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(() => {
    const allStages = {} as Record<string, boolean>
    return allStages
  })

  useEffect(() => {
    fetchGroups()
    fetchStudentCounts()
    fetchStudents()
    fetchSpecialStatuses()
    fetchTeacherProfile()
  }, [])

  useEffect(() => {
    setExpandedStages(prev => {
      const newStages = {} as Record<string, boolean>
      groups.forEach(group => {
        if (prev[group.stage] !== undefined) {
          newStages[group.stage] = prev[group.stage]
        } else {
          newStages[group.stage] = false
        }
      })
      return newStages
    })
  }, [groups])

  const fetchGroups = async () => {
    const allGroups = await db.groups.orderBy('display_order').toArray()
    setGroups(allGroups)
  }

  const fetchStudents = async () => {
    const allStudents = await db.students.toArray()
    const allStatuses = await db.special_statuses.toArray()

    const mappedStudents = allStudents.map((s) => ({
      ...s,
      civil_id: s.national_id,
      special_status: s.special_status_id ? allStatuses.find(st => st.id === s.special_status_id)?.name || null : null
    }))

    setStudents(mappedStudents as Student[])
  }

  const fetchStudentCounts = async () => {
    const studentsToCount = await db.students.toArray()
    const counts: Record<string, number> = {}

    studentsToCount.forEach(student => {
      if (student.group_id) {
        counts[student.group_id] = (counts[student.group_id] || 0) + 1
      }
    })

    setStudentCounts(counts)
  }

  const fetchSpecialStatuses = async () => {
    const allStatuses = await db.special_statuses.orderBy('name').toArray()
    setSpecialStatuses(allStatuses)
  }

  const fetchTeacherProfile = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    const profile = await db.teacher_profile.where('id').equals(userId).first()

    if (profile) {
      setTeacherName(profile.name || '')
      setSchoolName(profile.school_name || '')
    }
  }

  const printGroup = (group: Group, groupStudents: Student[], includeStatus: boolean = showStatusDetails) => {
    const now = new Date()
    const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic')
    const gregorianDate = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const sortedStudents = sortStudentsAlphabetically(groupStudents)

    const printWindow = window.open('', '', 'width=1000,height=800')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>طباعة ${group.name}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4 portrait; margin: 20mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
              color: #000;
              font-size: 13px;
            }
            .page-header {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 1px solid #ddd;
            }
            .school-header {
              text-align: center;
              margin-bottom: 20px;
              padding: 20px;
              border: 2px solid #7c3aed;
              border-radius: 12px;
              background: linear-gradient(to bottom, #faf5ff 0%, #f3e8ff 100%);
            }
            .school-name {
              font-size: 22px;
              font-weight: 700;
              color: #6d28d9;
              margin-bottom: 8px;
            }
            .teacher-info {
              display: flex;
              justify-content: center;
              gap: 20px;
              font-size: 12px;
              color: #6d28d9;
            }
            .meta-info {
              text-align: center;
              font-size: 11px;
              color: #666;
              margin-bottom: 15px;
            }
            .stage-title {
              text-align: center;
              margin: 20px 0 15px 0;
            }
            .stage-title h2 {
              font-size: 20px;
              font-weight: 700;
              color: #7c3aed;
              padding: 10px 20px;
              border-top: 2px solid #7c3aed;
              border-bottom: 2px solid #7c3aed;
              display: inline-block;
            }
            .group-name-box {
              text-align: center;
              margin: 15px 0;
            }
            .group-name {
              font-size: 18px;
              font-weight: 700;
              color: #7c3aed;
              display: inline-block;
              padding: 8px 20px;
              background: #f3e8ff;
              border-radius: 8px;
            }
            .student-count-box {
              text-align: right;
              font-size: 14px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #7c3aed;
            }
            th, td {
              padding: 10px 8px;
              text-align: center;
              border: 1px solid #cbd5e1;
              font-size: 12px;
            }
            th {
              background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
              color: white;
              font-weight: 600;
            }
            td { background: #fafafa; }
            tr:nth-child(even) td { background: #ffffff; }
            .phone-cell { direction: ltr; text-align: center; }
            .page-footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            <div>${time} ${gregorianDate}</div>
            <div>منسق الشؤون الطلابية</div>
          </div>

          <div class="school-header">
            <h1 class="school-name">${schoolName}</h1>
            <div class="teacher-info">
              <div>برنامج إدارة الطلاب</div>
              <div>${teacherName || 'المعلم'}</div>
            </div>
          </div>

          <div class="meta-info">
            <div>طُبع بتاريخ: ${hijriDate} هـ - ${gregorianDate} م</div>
          </div>

          <div class="stage-title">
            <h2>${group.stage || 'المرحلة'}</h2>
          </div>

          <div class="group-name-box">
            <div class="group-name">${group.name}</div>
          </div>

          <div class="student-count-box">
            عدد الطلاب: ${sortedStudents.length}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">التسلسل</th>
                <th style="width: ${includeStatus ? '28%' : '33%'}">اسم الطالب</th>
                <th style="width: ${includeStatus ? '22%' : '27%'}">السجل المدني</th>
                <th style="width: ${includeStatus ? '15%' : '20%'}">جوال الطالب</th>
                <th style="width: ${includeStatus ? '15%' : '20%'}">جوال ولي الأمر</th>
                ${includeStatus ? '<th style="width: 15%">الحالة الخاصة</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${sortedStudents.map((student, index) => {
                const specialStatus = student.special_status_id
                  ? specialStatuses.find(s => s.id === student.special_status_id)?.name || '-'
                  : ''
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td><strong>${student.name}</strong></td>
                    <td>${student.national_id}</td>
                    <td class="phone-cell">${student.phone}</td>
                    <td class="phone-cell">${student.guardian_phone}</td>
                    ${includeStatus ? `<td>${specialStatus}</td>` : ''}
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <div class="page-footer">
            <div>1/1</div>
            <div>about:blank</div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const printAllGroups = (includeStatus: boolean = showStatusDetails) => {
    const now = new Date()
    const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic')
    const gregorianDate = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const printWindow = window.open('', '', 'width=1000,height=800')
    if (!printWindow) return

    // ترتيب المجموعات حسب المرحلة أولاً ثم حسب display_order
    const sortedGroups = [...groups].sort((a, b) => {
      const stageOrderA = stageOrder[a.stage] || 999
      const stageOrderB = stageOrder[b.stage] || 999

      if (stageOrderA !== stageOrderB) {
        return stageOrderA - stageOrderB
      }

      return (a.display_order || 999) - (b.display_order || 999)
    })

    const allGroupsHTML = sortedGroups.map((group, groupIndex) => {
      const groupStudents = students.filter(s => s.group_id === group.id)
      const sortedStudents = sortStudentsAlphabetically(groupStudents)

      return `
        <div class="page-section" style="${groupIndex < sortedGroups.length - 1 ? 'page-break-after: always;' : ''}">
          <div class="page-header">
            <div>${time} ${gregorianDate}</div>
            <div>منسق الشؤون الطلابية</div>
          </div>

          <div class="school-header">
            <h1 class="school-name">${schoolName}</h1>
            <div class="teacher-info">
              <div>برنامج إدارة الطلاب</div>
              <div>${teacherName || 'المعلم'}</div>
            </div>
          </div>

          <div class="meta-info">
            <div>طُبع بتاريخ: ${hijriDate} هـ - ${gregorianDate} م</div>
          </div>

          <div class="stage-title">
            <h2>${group.stage || 'المرحلة'}</h2>
          </div>

          <div class="group-name-box">
            <div class="group-name">${group.name}</div>
          </div>

          <div class="student-count-box">
            عدد الطلاب: ${sortedStudents.length}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">التسلسل</th>
                <th style="width: ${includeStatus ? '28%' : '33%'}">اسم الطالب</th>
                <th style="width: ${includeStatus ? '22%' : '27%'}">السجل المدني</th>
                <th style="width: ${includeStatus ? '15%' : '20%'}">جوال الطالب</th>
                <th style="width: ${includeStatus ? '15%' : '20%'}">جوال ولي الأمر</th>
                ${includeStatus ? '<th style="width: 15%">الحالة الخاصة</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${sortedStudents.map((student, index) => {
                const specialStatus = student.special_status_id
                  ? specialStatuses.find(s => s.id === student.special_status_id)?.name || '-'
                  : ''
                return `
                  <tr>
                    <td>${index + 1}</td>
                    <td><strong>${student.name}</strong></td>
                    <td>${student.national_id}</td>
                    <td class="phone-cell">${student.phone}</td>
                    <td class="phone-cell">${student.guardian_phone}</td>
                    ${includeStatus ? `<td>${specialStatus}</td>` : ''}
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <div class="page-footer">
            <div>${groupIndex + 1}/${sortedGroups.length}</div>
            <div>about:blank</div>
          </div>
        </div>
      `
    }).join('')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>طباعة جميع المجموعات</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4 portrait; margin: 20mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
              color: #000;
              font-size: 13px;
              line-height: 1.4;
            }
            .page-section {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .page-header {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 1px solid #ddd;
            }
            .school-header {
              text-align: center;
              margin-bottom: 20px;
              padding: 20px;
              border: 2px solid #7c3aed;
              border-radius: 12px;
              background: linear-gradient(to bottom, #faf5ff 0%, #f3e8ff 100%);
            }
            .school-name {
              font-size: 22px;
              font-weight: 700;
              color: #6d28d9;
              margin-bottom: 8px;
            }
            .teacher-info {
              display: flex;
              justify-content: center;
              gap: 20px;
              font-size: 12px;
              color: #6d28d9;
            }
            .meta-info {
              text-align: center;
              font-size: 11px;
              color: #666;
              margin-bottom: 15px;
            }
            .stage-title {
              text-align: center;
              margin: 20px 0 15px 0;
            }
            .stage-title h2 {
              font-size: 20px;
              font-weight: 700;
              color: #7c3aed;
              padding: 10px 20px;
              border-top: 2px solid #7c3aed;
              border-bottom: 2px solid #7c3aed;
              display: inline-block;
            }
            .group-name-box {
              text-align: center;
              margin: 15px 0;
            }
            .group-name {
              font-size: 18px;
              font-weight: 700;
              color: #7c3aed;
              display: inline-block;
              padding: 8px 20px;
              background: #f3e8ff;
              border-radius: 8px;
            }
            .student-count-box {
              text-align: right;
              font-size: 14px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              border: 2px solid #7c3aed;
            }
            th, td {
              padding: 10px 8px;
              text-align: center;
              border: 1px solid #cbd5e1;
              font-size: 12px;
            }
            th {
              background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%);
              color: white;
              font-weight: 600;
            }
            td {
              background: #fafafa;
            }
            tr:nth-child(even) td {
              background: #ffffff;
            }
            td strong {
              font-weight: 600;
            }
            .phone-cell {
              direction: ltr;
              text-align: center;
            }
            .page-footer {
              margin-top: auto;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #999;
            }
            @media print {
              body { background: white; }
              .page-section {
                page-break-after: always;
                min-height: auto;
              }
              .page-section:last-child {
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          ${allGroupsHTML}

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 300);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStage.trim() || !newGroupName.trim()) return

    setLoading(true)
    try {
      // Get max order from IndexedDB
      const stageGroups = await db.groups.where('stage').equals(newStage.trim()).toArray()

      const maxOrder = stageGroups && stageGroups.length > 0
        ? Math.max(...stageGroups.map(g => g.display_order || 0))
        : 0

      const newGroup = {
        id: crypto.randomUUID(),
        stage: newStage.trim(),
        name: newGroupName.trim(),
        display_order: maxOrder + 1,
        created_at: new Date().toISOString(),
      }

      // Add to IndexedDB
      await db.groups.add(newGroup)

      setNewStage('')
      setNewGroupName('')
      await fetchGroups()
      await fetchStudentCounts()
      setAlertMessage('تمت إضافة المجموعة بنجاح')
      setAlertType('success')
      setShowAlert(true)
    } catch (error) {
      console.error('Error adding group:', error)
      setAlertMessage('حدث خطأ أثناء إضافة المجموعة')
      setAlertType('error')
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (id: string) => {
    const studentCount = studentCounts[id] || 0

    if (studentCount > 0) {
      setAlertMessage(`لا يمكن حذف هذه المجموعة لأنها تحتوي على ${studentCount} طالب/طالبة`)
      setAlertType('error')
      setShowAlert(true)
      return
    }

    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return

    try {
      // Delete from IndexedDB
      await db.groups.delete(id)
      await fetchGroups()
      await fetchStudentCounts()
      setAlertMessage('تم حذف المجموعة بنجاح')
      setAlertType('success')
      setShowAlert(true)
    } catch (error) {
      console.error('Error deleting group:', error)
      setAlertMessage('حدث خطأ أثناء حذف المجموعة')
      setAlertType('error')
      setShowAlert(true)
    }
  }

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group)
    setEditName(group.name)
    setEditStage(group.stage)
  }

  const handleSaveEdit = async () => {
    if (!editingGroup || !editName.trim() || !editStage.trim()) return

    try {
      // Update in IndexedDB
      await db.groups.update(editingGroup.id, {
        name: editName.trim(),
        stage: editStage.trim(),
      })

      setEditingGroup(null)
      setEditName('')
      setEditStage('')
      await fetchGroups()
    } catch (error) {
      console.error('Error updating group:', error)
      setAlertMessage('حدث خطأ أثناء تحديث المجموعة')
      setAlertType('error')
      setShowAlert(true)
    }
  }

  const handleCancelEdit = () => {
    setEditingGroup(null)
    setEditName('')
    setEditStage('')
  }

  const handleMoveUp = async (group: Group, stageGroups: Group[]) => {
    const currentIndex = stageGroups.findIndex(g => g.id === group.id)
    if (currentIndex === 0) return

    const prevGroup = stageGroups[currentIndex - 1]
    const currentOrder = group.display_order || currentIndex + 1
    const prevOrder = prevGroup.display_order || currentIndex

    try {
      // Update in IndexedDB
      await db.groups.update(group.id, { display_order: prevOrder })
      await db.groups.update(prevGroup.id, { display_order: currentOrder })
      await fetchGroups()
    } catch (error) {
      console.error('Error moving group:', error)
    }
  }

  const handleMoveDown = async (group: Group, stageGroups: Group[]) => {
    const currentIndex = stageGroups.findIndex(g => g.id === group.id)
    if (currentIndex === stageGroups.length - 1) return

    const nextGroup = stageGroups[currentIndex + 1]
    const currentOrder = group.display_order || currentIndex + 1
    const nextOrder = nextGroup.display_order || currentIndex + 2

    try {
      // Update in IndexedDB
      await db.groups.update(group.id, { display_order: nextOrder })
      await db.groups.update(nextGroup.id, { display_order: currentOrder })
      await fetchGroups()
    } catch (error) {
      console.error('Error moving group:', error)
    }
  }

  const stageOrder: Record<string, number> = {
    'الصف الأول الابتدائي': 1,
    'الصف الثاني الابتدائي': 2,
    'الصف الثالث الابتدائي': 3,
    'الصف الرابع الابتدائي': 4,
    'الصف الخامس الابتدائي': 5,
    'الصف السادس الابتدائي': 6,
    'الصف الأول المتوسط': 7,
    'الصف الثاني المتوسط': 8,
    'الصف الثالث المتوسط': 9,
    'الصف الاول الثانوي': 10,
    'الصف الأول الثانوي': 10,
    'الصف الثاني الثانوي': 11,
    'الصف الثالث الثانوي': 12,
  }

  const groupedByStage = groups.reduce((acc, group) => {
    if (!acc[group.stage]) {
      acc[group.stage] = []
    }
    acc[group.stage].push(group)
    return acc
  }, {} as Record<string, Group[]>)

  const sortedStages = Object.entries(groupedByStage).sort((a, b) => {
    const orderA = stageOrder[a[0]] || 999
    const orderB = stageOrder[b[0]] || 999
    return orderA - orderB
  })

  const getStudentCount = (groupId: string) => {
    return studentCounts[groupId] || 0
  }

  const getStageStudentsForGroup = (groupId: string) => {
    return students.filter(s => s.group_id === groupId)
  }

  const sortStudentsAlphabetically = (students: Student[]) => {
    return [...students].sort((a, b) => {
      const nameA = normalizeArabicText(a.name)
      const nameB = normalizeArabicText(b.name)
      return nameA.localeCompare(nameB, 'ar')
    })
  }

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stage]: !prev[stage]
    }))
  }

  const getStageColor = (stage: string) => {
    const colors = {
      'الصف الأول الابتدائي': { bg: 'from-slate-600 to-slate-700', light: 'from-slate-50 to-slate-100', border: 'border-slate-300' },
      'الصف الثاني الابتدائي': { bg: 'from-gray-600 to-gray-700', light: 'from-gray-50 to-gray-100', border: 'border-gray-300' },
      'الصف الثالث الابتدائي': { bg: 'from-zinc-600 to-zinc-700', light: 'from-zinc-50 to-zinc-100', border: 'border-zinc-300' },
      'الصف الرابع الابتدائي': { bg: 'from-stone-600 to-stone-700', light: 'from-stone-50 to-stone-100', border: 'border-stone-300' },
      'الصف الخامس الابتدائي': { bg: 'from-neutral-600 to-neutral-700', light: 'from-neutral-50 to-neutral-100', border: 'border-neutral-300' },
      'الصف السادس الابتدائي': { bg: 'from-slate-700 to-slate-800', light: 'from-slate-50 to-slate-100', border: 'border-slate-300' },
      'الصف الأول المتوسط': { bg: 'from-gray-700 to-gray-800', light: 'from-gray-50 to-gray-100', border: 'border-gray-300' },
      'الصف الثاني المتوسط': { bg: 'from-zinc-700 to-zinc-800', light: 'from-zinc-50 to-zinc-100', border: 'border-zinc-300' },
      'الصف الثالث المتوسط': { bg: 'from-stone-700 to-stone-800', light: 'from-stone-50 to-stone-100', border: 'border-stone-300' },
      'الصف الأول الثانوي': { bg: 'from-neutral-700 to-neutral-800', light: 'from-neutral-50 to-neutral-100', border: 'border-neutral-300' },
      'الصف الثاني الثانوي': { bg: 'from-slate-800 to-slate-900', light: 'from-slate-50 to-slate-100', border: 'border-slate-300' },
      'الصف الثالث الثانوي': { bg: 'from-gray-800 to-gray-900', light: 'from-gray-50 to-gray-100', border: 'border-gray-300' },
    }
    return colors[stage as keyof typeof colors] || { bg: 'from-gray-600 to-gray-700', light: 'from-gray-50 to-gray-100', border: 'border-gray-300' }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-100 via-green-100 to-teal-100 rounded-xl shadow-md border border-emerald-200 p-5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={showStatusDetails}
              onChange={(e) => setShowStatusDetails(e.target.checked)}
              className="w-5 h-5 rounded cursor-pointer"
            />
            <span className="text-emerald-800 font-semibold">إظهار تفاصيل الحالة</span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
            >
              <UserPlus size={16} />
              <span>إضافة طالب</span>
            </button>
            <button
              onClick={() => setShowManageModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-all shadow-sm"
            >
              <Layers size={16} />
              <span>إدارة المجموعات</span>
            </button>
            <button
              onClick={() => printAllGroups(showStatusDetails)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-all shadow-sm"
            >
              <Printer size={16} />
              <span>طباعة الكل</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedStages.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center text-gray-500">
            لا توجد مجموعات حالياً
          </div>
        ) : (
          sortedStages.map(([stage, stageGroups]) => {
            const colors = getStageColor(stage)
            const isExpanded = expandedStages[stage]
            const totalStudents = stageGroups.reduce((sum, g) => sum + getStudentCount(g.id), 0)

            return (
              <div key={stage} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <button
                  onClick={() => toggleStage(stage)}
                  className={`w-full bg-gradient-to-r ${colors.bg} px-6 py-4 flex items-center justify-between hover:opacity-90 transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <Layers size={20} className="text-white" />
                    <h3 className="text-lg font-bold text-white text-right">{stage}</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white/90 font-medium">
                      {totalStudents} طالب في {stageGroups.length} مجموعة
                    </span>
                    {isExpanded ? <ChevronUp className="text-white" size={24} /> : <ChevronDown className="text-white" size={24} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 pb-4 space-y-4">
                    {stageGroups
                      .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
                      .map((group, index) => {
                        const groupStudents = getStageStudentsForGroup(group.id)

                        return (
                          <div key={group.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                            {editingGroup?.id === group.id ? (
                              <div className="p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <input
                                    type="text"
                                    value={editStage}
                                    onChange={(e) => setEditStage(e.target.value)}
                                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="الصف"
                                  />
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="اسم المجموعة"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-semibold transition-colors"
                                  >
                                    حفظ
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="flex-1 bg-gray-400 hover:bg-gray-500 text-white py-2 rounded-lg font-semibold transition-colors"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
                                  <div className="flex items-center justify-between">
                                    <div className="text-left">
                                      <h4 className="text-2xl font-bold text-white mb-1">{group.name}</h4>
                                      <p className="text-sm text-white/90">
                                        عدد الطلاب: {getStudentCount(group.id)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <button
                                        onClick={() => setShowAddStudentModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-cyan-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
                                      >
                                        <UserPlus size={16} />
                                        <span>إضافة طالب</span>
                                      </button>
                                      <button
                                        onClick={() => printGroup(group, getStageStudentsForGroup(group.id), showStatusDetails)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white text-cyan-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
                                      >
                                        <Printer size={16} />
                                        <span>طباعة</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {groupStudents.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full" dir="rtl">
                                      <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">الاسم</th>
                                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">السجل المدني</th>
                                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">جوال الطالب</th>
                                          <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">جوال ولي الأمر</th>
                                          {showStatusDetails && (
                                            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">الحالة الخاصة</th>
                                          )}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {sortStudentsAlphabetically(groupStudents).map((student, idx) => (
                                          <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{student.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 text-right">{student.civil_id || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 text-right">{student.phone || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 text-right">{student.guardian_phone || '-'}</td>
                                            {showStatusDetails && (
                                              <td className="px-6 py-4 text-sm text-gray-900 text-right">
                                                {student.special_status ? (
                                                  <span className="inline-block px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                                                    {student.special_status}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-400">-</span>
                                                )}
                                              </td>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="px-6 py-8 text-center text-gray-500">
                                    لا يوجد طلاب في هذه المجموعة
                                  </div>
                                )}

                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={showStatusDetails}
                                        onChange={(e) => setShowStatusDetails(e.target.checked)}
                                        className="w-4 h-4 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500"
                                      />
                                      <span>إظهار تفاصيل الحالة</span>
                                    </label>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleMoveUp(group, stageGroups)}
                                      disabled={index === 0}
                                      className="text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="تحريك لأعلى"
                                    >
                                      <ChevronUp size={18} />
                                    </button>
                                    <button
                                      onClick={() => handleMoveDown(group, stageGroups)}
                                      disabled={index === stageGroups.length - 1}
                                      className="text-gray-600 hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="تحريك لأسفل"
                                    >
                                      <ChevronDown size={18} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleEditGroup(group)}
                                      className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"
                                      title="تعديل المجموعة"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGroup(group.id)}
                                      className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                                      title="حذف المجموعة"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {showManageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers size={28} />
                <h2 className="text-2xl font-bold">إدارة المراحل والمجموعات</h2>
              </div>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-700 mb-4">إضافة مجموعة جديدة</h3>

                <form onSubmit={handleAddGroup} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-right">
                        الصف (المرحلة)
                      </label>
                      <select
                        value={newStage}
                        onChange={(e) => setNewStage(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right bg-white/70"
                        required
                      >
                        <option value="">اختر المرحلة</option>
                        <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                        <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                        <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                        <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                        <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                        <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                        <option value="الصف الأول المتوسط">الصف الأول المتوسط</option>
                        <option value="الصف الثاني المتوسط">الصف الثاني المتوسط</option>
                        <option value="الصف الثالث المتوسط">الصف الثالث المتوسط</option>
                        <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
                        <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                        <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 text-right">
                        اسم المجموعة
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: مجموعة 1"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right bg-white/70"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !newStage.trim() || !newGroupName.trim()}
                    className="w-full bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white py-2 text-sm rounded-lg font-semibold transition-colors"
                  >
                    إضافة المجموعة
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddStudentModal && (
        <AddStudentModal
          onClose={() => setShowAddStudentModal(false)}
          onStudentAdded={() => {
            fetchStudents()
            fetchStudentCounts()
          }}
        />
      )}
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
