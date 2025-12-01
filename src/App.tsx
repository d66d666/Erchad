import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { db } from './lib/db'
import { Student, Group, SpecialStatus } from './types'
import { LoginPage } from './pages/LoginPage'
import { ProfileSettings } from './components/ProfileSettings'
import { ExcelImport } from './components/ExcelImport'
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
  const [schoolName, setSchoolName] = useState('')
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showExcelImport, setShowExcelImport] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printStudent, setPrintStudent] = useState<Student | null>(null)

  // فلاتر
  const [specialStatusFilter, setSpecialStatusFilter] = useState<string>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [activityFilter, setActivityFilter] = useState<string>('all')

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
        setSchoolName(profileRes.data.school_name || '')
      }
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
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userId')
    setIsLoggedIn(false)
    setCurrentPage('home')
  }

  const handleLogin = () => {
    setIsLoggedIn(true)
    fetchData()
  }

  // إحصائيات
  const totalStudents = students.length
  const totalTeachers = 0 // سيتم جلبه من قاعدة البيانات
  const specialStatusCount = students.filter(s => s.special_status_id !== null).length
  const receptionCount = 0
  const permissionsCount = 0
  const violationsCount = 0

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
            {/* Left Side - Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfileSettings(true)}
                className="bg-gradient-to-r from-yellow-300 to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 text-gray-800 px-4 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
              >
                <UserIcon size={18} />
                <span className="text-sm">الملف الشخصي</span>
              </button>

              <button className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-800 px-4 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2">
                <span className="text-lg">👑</span>
                <span className="text-sm">مالك النظام</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white px-4 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Settings size={18} />
                  <span className="text-sm">الإعدادات</span>
                </button>

                {showSettingsMenu && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowExcelImport(true)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <Download size={16} className="text-green-600" />
                      <span className="text-sm">استيراد من Excel</span>
                    </button>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={16} className="text-red-600" />
                      <span className="text-sm text-red-600">تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Title */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <h1 className="text-2xl font-bold text-gray-800">
                  نظام إدارة شاملة لبيانات الطلاب
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  قم بإضافة اسم المدرسة من الإعدادات
                </p>
              </div>
              <div className="bg-blue-600 p-3 rounded-2xl">
                <Users className="text-white" size={28} />
              </div>
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
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{receptionCount}</div>
                <UserCheck size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">استقبال الطلاب</div>
            </div>

            {/* استئذانات */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{permissionsCount}</div>
                <LogOut size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">استئذانات</div>
            </div>

            {/* المخالفات */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold">{violationsCount}</div>
                <AlertCircle size={32} className="opacity-80" />
              </div>
              <div className="text-sm opacity-90">المخالفات</div>
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
            {/* Main Area */}
            <div className="flex-1">
              {/* Search Box */}
              <div className="bg-gradient-to-r from-teal-400 to-teal-500 rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Search className="text-white" size={28} />
                  <h2 className="text-2xl font-bold text-white">استفسار عن طالب</h2>
                </div>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن طالب بالاسم، السجل المدني، أو رقم الجوال..."
                className="w-full px-6 py-4 rounded-xl text-lg border-none focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            {/* Students List */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {students.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={64} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">لا يوجد طلاب</h3>
                  <p className="text-gray-500">قم بإضافة طلاب من خلال استيراد Excel أو إضافة يدوية</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students
                    .filter(s =>
                      searchTerm === '' ||
                      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.national_id.includes(searchTerm)
                    )
                    .map(student => (
                      <div
                        key={student.id}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.national_id}</p>
                            {student.guardian_phone && (
                              <p className="text-sm text-gray-500">ولي الأمر: {student.guardian_phone}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {student.guardian_phone && (
                              <button
                                onClick={() => {
                                  const phone = formatPhoneForWhatsApp(student.guardian_phone)
                                  if (phone) {
                                    window.open(`https://wa.me/${phone}`, '_blank')
                                  }
                                }}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                title="إرسال رسالة واتساب لولي الأمر"
                              >
                                <MessageCircle size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setPrintStudent(student)
                                setShowPrintModal(true)
                              }}
                              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                              title="طباعة بيانات الطالب"
                            >
                              <Printer size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Filters */}
          <aside className="w-80">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings className="text-gray-600" size={22} />
                <h3 className="text-xl font-bold text-gray-800">التصفية</h3>
              </div>

              <div className="space-y-4">
                {/* الحالات الخاصة */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    الحالات الخاصة
                  </label>
                  <div className="relative">
                    <select
                      value={specialStatusFilter}
                      onChange={(e) => setSpecialStatusFilter(e.target.value)}
                      className="w-full px-4 py-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-300 text-center font-bold"
                    >
                      <option value="all">الكل</option>
                      {specialStatuses.map(status => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                {/* المرحلة الدراسية */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    المرحلة الدراسية
                  </label>
                  <div className="relative">
                    <select
                      value={stageFilter}
                      onChange={(e) => setStageFilter(e.target.value)}
                      className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 text-center font-bold"
                    >
                      <option value="all">الكل</option>
                      {Array.from(new Set(groups.map(g => g.stage))).map(stage => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                {/* المجموعات */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    المجموعات
                  </label>
                  <div className="relative">
                    <select
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 text-center font-bold"
                    >
                      <option value="all">الكل</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                {/* تصفية حسب النشاط */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    تصفية حسب النشاط
                  </label>
                  <div className="relative">
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="w-full px-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300 text-center font-bold"
                    >
                      <option value="all">الكل</option>
                      <option value="reception">لديهم استقبال اليوم</option>
                      <option value="permission">لديهم استئذان اليوم</option>
                      <option value="violation">لديهم مخالفة اليوم</option>
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
              </div>
            </div>
          </aside>
          </div>
        )}

        {currentPage === 'teachers' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">صفحة المعلمين</h2>
            <p className="text-gray-600">قريباً...</p>
          </div>
        )}

        {currentPage === 'groups' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">صفحة المجموعات</h2>
            <p className="text-gray-600">قريباً...</p>
          </div>
        )}

        {currentPage === 'special-status' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">صفحة الحالات الخاصة</h2>
            <p className="text-gray-600">قريباً...</p>
          </div>
        )}

        {currentPage === 'reception' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">صفحة استقبال الطلاب</h2>
            <p className="text-gray-600">قريباً...</p>
          </div>
        )}

        {currentPage === 'permission' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">صفحة الاستئذان</h2>
            <p className="text-gray-600">قريباً...</p>
          </div>
        )}

        {currentPage === 'absence' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">صفحة المخالفات</h2>
            <p className="text-gray-600">قريباً...</p>
          </div>
        )}
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
          }}
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
