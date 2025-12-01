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
import { ExcelImport } from './components/ExcelImport'
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
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printStudent, setPrintStudent] = useState<Student | null>(null)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

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
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentPage === 'home') {
      fetchTeachersCount()
    }
  }, [currentPage])

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

  const handleExportData = async () => {
    try {
      const dataToExport = {
        students,
        groups,
        specialStatuses,
        teacherProfile: {
          name: teacherName,
          schoolName: schoolName
        },
        exportDate: new Date().toISOString()
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

      alert('تم تصدير البيانات بنجاح!')
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('حدث خطأ أثناء تصدير البيانات')
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
    { id: 'home' as Page, label: 'الصفحة الرئيسية', icon: Home },
    { id: 'teachers' as Page, label: 'المعلمين', icon: GraduationCap },
    { id: 'groups' as Page, label: 'المجموعات', icon: Users },
    { id: 'special-status' as Page, label: 'الحالات الخاصة', icon: Heart },
    { id: 'reception' as Page, label: 'استقبال الطلاب', icon: UserCheck },
    { id: 'permission' as Page, label: 'الاستئذان', icon: LogOut },
    { id: 'absence' as Page, label: 'المخالفات', icon: AlertCircle },
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
                        setCurrentPage('groups')
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Users size={18} className="text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">إدارة المجموعات</span>
                    </button>

                    <button
                      onClick={() => {
                        setCurrentPage('special-status')
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Heart size={18} className="text-pink-600" />
                      <span className="text-sm font-medium text-gray-700">إدارة الحالات الخاصة</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <List size={18} className="text-cyan-600" />
                      <span className="text-sm font-medium text-gray-700">إدارة التهديد والقوائم</span>
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
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-sm font-medium">
                    {teacherName || 'الملف الشخصي'}
                  </span>
                  {teacherPhone && (
                    <span className="text-xs opacity-90">
                      {teacherPhone}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-6 gap-3">
            {/* إجمالي الطلاب */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{totalStudents}</div>
                <Users size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">إجمالي الطلاب</div>
            </div>

            {/* المعلمين */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{totalTeachers}</div>
                <GraduationCap size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">المعلمين</div>
            </div>

            {/* حالات خاصة */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{specialStatusCount}</div>
                <Heart size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">حالات خاصة</div>
            </div>

            {/* استقبال الطلاب */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{todayReceptionCount}</div>
                <UserCheck size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">استقبال اليوم</div>
            </div>

            {/* استئذانات */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{todayPermissionsCount}</div>
                <LogOut size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">استئذانات اليوم</div>
            </div>

            {/* المخالفات */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{todayViolationsCount}</div>
                <AlertCircle size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">مخالفات اليوم</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex gap-2 py-3 justify-center">
            {navItems.map((item) => {
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

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 text-right">تصفية حسب النشاط</label>
                    <div className="relative">
                      <select
                        value={activityFilter}
                        onChange={(e) => setActivityFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-400 appearance-none cursor-pointer"
                      >
                        <option value="all">الكل</option>
                        <option value="reception">لديهم استقبال اليوم</option>
                        <option value="permission">لديهم استئذان اليوم</option>
                        <option value="violation">لديهم مخالفة اليوم</option>
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
                    </div>
                  </div>
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
                                                        <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg">
                                                          الاستقبال: {student.visit_count || 0}
                                                        </span>
                                                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg">
                                                          الاستئذانات: {student.permission_count || 0}
                                                        </span>
                                                        <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg">
                                                          المخالفات: {student.violation_count || 0}
                                                        </span>
                                                      </div>
                                                    </div>
                                                    <button className="p-2 hover:bg-white rounded-lg">
                                                      <span className="text-2xl text-gray-600">⋮</span>
                                                    </button>
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

      {showExcelImport && (
        <ExcelImport
          onImportComplete={() => {
            setShowExcelImport(false)
            fetchData()
            fetchTeachersCount()
          }}
        />
      )}

      {showAddStudentModal && (
        <AddStudentModal
          groups={groups}
          specialStatuses={specialStatuses}
          onClose={() => setShowAddStudentModal(false)}
          onStudentAdded={fetchData}
        />
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

                  <div className="bg-gray-50 p-4 rounded-xl col-span-2">
                    <p className="text-sm text-gray-600 mb-1">الحالة الخاصة</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {printStudent.special_status_id
                        ? specialStatuses.find(s => s.id === printStudent.special_status_id)?.name
                        : 'لا توجد'}
                    </p>
                  </div>
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
