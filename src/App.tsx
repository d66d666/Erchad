import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
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
  Heart,
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

  const fetchTodayStats = async () => {
    try {
      // استخدام تاريخ اليوم المحلي للمستخدم
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const todayStart = `${year}-${month}-${day}T00:00:00`
      const todayEnd = `${year}-${month}-${day}T23:59:59`

      const [visitsRes, permissionsRes, violationsRes] = await Promise.all([
        supabase
          .from('student_visits')
          .select('id', { count: 'exact' })
          .gte('visit_date', todayStart)
          .lte('visit_date', todayEnd),
        supabase
          .from('student_permissions')
          .select('id', { count: 'exact' })
          .gte('permission_date', todayStart)
          .lte('permission_date', todayEnd),
        supabase
          .from('student_violations')
          .select('id', { count: 'exact' })
          .gte('violation_date', todayStart)
          .lte('violation_date', todayEnd),
      ])

      setTodayReceptionCount(visitsRes.count || 0)
      setTodayPermissionsCount(permissionsRes.count || 0)
      setTodayViolationsCount(violationsRes.count || 0)
    } catch (error) {
      console.error('Error fetching today stats:', error)
    }
  }

  const fetchTeachersCount = async () => {
    try {
      const { count } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })

      setTotalTeachers(count || 0)
    } catch (error) {
      console.error('Error fetching teachers count:', error)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      const [groupsRes, statusesRes, studentsRes, profileRes] = await Promise.all([
        supabase.from('groups').select('*').order('stage'),
        supabase.from('special_statuses').select('*').order('name'),
        supabase.from('students').select('*').order('name'),
        supabase.from('teacher_profile').select('*').maybeSingle(),
      ])

      if (groupsRes.data) {
        await db.groups.clear()
        for (const group of groupsRes.data) {
          await db.groups.put(group)
        }
        setGroups(groupsRes.data)
      }

      if (statusesRes.data) {
        await db.special_statuses.clear()
        for (const status of statusesRes.data) {
          await db.special_statuses.put(status)
        }
        setSpecialStatuses(statusesRes.data)
      }

      if (studentsRes.data) {
        await db.students.clear()
        for (const student of studentsRes.data) {
          await db.students.put(student)
        }
        setStudents(studentsRes.data as Student[])
      }

      if (profileRes.data) {
        setTeacherName(profileRes.data.name || '')
        setTeacherPhone(profileRes.data.phone || '')
        setSchoolName(profileRes.data.school_name || '')
        setSystemDescription(profileRes.data.system_description || '')
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
    setIsLoggedIn(loggedIn)
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

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userId')
    setIsLoggedIn(false)
    setCurrentPage('home')
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
      const { data: visits } = await supabase.from('student_visits').select('*')
      const { data: permissions } = await supabase.from('student_permissions').select('*')
      const { data: violations } = await supabase.from('student_violations').select('*')
      const { data: teachers } = await supabase.from('teachers').select('*')
      const { data: teacherGroups } = await supabase.from('teacher_groups').select('*')
      const { data: teacherProfile } = await supabase.from('teacher_profile').select('*').maybeSingle()
      const { data: labContact } = await supabase.from('lab_contact').select('*').maybeSingle()
      const { data: schoolInfo } = await supabase.from('school_info').select('*').maybeSingle()

      const dataToExport = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        students,
        groups,
        specialStatuses,
        studentVisits: visits || [],
        studentPermissions: permissions || [],
        studentViolations: violations || [],
        teachers: teachers || [],
        teacherGroups: teacherGroups || [],
        teacherProfile: teacherProfile || null,
        labContact: labContact || null,
        schoolInfo: schoolInfo || null,
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

      await supabase.from('student_visits').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('student_permissions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('student_violations').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('teacher_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('special_statuses').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      if (importedData.specialStatuses?.length > 0) {
        await supabase.from('special_statuses').insert(importedData.specialStatuses)
      }

      if (importedData.groups?.length > 0) {
        await supabase.from('groups').insert(importedData.groups)
      }

      if (importedData.students?.length > 0) {
        await supabase.from('students').insert(importedData.students)
      }

      if (importedData.teachers?.length > 0) {
        await supabase.from('teachers').insert(importedData.teachers)
      }

      if (importedData.teacherGroups?.length > 0) {
        await supabase.from('teacher_groups').insert(importedData.teacherGroups)
      }

      if (importedData.studentVisits?.length > 0) {
        await supabase.from('student_visits').insert(importedData.studentVisits)
      }

      if (importedData.studentPermissions?.length > 0) {
        await supabase.from('student_permissions').insert(importedData.studentPermissions)
      }

      if (importedData.studentViolations?.length > 0) {
        await supabase.from('student_violations').insert(importedData.studentViolations)
      }

      if (importedData.teacherProfile) {
        await supabase.from('teacher_profile').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('teacher_profile').insert(importedData.teacherProfile)
      }

      if (importedData.labContact) {
        await supabase.from('lab_contact').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('lab_contact').insert(importedData.labContact)
      }

      if (importedData.schoolInfo) {
        await supabase.from('school_info').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('school_info').insert(importedData.schoolInfo)
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

  // أزرار التنقل
  const navItems = [
    { id: 'home' as Page, label: 'الصفحة الرئيسية', icon: Home, show: true },
    { id: 'teachers' as Page, label: 'المعلمين', icon: GraduationCap, show: mainMenuItems.teachers },
    { id: 'groups' as Page, label: 'المجموعات', icon: Users, show: mainMenuItems.groups },
    { id: 'special-status' as Page, label: 'الحالات الخاصة', icon: Heart, show: mainMenuItems.specialNeeds },
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
              <div className="bg-blue-600 p-3 rounded-2xl">
                <Users className="text-white" size={32} />
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800">
                  {systemDescription || 'نظام إدارة شاملة لبيانات الطلاب'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {schoolName || 'قم بإضافة اسم المدرسة من الإعدادات'}
                </p>
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
                      <Heart size={18} className="text-pink-600" />
                      <span className="text-sm font-medium text-gray-700">إدارة الحالات الخاصة</span>
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
                      <span className="text-sm font-medium text-red-600">تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowProfileSettings(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2"
              >
                <UserIcon size={20} />
                <span>{teacherName || 'الملف الشخصي'}</span>
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

            {/* حالات خاصة */}
            {headerCards.reception && (
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md w-48">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-bold">{specialStatusCount}</div>
                  <Heart size={32} className="opacity-80" />
                </div>
                <div className="text-sm opacity-90">حالات خاصة</div>
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
                      <label className="block text-sm font-bold text-gray-700 mb-2 text-right">الحالات الخاصة</label>
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
                        {Array.from(new Set(groups.map(g => g.stage))).sort().map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                    </div>
                  </div>

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
                </div>
              </div>
            </aside>

            {/* Main */}
            <div className="flex-1">
              <div className="bg-gradient-to-r from-teal-400 to-teal-500 rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-white">استفسار عن طالب</h2>
                  <Search className="text-white" size={28} />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث عن طالب بالاسم، السجل المدني، أو رقم الجوال..."
                    className="w-full px-6 py-4 pr-12 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
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

                    const stages = Array.from(new Set(filteredGroups.map(g => g.stage)))

                    const stageColors = [
                      { from: 'from-gray-300', to: 'to-gray-400', hoverFrom: 'hover:from-gray-400', hoverTo: 'hover:to-gray-500', group: 'from-blue-100', groupTo: 'to-blue-200', groupHoverFrom: 'hover:from-blue-200', groupHoverTo: 'hover:to-blue-300' },
                      { from: 'from-gray-300', to: 'to-gray-400', hoverFrom: 'hover:from-gray-400', hoverTo: 'hover:to-gray-500', group: 'from-blue-100', groupTo: 'to-blue-200', groupHoverFrom: 'hover:from-blue-200', groupHoverTo: 'hover:to-blue-300' },
                      { from: 'from-gray-300', to: 'to-gray-400', hoverFrom: 'hover:from-gray-400', hoverTo: 'hover:to-gray-500', group: 'from-blue-100', groupTo: 'to-blue-200', groupHoverFrom: 'hover:from-blue-200', groupHoverTo: 'hover:to-blue-300' },
                      { from: 'from-gray-300', to: 'to-gray-400', hoverFrom: 'hover:from-gray-400', hoverTo: 'hover:to-gray-500', group: 'from-blue-100', groupTo: 'to-blue-200', groupHoverFrom: 'hover:from-blue-200', groupHoverTo: 'hover:to-blue-300' },
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
                        return sum + groupStudents.length
                      }, 0)

                      if (totalStageStudents === 0 && searchTerm !== '') return null

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
                                className={`text-white transition-transform ${isStageExpanded ? 'rotate-180' : ''}`}
                              />
                              <h2 className="text-lg font-bold text-white">{stage}</h2>
                            </div>
                            <div className="bg-white bg-opacity-30 px-4 py-1.5 rounded-full">
                              <span className="text-white font-bold text-sm">{totalStageStudents} طالب</span>
                            </div>
                          </button>

                          {isStageExpanded && (
                            <div className="space-y-3 pr-3">
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

                                if (groupStudents.length === 0 && searchTerm !== '') return null

                                const isGroupExpanded = expandedGroups.has(group.id)

                                return (
                                  <div key={group.id} className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-200">
                                    <button
                                      onClick={() => toggleGroup(group.id)}
                                      className={`w-full bg-gradient-to-r ${colors.group} ${colors.groupTo} px-5 py-3 flex items-center justify-between ${colors.groupHoverFrom} ${colors.groupHoverTo} transition-all`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <ChevronDown
                                          size={20}
                                          className={`text-white transition-transform ${isGroupExpanded ? 'rotate-180' : ''}`}
                                        />
                                        <h3 className="text-base font-bold text-white">{group.name}</h3>
                                      </div>
                                      <div className="bg-white bg-opacity-30 px-3.5 py-1.5 rounded-full">
                                        <span className="text-white font-bold text-xs">{groupStudents.length} طالب</span>
                                      </div>
                                    </button>

                                    {isGroupExpanded && (
                                      <div className="p-6">
                                        {groupStudents.length === 0 ? (
                                          <p className="text-center text-gray-500 py-8">لا يوجد طلاب</p>
                                        ) : (
                                          <div className="space-y-3">
                                            {groupStudents.map(student => {
                                              const specialStatus = specialStatuses.find(ss => ss.id === student.special_status_id)
                                              return (
                                                <div
                                                  key={student.id}
                                                  className={`border-2 rounded-xl p-4 transition-all ${
                                                    specialStatus ? 'border-yellow-300 bg-yellow-50' : 'border-teal-200 bg-teal-50'
                                                  }`}
                                                >
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                      <h4 className="text-lg font-bold text-gray-900 mb-2">{student.name}</h4>
                                                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-right mb-3">
                                                        <p className="text-gray-700">السجل: {student.national_id}</p>
                                                        <p className="text-gray-700">الصف: {student.grade}</p>
                                                        <p className="text-gray-700">جوال: {student.phone}</p>
                                                        <p className="text-gray-700">ولي أمر: {student.guardian_phone}</p>
                                                      </div>
                                                      <div className="flex gap-3 text-xs font-semibold">
                                                        {mainMenuItems.reception && (
                                                          <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
                                                            الاستقبال: {student.visit_count || 0}
                                                          </span>
                                                        )}
                                                        {mainMenuItems.permission && (
                                                          <span className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg">
                                                            الاستئذانات: {student.permission_count || 0}
                                                          </span>
                                                        )}
                                                        {mainMenuItems.violations && (
                                                          <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg">
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
                  <span>الحالات الخاصة</span>
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
              <h2 className="text-lg font-bold text-white">إدارة الحالات الخاصة</h2>
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
                  placeholder="مثال: ربو، سكري، يتيم..."
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
                      <option value="الصف الأول الثانوي">الصف الأول الثانوي</option>
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
                        <Heart size={16} className="text-pink-600" />
                        <span className="text-xs font-medium text-gray-800">حالات خاصة</span>
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
                        <Heart size={16} className="text-pink-600" />
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
                  <p className="font-bold">✅ السماح بدخول الطالب للفصل</p>
                  <p>اسم الطالب: <span className="font-bold">{allowEntryStudent.name}</span></p>
                  <p>المرسل: <span className="font-bold">{teacherName || 'مسؤول النظام'}</span></p>
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

                    const message = `*✅ السماح بدخول الطالب للفصل*

اسم الطالب: *${allowEntryStudent.name}*
المرسل: ${teacherName || 'مسؤول النظام'}`

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
                  window.print()
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
    </div>
  )
}

export default App
