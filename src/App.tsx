import { useEffect, useState } from 'react'
import { db } from './lib/db'
import { Student, Group, SpecialStatus } from './types'
import { LoginPage } from './pages/LoginPage'
import { TeachersPage } from './pages/TeachersPage'
import { GroupsManagementPage } from './pages/GroupsManagementPage'
import { SpecialStatusPage } from './pages/SpecialStatusPage'
import { ReceptionPage } from './pages/ReceptionPage'
import { PermissionPage } from './pages/PermissionPage'
import { AbsencePage } from './pages/AbsencePage'
import { ProfileSettings } from './components/ProfileSettings'
import { ExcelImportModal } from './components/ExcelImportModal'
import { AddStudentModal } from './components/AddStudentModal'
import { formatPhoneForWhatsApp } from './lib/formatPhone'
import {
  Home,
  Users,
  Star,
  AlertCircle,
  UserCheck,
  LogOut,
  Download,
  Settings,
  GraduationCap,
  Search,
  User as UserIcon,
  ChevronDown,
  Printer,
  MessageCircle,
  RotateCcw,
  X,
  Upload,
  FileSpreadsheet,
  Shield,
  List,
  Plus,
  Trash2,
  Layers,
  LayoutGrid,
  ListChecks,
  Check,
  Edit,
  DoorOpen,
} from 'lucide-react'

type Page = 'home' | 'groups' | 'special-status' | 'absence' | 'reception' | 'permission' | 'teachers'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [teacherPhone, setTeacherPhone] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [systemDescription, setSystemDescription] = useState('')
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showExcelImport, setShowExcelImport] = useState(false)
  const [showDataImport, setShowDataImport] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printStudent, setPrintStudent] = useState<Student | null>(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [showManageSpecialStatusModal, setShowManageSpecialStatusModal] = useState(false)
  const [newStatusName, setNewStatusName] = useState('')
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false)
  const [newStage, setNewStage] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [showManageHeaderModal, setShowManageHeaderModal] = useState(false)
  const [studentMenuOpen, setStudentMenuOpen] = useState<string | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAllowEntryModal, setShowAllowEntryModal] = useState(false)
  const [allowEntryStudent, setAllowEntryStudent] = useState<Student | null>(null)
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [teachers, setTeachers] = useState<any[]>([])

  const [headerCards, setHeaderCards] = useState({
    totalStudents: true,
    reception: true,
    teachers: true,
    permission: true,
    violations: true,
  })

  const [mainMenuItems, setMainMenuItems] = useState({
    teachers: true,
    groups: true,
    specialNeeds: true,
    reception: true,
    permission: true,
    violations: true,
  })

  // فلاتر
  const [specialStatusFilter, setSpecialStatusFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [activityFilter, setActivityFilter] = useState<string>('all')
  const [todayReceptionStudents, setTodayReceptionStudents] = useState<Set<string>>(new Set())
  const [todayPermissionStudents, setTodayPermissionStudents] = useState<Set<string>>(new Set())
  const [todayViolationStudents, setTodayViolationStudents] = useState<Set<string>>(new Set())

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  // دالة ترتيب المراحل الدراسية بشكل صحيح
  const sortStages = (stages: string[]) => {
    const stageOrder = [
      'الصف الأول الابتدائي',
      'الصف الثاني الابتدائي',
      'الصف الثالث الابتدائي',
      'الصف الرابع الابتدائي',
      'الصف الخامس الابتدائي',
      'الصف السادس الابتدائي',
      'الصف الأول المتوسط',
      'الصف الثاني المتوسط',
      'الصف الثالث المتوسط',
      'الأول الثانوي',
      'الصف الأول الثانوي',
      'الثاني الثانوي',
      'الصف الثاني الثانوي',
      'الثالث الثانوي',
      'الصف الثالث الثانوي',
    ]

    return stages.sort((a, b) => {
      const indexA = stageOrder.indexOf(a)
      const indexB = stageOrder.indexOf(b)

      if (indexA === -1 && indexB === -1) return a.localeCompare(b, 'ar')
      if (indexA === -1) return 1
      if (indexB === -1) return -1

      return indexA - indexB
    })
  }

  const fetchTodayStats = async () => {
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const todayStart = `${year}-${month}-${day}T00:00:00`
      const todayEnd = `${year}-${month}-${day}T23:59:59`

      const [visitsData, permissionsData, violationsData] = await Promise.all([
        db.student_visits
          .where('visit_date')
          .between(todayStart, todayEnd, true, true)
          .toArray(),
        db.student_permissions
          .where('permission_date')
          .between(todayStart, todayEnd, true, true)
          .toArray(),
        db.student_violations
          .where('violation_date')
          .between(todayStart, todayEnd, true, true)
          .toArray(),
      ])

      setTodayReceptionCount(visitsData.length)
      setTodayPermissionsCount(permissionsData.length)
      setTodayViolationsCount(violationsData.length)

      setTodayReceptionStudents(new Set(visitsData.map(v => v.student_id)))
      setTodayPermissionStudents(new Set(permissionsData.map(p => p.student_id)))
      setTodayViolationStudents(new Set(violationsData.map(v => v.student_id)))
    } catch (error) {
      console.error('Error fetching today stats:', error)
    }
  }

  const fetchTeachersCount = async () => {
    try {
      const count = await db.teachers.count()
      setTotalTeachers(count)
    } catch (error) {
      console.error('Error fetching teachers count:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      const [groupsData, statusesData, studentsData, profileData] = await Promise.all([
        db.groups.toArray(),
        db.special_statuses.toArray(),
        db.students.toArray(),
        db.teacher_profile.toCollection().first(),
      ])

      setGroups(groupsData)
      setSpecialStatuses(statusesData)
      setStudents(studentsData as Student[])

      if (profileData) {
        setTeacherName(profileData.name || '')
        setTeacherPhone(profileData.phone || '')
        setSchoolName(profileData.school_name || '')
        setSystemDescription(profileData.system_description || '')
      } else {
        setTeacherName('')
        setTeacherPhone('')
        setSchoolName('')
        setSystemDescription('')
      }

      await fetchTodayStats()
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    const userId = localStorage.getItem('userId')
    const isMaster = userId === 'master-admin'

    setIsLoggedIn(loggedIn)
    setIsMasterAdmin(isMaster)

    if (loggedIn) {
      fetchData()
      fetchTodayStats()
      fetchTeachersCount()
      fetchTeachers()
    } else {
      setLoading(false)
    }
  }, [])

  async function fetchTeachers() {
    const { data } = await supabase
      .from('teachers')
      .select('*')
      .order('name')

    if (data) {
      setTeachers(data)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) return

    const autoLogoutMinutes = localStorage.getItem('autoLogoutMinutes')
    if (!autoLogoutMinutes || autoLogoutMinutes === 'disabled') return

    const timeoutMs = parseInt(autoLogoutMinutes) * 60 * 1000
    let logoutTimer: number

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer)
      logoutTimer = setTimeout(() => {
        handleLogout()
        alert('تم تسجيل الخروج تلقائياً بسبب عدم النشاط')
      }, timeoutMs)
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, resetTimer)
    })

    resetTimer()

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer)
      events.forEach(event => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (currentPage === 'home') {
      fetchTeachersCount()
    }
  }, [currentPage])

  useEffect(() => {
    const handleClickOutside = () => setStudentMenuOpen(null)
    if (studentMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [studentMenuOpen])

  useEffect(() => {
    if (searchTerm.trim() !== '') {
      const matchingGroups = new Set<string>()

      groups.forEach(group => {
        const hasMatchingStudents = students.some(student =>
          student.group_id === group.id && (
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.national_id.includes(searchTerm) ||
            student.phone.includes(searchTerm) ||
            student.guardian_phone.includes(searchTerm)
          )
        )

        if (hasMatchingStudents) {
          matchingGroups.add(group.stage || '')
          matchingGroups.add(group.id)
        }
      })

      setExpandedGroups(matchingGroups)
    } else if (stageFilter !== 'all' || groupFilter !== 'all') {
      // إذا تم اختيار مرحلة أو مجموعة من الفلاتر، افتحها تلقائياً
      const matchingGroups = new Set<string>()

      groups.forEach(group => {
        const stageMatches = stageFilter === 'all' || group.stage === stageFilter
        const groupMatches = groupFilter === 'all' || group.id === groupFilter

        if (stageMatches && groupMatches) {
          matchingGroups.add(group.stage || '')
          matchingGroups.add(group.id)
        }
      })

      setExpandedGroups(matchingGroups)
    } else {
      setExpandedGroups(new Set())
    }
  }, [searchTerm, students, groups, stageFilter, groupFilter])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userId')
    setIsLoggedIn(false)
    setCurrentPage('home')
    setTeacherName('')
    setTeacherPhone('')
    setSchoolName('')
    setSystemDescription('')
  }

  const handleLogin = () => {
    setIsLoggedIn(true)
    fetchData()
    fetchTodayStats()
    fetchTeachersCount()
  }


  const handleAddSpecialStatus = async () => {
    if (!newStatusName.trim()) return

    const { data, error } = await supabase
      .from('special_statuses')
      .insert([{ name: newStatusName.trim() }])
      .select()
      .single()

    if (!error && data) {
      setNewStatusName('')
      fetchData()
    }
  }

  const handleDeleteSpecialStatus = async (statusId: string) => {
    const studentsWithStatus = students.filter(
      (s) => s.special_status_id === statusId
    )

    if (studentsWithStatus.length > 0) {
      alert(`لا يمكن حذف هذه الحالة لأن هناك ${studentsWithStatus.length} طالب مرتبط بها`)
      return
    }

    const { error } = await supabase
      .from('special_statuses')
      .delete()
      .eq('id', statusId)

    if (!error) {
      fetchData()
    }
  }

  const handleAddGroup = async () => {
    if (!newStage.trim() || !newGroupName.trim()) return

    try {
      const { data: stageGroups } = await supabase
        .from('groups')
        .select('*')
        .eq('stage', newStage.trim())

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

      const { error } = await supabase
        .from('groups')
        .insert(newGroup)

      if (error) throw error

      await db.groups.add(newGroup)
      setNewStage('')
      setNewGroupName('')
      fetchData()
      alert('تمت إضافة المجموعة بنجاح')
    } catch (error) {
      console.error('Error adding group:', error)
      alert('حدث خطأ أثناء إضافة المجموعة')
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    const studentsInGroup = students.filter((s) => s.group_id === groupId)

    if (studentsInGroup.length > 0) {
      alert(`لا يمكن حذف هذه المجموعة لأنها تحتوي على ${studentsInGroup.length} طالب/طالبة`)
      return
    }

    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة؟')) return

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error

      await db.groups.delete(groupId)
      fetchData()
      alert('تم حذف المجموعة بنجاح')
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('حدث خطأ أثناء حذف المجموعة')
    }
  }

  const handleExportData = async () => {
    try {
      const visits = await db.student_visits.toArray()
      const permissions = await db.student_permissions.toArray()
      const violations = await db.student_violations.toArray()
      const teachers = await db.teachers.toArray()
      const teacherGroups = await db.teacher_groups.toArray()
      const teacherProfile = await db.teacher_profile.toCollection().first()

      const dataToExport = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        students,
        groups,
        specialStatuses,
        studentVisits: visits,
        studentPermissions: permissions,
        studentViolations: violations,
        teachers: teachers,
        teacherGroups: teacherGroups,
        teacherProfile: teacherProfile || null,
      }

      const jsonString = JSON.stringify(dataToExport, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `schmang-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert('تم تصدير البيانات بنجاح! ✓\n\nيحتوي الملف على:\n- الطلاب والمجموعات\n- الحالات الخاصة\n- الزيارات والاستئذانات والمخالفات\n- المعلمين والمجموعات المرتبطة\n- جميع الإعدادات')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('حدث خطأ أثناء تصدير البيانات')
    }
  }

  const handleImportData = async (file: File) => {
    try {
      const text = await file.text()
      const importedData = JSON.parse(text)

      if (!importedData.version || !importedData.exportDate) {
        alert('ملف غير صالح! الرجاء اختيار ملف صحيح تم تصديره من النظام')
        return
      }

      const confirmImport = confirm(
        `⚠️ تحذير هام:\n\nسيتم حذف جميع البيانات الحالية واستبدالها بالبيانات من الملف المستورد.\n\nالملف المستورد يحتوي على:\n- ${importedData.students?.length || 0} طالب\n- ${importedData.groups?.length || 0} مجموعة\n- ${importedData.specialStatuses?.length || 0} حالة خاصة\n- ${importedData.studentVisits?.length || 0} زيارة\n- ${importedData.studentPermissions?.length || 0} استئذان\n- ${importedData.studentViolations?.length || 0} مخالفة\n- ${importedData.teachers?.length || 0} معلم\n\nتاريخ التصدير: ${new Date(importedData.exportDate).toLocaleDateString('ar-SA')}\n\nهل أنت متأكد من المتابعة؟`
      )

      if (!confirmImport) return

      await db.student_visits.clear()
      await db.student_permissions.clear()
      await db.student_violations.clear()
      await db.teacher_groups.clear()
      await db.students.clear()
      await db.teachers.clear()
      await db.groups.clear()
      await db.special_statuses.clear()
      await db.teacher_profile.clear()

      if (importedData.specialStatuses?.length > 0) {
        await db.special_statuses.bulkAdd(importedData.specialStatuses)
      }

      if (importedData.groups?.length > 0) {
        await db.groups.bulkAdd(importedData.groups)
      }

      if (importedData.students?.length > 0) {
        await db.students.bulkAdd(importedData.students)
      }

      if (importedData.teachers?.length > 0) {
        await db.teachers.bulkAdd(importedData.teachers)
      }

      if (importedData.teacherGroups?.length > 0) {
        await db.teacher_groups.bulkAdd(importedData.teacherGroups)
      }

      if (importedData.studentVisits?.length > 0) {
        await db.student_visits.bulkAdd(importedData.studentVisits)
      }

      if (importedData.studentPermissions?.length > 0) {
        await db.student_permissions.bulkAdd(importedData.studentPermissions)
      }

      if (importedData.studentViolations?.length > 0) {
        await db.student_violations.bulkAdd(importedData.studentViolations)
      }

      if (importedData.teacherProfile) {
        await db.teacher_profile.add(importedData.teacherProfile)
      }

      alert('✓ تم استيراد البيانات بنجاح!\n\nسيتم تحديث الصفحة الآن...')
      window.location.reload()
    } catch (error) {
      console.error('Error importing data:', error)
      alert('حدث خطأ أثناء استيراد البيانات. تأكد من أن الملف صحيح.')
    }
  }

  // إحصائيات اليوم الحالي
  const [todayReceptionCount, setTodayReceptionCount] = useState(0)
  const [todayPermissionsCount, setTodayPermissionsCount] = useState(0)
  const [todayViolationsCount, setTodayViolationsCount] = useState(0)
  const [totalTeachers, setTotalTeachers] = useState(0)

  const totalStudents = students.length
  const specialStatusCount = students.filter(s => s.special_status_id !== null).length

  const printGroup = (group: Group, groupStudents: Student[]) => {
    const now = new Date()
    const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic')
    const gregorianDate = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

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
              <div>الأستاذ: ${teacherName || 'المعلم'}</div>
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
            عدد الطلاب: ${groupStudents.length}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">التسلسل</th>
                <th style="width: 28%">اسم الطالب</th>
                <th style="width: 22%">السجل المدني</th>
                <th style="width: 15%">جوال الطالب</th>
                <th style="width: 15%">جوال ولي الأمر</th>
                <th style="width: 15%">الحالة الخاصة</th>
              </tr>
            </thead>
            <tbody>
              ${groupStudents.map((student, index) => {
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
                    <td>${specialStatus}</td>
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

  const printStudentData = (student: Student) => {
    const now = new Date()
    const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic')
    const gregorianDate = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const group = groups.find(g => g.id === student.group_id)
    const specialStatus = student.special_status_id
      ? specialStatuses.find(s => s.id === student.special_status_id)?.name
      : null

    const printWindow = window.open('', '', 'width=1000,height=800')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>بيانات الطالب - ${student.name}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4 portrait; margin: 20mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
              color: #000;
              font-size: 13px;
              padding: 30px;
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
              margin-bottom: 30px;
              padding: 20px;
              border: 2px solid #3b82f6;
              border-radius: 12px;
              background: linear-gradient(to bottom, #eff6ff 0%, #dbeafe 100%);
            }
            .school-name {
              font-size: 24px;
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 8px;
            }
            .teacher-info {
              display: flex;
              justify-content: center;
              gap: 20px;
              font-size: 12px;
              color: #1e40af;
            }
            .main-title {
              text-align: center;
              margin: 25px 0 20px 0;
            }
            .main-title h2 {
              font-size: 22px;
              font-weight: 700;
              color: #1e40af;
              padding: 10px 20px;
              border-top: 2px solid #3b82f6;
              border-bottom: 2px solid #3b82f6;
              display: inline-block;
            }
            .student-name {
              text-align: center;
              font-size: 20px;
              font-weight: 700;
              color: #1f2937;
              margin-bottom: 25px;
              padding: 12px;
              background: #f3f4f6;
              border-radius: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              border: 2px solid #3b82f6;
            }
            th, td {
              padding: 14px 12px;
              text-align: right;
              border: 1px solid #cbd5e1;
              font-size: 14px;
            }
            th {
              background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
              color: white;
              font-weight: 600;
              width: 35%;
            }
            td {
              background: #fafafa;
              font-weight: 600;
              color: #1f2937;
            }
            tr:nth-child(even) td {
              background: #ffffff;
            }
            .special-status {
              background: #fef3c7 !important;
              color: #92400e;
            }
            .page-footer {
              margin-top: 40px;
              padding-top: 15px;
              border-top: 2px solid #cbd5e1;
              text-align: center;
              font-size: 11px;
              color: #6b7280;
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
              <div>الأستاذ: ${teacherName || 'المعلم'}</div>
            </div>
          </div>

          <div class="main-title">
            <h2>بيانات الطالب</h2>
          </div>

          <div class="student-name">${student.name}</div>

          <table>
            <tbody>
              <tr>
                <th>رقم الهوية / الإقامة</th>
                <td>${student.national_id}</td>
              </tr>
              <tr>
                <th>رقم جوال الطالب</th>
                <td>${student.phone || 'غير محدد'}</td>
              </tr>
              <tr>
                <th>رقم جوال ولي الأمر</th>
                <td>${student.guardian_phone || 'غير محدد'}</td>
              </tr>
              <tr>
                <th>الصف</th>
                <td>${student.grade}</td>
              </tr>
              <tr>
                <th>المجموعة</th>
                <td>${group?.name || 'غير محدد'}</td>
              </tr>
              <tr>
                <th>المرحلة الدراسية</th>
                <td>${group?.stage || 'غير محدد'}</td>
              </tr>
              ${specialStatus ? `
                <tr>
                  <th>الحالة الخاصة</th>
                  <td class="special-status">${specialStatus}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>

          <div class="page-footer">
            <div>طُبع بتاريخ: ${hijriDate} هـ - ${gregorianDate} م</div>
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

  const printAllGroups = () => {
    const now = new Date()
    const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic')
    const gregorianDate = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const printWindow = window.open('', '', 'width=1000,height=800')
    if (!printWindow) return

    const allGroupsHTML = groups.map((group, groupIndex) => {
      const groupStudents = students.filter(s => s.group_id === group.id)

      return `
        <div class="page-section" style="${groupIndex < groups.length - 1 ? 'page-break-after: always;' : ''}">
          <div class="page-header">
            <div>${time} ${gregorianDate}</div>
            <div>منسق الشؤون الطلابية</div>
          </div>

          <div class="school-header">
            <h1 class="school-name">${schoolName}</h1>
            <div class="teacher-info">
              <div>برنامج إدارة الطلاب</div>
              <div>الأستاذ: ${teacherName || 'المعلم'}</div>
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
            عدد الطلاب: ${groupStudents.length}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%">التسلسل</th>
                <th style="width: 28%">اسم الطالب</th>
                <th style="width: 22%">السجل المدني</th>
                <th style="width: 15%">جوال الطالب</th>
                <th style="width: 15%">جوال ولي الأمر</th>
                <th style="width: 15%">الحالة الخاصة</th>
              </tr>
            </thead>
            <tbody>
              ${groupStudents.map((student, index) => {
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
                    <td>${specialStatus}</td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>

          <div class="page-footer">
            <div>${groupIndex + 1}/${groups.length}</div>
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

  // أزرار التنقل
  const navItems = [
    { id: 'home' as Page, label: 'الصفحة الرئيسية', icon: Home, show: true },
    { id: 'teachers' as Page, label: 'المعلمين', icon: GraduationCap, show: mainMenuItems.teachers },
    { id: 'groups' as Page, label: 'المجموعات', icon: Users, show: mainMenuItems.groups },
    { id: 'special-status' as Page, label: 'فئات الطلاب', icon: Star, show: mainMenuItems.specialNeeds },
    { id: 'reception' as Page, label: 'استقبال الطلاب', icon: UserCheck, show: mainMenuItems.reception },
    { id: 'permission' as Page, label: 'الاستئذان', icon: LogOut, show: mainMenuItems.permission },
    { id: 'absence' as Page, label: 'المخالفات', icon: AlertCircle, show: mainMenuItems.violations },
  ]

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 font-semibold">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b-2 border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4">
            {/* Right Side - Title */}
            <div className="flex items-center gap-4">
              <div className={`${isMasterAdmin ? 'bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 animate-pulse' : 'bg-blue-600'} p-3 rounded-2xl shadow-lg`}>
                <Users className="text-white" size={32} />
              </div>
              <div className="text-right">
                {isMasterAdmin ? (
                  <>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
                        مرحباً وائل 👋
                      </h1>
                      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                        <Shield size={14} className="text-yellow-300" />
                        <span>مصمم النظام</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      {systemDescription || 'نظام إدارة شاملة لبيانات الطلاب'}
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-800">
                      {systemDescription || 'نظام إدارة شاملة لبيانات الطلاب'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      {schoolName || 'قم بإضافة اسم المدرسة من الإعدادات'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Left Side - Buttons */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
                >
                  <Settings size={20} />
                  <span>الإعدادات</span>
                </button>

                {showSettingsMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowExcelImport(true)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Download size={18} className="text-green-600" />
                      <span className="text-sm font-medium text-gray-700">استيراد من Excel</span>
                    </button>

                    <button
                      onClick={() => {
                        handleExportData()
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Download size={18} className="text-pink-600" />
                      <span className="text-sm font-medium text-gray-700">تصدير البيانات الكاملة</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowDataImport(true)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Upload size={18} className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">استيراد البيانات الكاملة</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowManageGroupsModal(true)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Users size={18} className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">إدارة المجموعات</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowManageSpecialStatusModal(true)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Star size={18} className="text-pink-600" />
                      <span className="text-sm font-medium text-gray-700">إدارة فئات الطلاب</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowManageHeaderModal(true)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <List size={18} className="text-cyan-600" />
                      <span className="text-sm font-medium text-gray-700">إدارة الهيدر والقوائم</span>
                    </button>

                    <div className="border-t border-gray-200 my-1"></div>

                    <button
                      onClick={() => {
                        handleLogout()
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3"
                    >
                      <LogOut size={18} className="text-red-600" />
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium text-red-600">تسجيل الخروج</span>
                        {isMasterAdmin && (
                          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Admin</span>
                        )}
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowProfileSettings(true)}
                className="text-gray-700 hover:text-gray-900 px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 hover:bg-gray-100/50"
              >
                <ChevronDown size={18} className="text-gray-500" />
                <span>{teacherName || 'الملف الشخصي'}</span>
                <UserIcon size={20} />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex flex-wrap gap-3 justify-center">
            {/* إجمالي الطلاب */}
            {headerCards.totalStudents && (
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md w-48">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold">{totalStudents}</div>
                  <Users size={32} className="opacity-80" />
                </div>
                <div className="text-sm opacity-90">إجمالي الطلاب</div>
              </div>
            )}

            {/* المعلمين */}
            {headerCards.teachers && (
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md w-48">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold">{totalTeachers}</div>
                  <GraduationCap size={32} className="opacity-80" />
                </div>
                <div className="text-sm opacity-90">المعلمين</div>
              </div>
            )}

            {/* فئات الطلاب */}
            {headerCards.reception && (
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md w-48">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold">{specialStatusCount}</div>
                  <Star size={32} className="opacity-80" />
                </div>
                <div className="text-sm opacity-90">فئات الطلاب</div>
              </div>
            )}

            {/* استقبال الطلاب */}
            {headerCards.reception && (
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white shadow-md w-48">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold">{todayReceptionCount}</div>
                  <UserCheck size={32} className="opacity-80" />
                </div>
                <div className="text-sm opacity-90">استقبال اليوم</div>
              </div>
            )}

            {/* استئذانات */}
            {headerCards.permission && (
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-md w-48">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold">{todayPermissionsCount}</div>
                  <LogOut size={32} className="opacity-80" />
                </div>
                <div className="text-sm opacity-90">استئذانات اليوم</div>
              </div>
            )}

            {/* المخالفات */}
            {headerCards.violations && (
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md w-48">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold">{todayViolationsCount}</div>
                  <AlertCircle size={32} className="opacity-80" />
                </div>
                <div className="text-sm opacity-90">مخالفات اليوم</div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex gap-2 py-3 justify-center">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {currentPage === 'home' && (
          <div className="flex gap-6">
            {/* Sidebar */}
            <aside className="w-80">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">التصفية</h3>
                  <Settings className="text-gray-600" size={22} />
                </div>

                <div className="space-y-4">
                  {mainMenuItems.specialNeeds && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 text-right">فئات الطلاب</label>
                      <div className="relative">
                        <select
                          value={specialStatusFilter}
                          onChange={(e) => setSpecialStatusFilter(e.target.value)}
                          className="w-full px-4 py-3 bg-yellow-50 border-2 border-yellow-300 rounded-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-yellow-400 appearance-none cursor-pointer"
                        >
                          <option value="all">الكل</option>
                          {specialStatuses.map(status => (
                            <option key={status.id} value={status.id}>{status.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 text-right">المرحلة الدراسية</label>
                    <div className="relative">
                      <select
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none cursor-pointer"
                      >
                        <option value="all">الكل</option>
                        {sortStages(Array.from(new Set(groups.map(g => g.stage)))).map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                    </div>
                  </div>

                  {stageFilter !== 'all' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 text-right">المجموعات</label>
                      <div className="relative">
                        <select
                          value={groupFilter}
                          onChange={(e) => setGroupFilter(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-gray-400 appearance-none cursor-pointer"
                        >
                          <option value="all">الكل</option>
                          {groups
                            .filter(g => stageFilter === 'all' || g.stage === stageFilter)
                            .sort((a, b) => a.display_order - b.display_order)
                            .map(group => (
                              <option key={group.id} value={group.id}>{group.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                      </div>
                    </div>
                  )}

                  {(mainMenuItems.reception || mainMenuItems.permission || mainMenuItems.violations) && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 text-right">تصفية حسب النشاط</label>
                      <div className="relative">
                        <select
                          value={activityFilter}
                          onChange={(e) => setActivityFilter(e.target.value)}
                          className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer"
                        >
                          <option value="all">الكل</option>
                          {mainMenuItems.reception && <option value="reception">لديهم استقبال اليوم</option>}
                          {mainMenuItems.permission && <option value="permission">لديهم استئذان اليوم</option>}
                          {mainMenuItems.violations && <option value="violation">لديهم مخالفة اليوم</option>}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                      </div>
                    </div>
                  )}

                  {/* زر إعادة التعيين */}
                  <button
                    onClick={() => {
                      setSpecialStatusFilter('all')
                      setStageFilter('all')
                      setGroupFilter('all')
                      setActivityFilter('all')
                      setSearchTerm('')
                      setExpandedGroups(new Set())
                    }}
                    className="w-full mt-4 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border border-gray-300"
                  >
                    <RotateCcw size={16} />
                    <span>إعادة تعيين</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Main */}
            <div className="flex-1">
              <div className="bg-gradient-to-r from-teal-400 to-teal-500 rounded-xl shadow-md p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-white">استفسار عن طالب</h2>
                  <Search className="text-white" size={20} />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث عن طالب بالاسم، السجل المدني، أو رقم الجوال..."
                    className="w-full px-4 py-2.5 pr-10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>

              {students.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
                  <Users size={64} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">لا يوجد طلاب</h3>
                  <p className="text-gray-500">قم بإضافة طلاب من خلال استيراد Excel</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const filteredGroups = groups
                      .filter(g => stageFilter === 'all' || g.stage === stageFilter)
                      .filter(g => groupFilter === 'all' || g.id === groupFilter)
                      .sort((a, b) => a.display_order - b.display_order)

                    const stages = sortStages(Array.from(new Set(filteredGroups.map(g => g.stage))))

                    const stageColors = [
                      { from: 'from-gray-300', to: 'to-gray-400', hoverFrom: 'hover:from-gray-400', hoverTo: 'hover:to-gray-500', group: 'from-green-600', groupTo: 'to-green-700', groupHoverFrom: 'hover:from-green-700', groupHoverTo: 'hover:to-green-800', textColor: 'text-black' },
                      { from: 'from-gray-300', to: 'to-gray-400', hoverFrom: 'hover:from-gray-400', hoverTo: 'hover:to-gray-500', group: 'from-green-600', groupTo: 'to-green-700', groupHoverFrom: 'hover:from-green-700', groupHoverTo: 'hover:to-green-800', textColor: 'text-black' },
                      { from: 'from-gray-300', to: 'to-gray-400', hoverFrom: 'hover:from-gray-400', hoverTo: 'hover:to-gray-500', group: 'from-green-600', groupTo: 'to-green-700', groupHoverFrom: 'hover:from-green-700', groupHoverTo: 'hover:to-green-800', textColor: 'text-black' },
                      { from: 'from-gray-300', to: 'to-gray-400', hoverFrom: 'hover:from-gray-400', hoverTo: 'hover:to-gray-500', group: 'from-green-600', groupTo: 'to-green-700', groupHoverFrom: 'hover:from-green-700', groupHoverTo: 'hover:to-green-800', textColor: 'text-black' },
                    ]

                    return stages.map((stage, index) => {
                      const stageGroups = filteredGroups.filter(g => g.stage === stage)
                      const totalStageStudents = stageGroups.reduce((sum, group) => {
                        const groupStudents = students
                          .filter(s => s.group_id === group.id)
                          .filter(s =>
                            searchTerm === '' ||
                            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.national_id.includes(searchTerm) ||
                            s.phone.includes(searchTerm) ||
                            s.guardian_phone.includes(searchTerm)
                          )
                          .filter(s => specialStatusFilter === 'all' || s.special_status_id === specialStatusFilter)
                          .filter(s => {
                            if (activityFilter === 'all') return true
                            if (activityFilter === 'reception') return todayReceptionStudents.has(s.id)
                            if (activityFilter === 'permission') return todayPermissionStudents.has(s.id)
                            if (activityFilter === 'violation') return todayViolationStudents.has(s.id)
                            return true
                          })
                        return sum + groupStudents.length
                      }, 0)

                      if (totalStageStudents === 0 && (searchTerm !== '' || specialStatusFilter !== 'all' || activityFilter !== 'all')) return null

                      const isStageExpanded = expandedGroups.has(stage)
                      const colors = stageColors[index % stageColors.length]

                      return (
                        <div key={stage} className="space-y-3">
                          <button
                            onClick={() => toggleGroup(stage)}
                            className={`w-full bg-gradient-to-r ${colors.from} ${colors.to} px-5 py-3.5 rounded-xl flex items-center justify-between ${colors.hoverFrom} ${colors.hoverTo} transition-all shadow-md`}
                          >
                            <div className="flex items-center gap-3">
                              <ChevronDown
                                size={22}
                                className={`${colors.textColor} transition-transform ${isStageExpanded ? 'rotate-180' : ''}`}
                              />
                              <h2 className={`text-lg font-bold ${colors.textColor}`}>{stage}</h2>
                            </div>
                            <div className="bg-white px-4 py-1.5 rounded-full">
                              <span className="text-gray-800 font-bold text-sm">{totalStageStudents} طالب</span>
                            </div>
                          </button>

                          {isStageExpanded && (
                            <div className="space-y-3 pr-3 mt-3">
                              {stageGroups.map(group => {
                                const groupStudents = students
                                  .filter(s => s.group_id === group.id)
                                  .filter(s =>
                                    searchTerm === '' ||
                                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    s.national_id.includes(searchTerm) ||
                                    s.phone.includes(searchTerm) ||
                                    s.guardian_phone.includes(searchTerm)
                                  )
                                  .filter(s => specialStatusFilter === 'all' || s.special_status_id === specialStatusFilter)
                                  .filter(s => {
                                    if (activityFilter === 'all') return true
                                    if (activityFilter === 'reception') return todayReceptionStudents.has(s.id)
                                    if (activityFilter === 'permission') return todayPermissionStudents.has(s.id)
                                    if (activityFilter === 'violation') return todayViolationStudents.has(s.id)
                                    return true
                                  })

                                if (groupStudents.length === 0 && (searchTerm !== '' || specialStatusFilter !== 'all' || activityFilter !== 'all')) return null

                                const isGroupExpanded = expandedGroups.has(group.id)

                                return (
                                  <div key={group.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                                    <button
                                      onClick={() => toggleGroup(group.id)}
                                      className={`w-full bg-gradient-to-r ${colors.group} ${colors.groupTo} px-4 py-2 flex items-center justify-between`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-white">{group.name}</h3>
                                        <div className="bg-white px-2.5 py-0.5 rounded-full">
                                          <span className="text-gray-800 font-bold text-xs">{groupStudents.length} طالب</span>
                                        </div>
                                      </div>
                                      <ChevronDown
                                        size={16}
                                        className={`text-white transition-transform ${isGroupExpanded ? 'rotate-180' : ''}`}
                                      />
                                    </button>

                                    {isGroupExpanded && (
                                      <div className="p-3 pb-32">
                                        {groupStudents.length === 0 ? (
                                          <p className="text-center text-gray-500 py-4 text-sm">لا يوجد طلاب</p>
                                        ) : (
                                          <div className="space-y-2">
                                            {groupStudents.map(student => {
                                              const specialStatus = specialStatuses.find(ss => ss.id === student.special_status_id)
                                              return (
                                                <div
                                                  key={student.id}
                                                  className={`border rounded-lg p-3 transition-all relative ${
                                                    specialStatus ? 'border-yellow-300 bg-yellow-50' : 'border-teal-200 bg-teal-50'
                                                  }`}
                                                >
                                                  {specialStatus && (
                                                    <div className="absolute top-2 left-8 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-200 text-purple-800 z-10">
                                                      {specialStatus.name}
                                                    </div>
                                                  )}
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                      <h4 className="text-base font-bold text-gray-900 mb-1.5">{student.name}</h4>
                                                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-right mb-2">
                                                        <p className="text-gray-700">السجل: {student.national_id}</p>
                                                        <p className="text-gray-700">الصف: {student.grade}</p>
                                                        <p className="text-gray-700">جوال: {student.phone}</p>
                                                        <p className="text-gray-700">ولي أمر: {student.guardian_phone}</p>
                                                      </div>
                                                      <div className="flex gap-2 text-xs font-semibold">
                                                        {mainMenuItems.reception && (
                                                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                                                            الاستقبال: {student.visit_count || 0}
                                                          </span>
                                                        )}
                                                        {mainMenuItems.permission && (
                                                          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md">
                                                            الاستئذانات: {student.permission_count || 0}
                                                          </span>
                                                        )}
                                                        {mainMenuItems.violations && (
                                                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md">
                                                            المخالفات: {student.violation_count || 0}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                    <div className="relative">
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation()
                                                          setStudentMenuOpen(studentMenuOpen === student.id ? null : student.id)
                                                        }}
                                                        className="p-2 hover:bg-white rounded-lg transition-colors"
                                                      >
                                                        <span className="text-2xl text-gray-600">⋮</span>
                                                      </button>
                                                      {studentMenuOpen === student.id && (
                                                        <div className="absolute left-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                                                          <button
                                                            onClick={() => {
                                                              setAllowEntryStudent(student)
                                                              setShowAllowEntryModal(true)
                                                              setStudentMenuOpen(null)
                                                            }}
                                                            className="w-full text-right px-4 py-2.5 hover:bg-green-50 transition-colors flex items-center gap-3 text-sm font-medium text-green-700"
                                                          >
                                                            <DoorOpen size={16} />
                                                            <span>سماح بدخول الفصل</span>
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setPrintStudent(student)
                                                              setShowPrintModal(true)
                                                              setStudentMenuOpen(null)
                                                            }}
                                                            className="w-full text-right px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-3 text-sm font-medium text-blue-700"
                                                          >
                                                            <Printer size={16} />
                                                            <span>طباعة بيانات الطالب</span>
                                                          </button>
                                                          <button
                                                            onClick={() => {
                                                              setEditingStudent(student)
                                                              setShowEditModal(true)
                                                              setStudentMenuOpen(null)
                                                            }}
                                                            className="w-full text-right px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm font-medium text-gray-700"
                                                          >
                                                            <Edit size={16} />
                                                            <span>تعديل</span>
                                                          </button>
                                                          <button
                                                            onClick={async () => {
                                                              if (confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
                                                                try {
                                                                  const { error } = await supabase
                                                                    .from('students')
                                                                    .delete()
                                                                    .eq('id', student.id)

                                                                  if (error) throw error

                                                                  await db.students.delete(student.id)
                                                                  alert('تم حذف الطالب بنجاح')
                                                                  fetchData()
                                                                  setStudentMenuOpen(null)
                                                                } catch (error) {
                                                                  console.error('Error deleting student:', error)
                                                                  alert('حدث خطأ أثناء حذف الطالب')
                                                                }
                                                              }
                                                            }}
                                                            className="w-full text-right px-4 py-2.5 hover:bg-red-50 transition-colors flex items-center gap-3 text-sm font-medium text-red-600"
                                                          >
                                                            <Trash2 size={16} />
                                                            <span>حذف</span>
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {currentPage === 'teachers' && <TeachersPage />}

        {currentPage === 'groups' && <GroupsManagementPage />}

        {currentPage === 'special-status' && (
          <SpecialStatusPage
            students={students}
            groups={groups}
            specialStatuses={specialStatuses}
          />
        )}

        {currentPage === 'reception' && <ReceptionPage onUpdateStats={fetchTodayStats} />}

        {currentPage === 'permission' && <PermissionPage onUpdateStats={fetchTodayStats} />}

        {currentPage === 'absence' && <AbsencePage onUpdateStats={fetchTodayStats} />}
      </div>

      {/* Modals */}
      {showProfileSettings && (
        <ProfileSettings
          onClose={() => {
            setShowProfileSettings(false)
            fetchData()
          }}
        />
      )}

      <ExcelImportModal
        isOpen={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImportComplete={() => {
          fetchData()
          fetchTeachersCount()
        }}
      />

      {showDataImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <Upload size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">استيراد البيانات الكاملة</h2>
                  <p className="text-sm text-gray-600 mt-1">استرجاع نسخة احتياطية من بياناتك</p>
                </div>
              </div>
              <button
                onClick={() => setShowDataImport(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-5 mb-6">
              <div className="flex gap-3">
                <AlertCircle size={24} className="text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">⚠️ تحذير هام</h3>
                  <ul className="text-sm text-gray-700 space-y-1.5">
                    <li>• سيتم حذف <strong>جميع البيانات الحالية</strong> بشكل نهائي</li>
                    <li>• لا يمكن التراجع عن هذه العملية</li>
                    <li>• تأكد من اختيار ملف النسخة الاحتياطية الصحيح</li>
                    <li>• يُنصح بعمل نسخة احتياطية قبل الاستيراد</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
              <h3 className="font-bold text-gray-900 mb-3">📋 ما الذي سيتم استيراده؟</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>الطلاب والمجموعات</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>فئات الطلاب</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>زيارات العيادة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>الاستئذانات</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>المخالفات</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>المعلمين ومجموعاتهم</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>الملف الشخصي</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>جميع الإعدادات</span>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleImportData(file)
                    setShowDataImport(false)
                  }
                }}
                className="hidden"
                id="data-import-input"
              />
              <label htmlFor="data-import-input" className="cursor-pointer">
                <Upload size={48} className="mx-auto text-blue-600 mb-3" />
                <p className="text-lg font-bold text-gray-900 mb-1">اضغط لاختيار ملف النسخة الاحتياطية</p>
                <p className="text-sm text-gray-600">ملفات JSON فقط (.json)</p>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDataImport(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddStudentModal && (
        <AddStudentModal
          groups={groups}
          specialStatuses={specialStatuses}
          onClose={() => setShowAddStudentModal(false)}
          onStudentAdded={fetchData}
        />
      )}

      {showManageSpecialStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3.5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">إدارة فئات الطلاب</h2>
              <button
                onClick={() => {
                  setShowManageSpecialStatusModal(false)
                  setNewStatusName('')
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2.5">
                {specialStatuses.map((status) => {
                  const studentCount = students.filter(
                    (s) => s.special_status_id === status.id
                  ).length

                  return (
                    <div
                      key={status.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-cyan-300 transition-colors"
                    >
                      <div className="flex-1">
                        <span className="text-gray-800 font-medium text-sm">{status.name}</span>
                        {studentCount > 0 && (
                          <span className="text-xs text-gray-500 mr-2">
                            ({studentCount} طالب)
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSpecialStatus(status.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                })}

                {specialStatuses.length === 0 && (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    لا توجد حالات خاصة بعد
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="mb-2 text-xs font-medium text-gray-700">
                اسم الحالة الخاصة
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSpecialStatus()
                    }
                  }}
                  placeholder="مثال: ربو، موهوب، سكري، متفوق، عريف الفصل..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                />
                <button
                  onClick={handleAddSpecialStatus}
                  disabled={!newStatusName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-cyan-600 hover:to-blue-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  <span>إضافة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManageGroupsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers size={24} className="text-white" />
                <h2 className="text-xl font-bold text-white">إدارة المراحل والمجموعات</h2>
              </div>
              <button
                onClick={() => {
                  setShowManageGroupsModal(false)
                  setNewStage('')
                  setNewGroupName('')
                }}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="text-base font-bold text-gray-800 mb-4 text-right">إضافة مجموعة جديدة</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      الصف (المرحلة)
                    </label>
                    <select
                      value={newStage}
                      onChange={(e) => setNewStage(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white text-right"
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
                      <option value="الأول الثانوي">الأول الثانوي</option>
                      <option value="الصف الثاني الثانوي">الصف الثاني الثانوي</option>
                      <option value="الصف الثالث الثانوي">الصف الثالث الثانوي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                      اسم المجموعة
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddGroup()
                        }
                      }}
                      placeholder="مثال: مجموعة 1"
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-right"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddGroup}
                  disabled={!newStage.trim() || !newGroupName.trim()}
                  className="w-full py-3 bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all"
                >
                  إضافة المجموعة
                </button>
              </div>

              {groups.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-base font-bold text-gray-800 mb-3 text-right">المجموعات الحالية</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {groups
                      .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
                      .map((group) => {
                        const studentCount = students.filter(s => s.group_id === group.id).length

                        return (
                          <div
                            key={group.id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-teal-300 transition-colors"
                          >
                            <div className="flex-1 text-right">
                              <span className="text-gray-800 font-medium text-sm">{group.stage} - {group.name}</span>
                              {studentCount > 0 && (
                                <span className="text-xs text-gray-500 mr-2">
                                  ({studentCount} طالب)
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showManageHeaderModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid size={20} className="text-white" />
                <h2 className="text-base font-bold text-white">إدارة الهيدر والقوائم</h2>
              </div>
              <button
                onClick={() => setShowManageHeaderModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <LayoutGrid size={18} className="text-cyan-600" />
                    <h3 className="text-sm font-bold text-gray-800">بطاقات الهيدر</h3>
                  </div>
                  <div className="space-y-2 bg-gradient-to-br from-cyan-50/80 to-blue-50/80 rounded-lg p-3 border border-cyan-200/50 backdrop-blur-sm">
                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-cyan-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-blue-600" />
                        <span className="text-xs font-medium text-gray-800">إجمالي الطلاب</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={headerCards.totalStudents}
                        onChange={(e) => setHeaderCards({...headerCards, totalStudents: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-cyan-600 focus:ring-1 focus:ring-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-cyan-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <UserIcon size={16} className="text-green-600" />
                        <span className="text-xs font-medium text-gray-800">المعلمين</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={headerCards.teachers}
                        onChange={(e) => setHeaderCards({...headerCards, teachers: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-cyan-600 focus:ring-1 focus:ring-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-cyan-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-purple-600" />
                        <span className="text-xs font-medium text-gray-800">فئات الطلاب</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={headerCards.reception}
                        onChange={(e) => setHeaderCards({...headerCards, reception: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-cyan-600 focus:ring-1 focus:ring-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-cyan-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-orange-600" />
                        <span className="text-xs font-medium text-gray-800">استئذانات</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={headerCards.permission}
                        onChange={(e) => setHeaderCards({...headerCards, permission: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-cyan-600 focus:ring-1 focus:ring-cyan-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-cyan-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-xs font-medium text-gray-800">المخالفات</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={headerCards.violations}
                        onChange={(e) => setHeaderCards({...headerCards, violations: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-cyan-600 focus:ring-1 focus:ring-cyan-500"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ListChecks size={18} className="text-purple-600" />
                    <h3 className="text-sm font-bold text-gray-800">قوائم الصفحة الرئيسية</h3>
                  </div>
                  <div className="space-y-2 bg-gradient-to-br from-purple-50/80 to-pink-50/80 rounded-lg p-3 border border-purple-200/50 backdrop-blur-sm">
                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-purple-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <GraduationCap size={16} className="text-blue-600" />
                        <span className="text-xs font-medium text-gray-800">المعلمين</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mainMenuItems.teachers}
                        onChange={(e) => setMainMenuItems({...mainMenuItems, teachers: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-purple-600 focus:ring-1 focus:ring-purple-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-purple-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-blue-600" />
                        <span className="text-xs font-medium text-gray-800">المجموعات</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mainMenuItems.groups}
                        onChange={(e) => setMainMenuItems({...mainMenuItems, groups: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-purple-600 focus:ring-1 focus:ring-purple-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-purple-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-pink-600" />
                        <span className="text-xs font-medium text-gray-800">الطلاب الخاصة</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mainMenuItems.specialNeeds}
                        onChange={(e) => setMainMenuItems({...mainMenuItems, specialNeeds: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-purple-600 focus:ring-1 focus:ring-purple-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-purple-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-green-600" />
                        <span className="text-xs font-medium text-gray-800">استقبال الطلاب</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mainMenuItems.reception}
                        onChange={(e) => setMainMenuItems({...mainMenuItems, reception: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-purple-600 focus:ring-1 focus:ring-purple-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-purple-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-orange-600" />
                        <span className="text-xs font-medium text-gray-800">الاستئذان</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mainMenuItems.permission}
                        onChange={(e) => setMainMenuItems({...mainMenuItems, permission: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-purple-600 focus:ring-1 focus:ring-purple-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white/80 rounded-lg border border-gray-200/50 cursor-pointer hover:border-purple-300 transition-colors backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-600" />
                        <span className="text-xs font-medium text-gray-800">المخالفات</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={mainMenuItems.violations}
                        onChange={(e) => setMainMenuItems({...mainMenuItems, violations: e.target.checked})}
                        className="w-4 h-4 rounded border border-gray-300 text-purple-600 focus:ring-1 focus:ring-purple-500"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowManageHeaderModal(false)
                }}
                className="w-full mt-4 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Check size={18} />
                <span>حفظ وإغلاق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllowEntryModal && allowEntryStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAllowEntryModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DoorOpen size={24} />
                <h2 className="text-xl font-bold">السماح بدخول الفصل</h2>
              </div>
              <button
                onClick={() => {
                  setShowAllowEntryModal(false)
                  setAllowEntryStudent(null)
                  setSelectedTeacherId('')
                }}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
                <h3 className="font-bold text-gray-800 mb-2 text-right">معلومات الطالب:</h3>
                <div className="space-y-1 text-sm text-right">
                  <p className="text-gray-700"><span className="font-semibold">الاسم:</span> {allowEntryStudent.name}</p>
                  <p className="text-gray-700"><span className="font-semibold">السجل المدني:</span> {allowEntryStudent.national_id}</p>
                  <p className="text-gray-700"><span className="font-semibold">الصف:</span> {allowEntryStudent.grade}</p>
                  <p className="text-gray-700"><span className="font-semibold">المجموعة:</span> {groups.find(g => g.id === allowEntryStudent.group_id)?.name || '-'}</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-700 text-center">
                  سيتم إرسال رسالة للمعلم المختار عبر واتساب
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2 text-right">اختر المعلم</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                >
                  <option value="">-- اختر المعلم --</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
                <h4 className="font-bold text-green-900 mb-2 text-right flex items-center gap-2 justify-end">
                  <span>معاينة الرسالة:</span>
                  <Check size={18} />
                </h4>
                <div className="text-sm text-gray-800 text-right space-y-1 bg-white rounded-lg p-3">
                  <p className="text-gray-600">السلام عليكم ورحمة الله وبركاته</p>
                  <p className="font-bold mt-2">الرجاء السماح بدخول الطالب للفصل</p>
                  <p className="mt-2">اسم الطالب: <span className="font-bold">{allowEntryStudent.name}</span></p>
                  <p>المرسل الأستاذ: <span className="font-bold">{teacherName || 'مسؤول النظام'}</span></p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAllowEntryModal(false)
                    setAllowEntryStudent(null)
                    setSelectedTeacherId('')
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-3 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    if (!selectedTeacherId) {
                      alert('الرجاء اختيار المعلم')
                      return
                    }

                    const selectedTeacher = teachers.find(t => t.id === selectedTeacherId)
                    if (!selectedTeacher || !selectedTeacher.phone) {
                      alert('المعلم المختار لا يحتوي على رقم جوال')
                      return
                    }

                    const phone = formatPhoneForWhatsApp(selectedTeacher.phone)
                    if (!phone) {
                      alert('رقم جوال المعلم غير صالح')
                      return
                    }

                    const message = `السلام عليكم ورحمة الله وبركاته

*الرجاء السماح بدخول الطالب للفصل*

اسم الطالب: *${allowEntryStudent.name}*
المرسل الأستاذ: ${teacherName || 'مسؤول النظام'}`

                    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
                    window.open(whatsappUrl, '_blank')

                    setShowAllowEntryModal(false)
                    setAllowEntryStudent(null)
                    setSelectedTeacherId('')
                  }}
                  disabled={!selectedTeacherId}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <MessageCircle size={20} />
                  <span>إرسال عبر واتساب</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-2xl font-bold">تعديل بيانات الطالب</h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingStudent(null)
                }}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
                  <input
                    type="text"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">السجل المدني</label>
                  <input
                    type="text"
                    value={editingStudent.national_id}
                    onChange={(e) => setEditingStudent({...editingStudent, national_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">جوال الطالب</label>
                    <input
                      type="text"
                      value={editingStudent.phone}
                      onChange={(e) => setEditingStudent({...editingStudent, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">جوال ولي الأمر</label>
                    <input
                      type="text"
                      value={editingStudent.guardian_phone}
                      onChange={(e) => setEditingStudent({...editingStudent, guardian_phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">المجموعة</label>
                  <select
                    value={editingStudent.group_id}
                    onChange={(e) => setEditingStudent({...editingStudent, group_id: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.stage} - {g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الحالة الخاصة</label>
                  <select
                    value={editingStudent.special_status_id || ''}
                    onChange={(e) => setEditingStudent({...editingStudent, special_status_id: e.target.value || null})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">لا توجد</option>
                    {specialStatuses.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingStudent(null)
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase
                        .from('students')
                        .update({
                          name: editingStudent.name,
                          national_id: editingStudent.national_id,
                          phone: editingStudent.phone,
                          guardian_phone: editingStudent.guardian_phone,
                          group_id: editingStudent.group_id,
                          special_status_id: editingStudent.special_status_id,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', editingStudent.id)

                      if (error) throw error

                      await db.students.update(editingStudent.id, editingStudent)
                      alert('تم تحديث بيانات الطالب بنجاح')
                      fetchData()
                      setShowEditModal(false)
                      setEditingStudent(null)
                    } catch (error) {
                      console.error('Error updating student:', error)
                      alert('حدث خطأ أثناء التحديث')
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && printStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Printer size={28} />
                <h2 className="text-2xl font-bold">بيانات الطالب</h2>
              </div>
              <button
                onClick={() => {
                  setShowPrintModal(false)
                  setPrintStudent(null)
                }}
                className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8" id="student-print-content">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  {schoolName || 'بيانات الطالب'}
                </h1>
                <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">الاسم الكامل</p>
                    <p className="font-bold text-gray-900 text-lg">{printStudent.name}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">رقم الهوية / الإقامة</p>
                    <p className="font-bold text-gray-900 text-lg">{printStudent.national_id}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">رقم جوال الطالب</p>
                    <p className="font-bold text-gray-900 text-lg">{printStudent.phone || 'غير محدد'}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">رقم جوال ولي الأمر</p>
                    <p className="font-bold text-gray-900 text-lg">{printStudent.guardian_phone || 'غير محدد'}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">الصف</p>
                    <p className="font-bold text-gray-900 text-lg">{printStudent.grade}</p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">المجموعة</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {groups.find(g => g.id === printStudent.group_id)?.name || 'غير محدد'}
                    </p>
                  </div>

                  {mainMenuItems.specialNeeds && (
                    <div className="bg-gray-50 p-4 rounded-xl col-span-2">
                      <p className="text-sm text-gray-600 mb-1">الحالة الخاصة</p>
                      <p className="font-bold text-gray-900 text-lg">
                        {printStudent.special_status_id
                          ? specialStatuses.find(s => s.id === printStudent.special_status_id)?.name
                          : 'لا توجد'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <p className="text-sm text-gray-500 text-center">
                    تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}
                  </p>
                  {teacherName && (
                    <p className="text-sm text-gray-500 text-center mt-1">
                      المرشد: {teacherName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={() => {
                  if (printStudent) {
                    printStudentData(printStudent)
                    setShowPrintModal(false)
                    setPrintStudent(null)
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                طباعة
              </button>
              <button
                onClick={() => {
                  setShowPrintModal(false)
                  setPrintStudent(null)
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-xl font-bold transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-gray-600 font-medium mb-2">
            تصميم وتطوير الأستاذ وائل الفيفي
          </p>
          <a
            href="https://wa.me/966558890902"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 font-semibold transition-colors inline-flex items-center gap-2"
          >
            <span>0558890902</span>
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App
