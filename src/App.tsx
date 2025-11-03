import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { db } from './lib/db'
import { Student, Group, SpecialStatus } from './types'
import { StudentForm } from './components/StudentForm'
import { StudentsList } from './components/StudentsList'
import { SearchBar } from './components/SearchBar'
import { GroupSelector } from './components/GroupSelector'
import { FiltersPanel } from './components/FiltersPanel'
import { ManageModal } from './components/ManageModal'
import { ExcelImport } from './components/ExcelImport'
import { EditStudentModal } from './components/EditStudentModal'
import { ProfileSettings } from './components/ProfileSettings'
import { GroupsPage } from './pages/GroupsPage'
import { GroupsManagementPage } from './pages/GroupsManagementPage'
import { SpecialStatusPage } from './pages/SpecialStatusPage'
import { AbsencePage } from './pages/AbsencePage'
import { ReceptionPage } from './pages/ReceptionPage'
import { PermissionPage } from './pages/PermissionPage'
import { TeachersPage } from './pages/TeachersPage'
import { LoginPage } from './pages/LoginPage'
import {
  Home,
  Users,
  FileText,
  ClipboardList,
  UserCheck,
  LogOut,
  Download,
  Settings,
  Heart,
  AlertCircle,
  Search,
  User as UserIcon,
  GraduationCap
} from 'lucide-react'

type Page = 'home' | 'groups' | 'special-status' | 'absence' | 'reception' | 'permission' | 'teachers'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [filter, setFilter] = useState<{
    type: 'status' | 'special_status'
    value: string
  } | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | undefined>()
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [showStatusesModal, setShowStatusesModal] = useState(false)
  const [showImportSection, setShowImportSection] = useState(false)
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showGroupsManagement, setShowGroupsManagement] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)

      // جلب البيانات من Supabase
      const [groupsRes, statusesRes, studentsRes, profileRes, teachersRes] = await Promise.all([
        supabase.from('groups').select('*').order('stage'),
        supabase.from('special_statuses').select('*').order('name'),
        supabase.from('students').select('*').order('name'),
        supabase.from('teacher_profile').select('*').maybeSingle(),
        supabase.from('teachers').select('*').order('name'),
      ])

      // حفظ البروفايل في IndexedDB
      if (profileRes.data) {
        await db.teacher_profile.clear()
        await db.teacher_profile.put(profileRes.data)
      }

      // حفظ المجموعات في IndexedDB
      if (groupsRes.data) {
        await db.groups.clear()
        for (const group of groupsRes.data) {
          await db.groups.put(group)
        }
        const sortedGroups = groupsRes.data.sort((a: Group, b: Group) => {
          const stageOrder: Record<string, number> = {
            'الصف الاول الثانوي': 1,
            'الصف الثاني الثانوي': 2,
            'الصف الثالث الثانوي': 3,
          }
          const stageA = stageOrder[a.stage] || 999
          const stageB = stageOrder[b.stage] || 999
          if (stageA !== stageB) return stageA - stageB
          return (a.display_order || 999) - (b.display_order || 999)
        })
        setGroups(sortedGroups)
      }

      // حفظ الحالات الخاصة في IndexedDB
      if (statusesRes.data) {
        await db.special_statuses.clear()
        for (const status of statusesRes.data) {
          await db.special_statuses.put(status)
        }
        setSpecialStatuses(statusesRes.data)
      }

      // حفظ الطلاب في IndexedDB
      if (studentsRes.data) {
        await db.students.clear()
        for (const student of studentsRes.data) {
          await db.students.put(student)
        }
        setStudents(studentsRes.data as Student[])
      }

      // حفظ المعلمين في IndexedDB
      if (teachersRes.data) {
        await db.teachers.clear()
        for (const teacher of teachersRes.data) {
          await db.teachers.put(teacher)
        }
        setTotalTeachers(teachersRes.data.length)
      }

      // تحديث اسم المعلم واسم المدرسة من البيانات المحملة
      if (profileRes.data) {
        setTeacherName(profileRes.data.name || '')
        setSchoolName(profileRes.data.school_name || '')
      } else {
        // إذا لا يوجد بروفايل، نترك الحقول فاضية
        setTeacherName('')
        setSchoolName('')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize default login credentials if not exists
      const { db } = await import('./lib/db')
      try {
        const existingCredentials = await db.login_credentials.toArray()
        if (existingCredentials.length === 0) {
          await db.login_credentials.add({
            id: crypto.randomUUID(),
            username: 'admin',
            password_hash: 'admin123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }

        // Update existing groups to have display_order if missing
        const allGroups = await db.groups.toArray()
        const groupsToUpdate = allGroups.filter(g => g.display_order === undefined || g.display_order === null)
        if (groupsToUpdate.length > 0) {
          const stageGroups: Record<string, any[]> = {}
          groupsToUpdate.forEach(g => {
            if (!stageGroups[g.stage]) stageGroups[g.stage] = []
            stageGroups[g.stage].push(g)
          })

          for (const [stage, groups] of Object.entries(stageGroups)) {
            for (let i = 0; i < groups.length; i++) {
              await db.groups.update(groups[i].id, { display_order: i + 1 })
            }
          }
        }
      } catch (error) {
        console.error('Error initializing:', error)
      }

      const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
      setIsLoggedIn(loggedIn)
      if (loggedIn) {
        fetchData()
      } else {
        setLoading(false)
      }
    }

    initializeApp()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showSettingsMenu && !target.closest('.settings-menu-container')) {
        setShowSettingsMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettingsMenu])

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      searchTerm === '' ||
      student.name.includes(searchTerm) ||
      student.national_id.includes(searchTerm) ||
      student.phone.includes(searchTerm) ||
      student.guardian_phone.includes(searchTerm)

    const matchesGroup =
      !selectedGroupId || student.group_id === selectedGroupId

    return matchesSearch && matchesGroup
  })

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

  const applyFilters = (students: Student[]) => {
    return students.filter((student) => {
      if (!filter) return true
      if (filter.type === 'status') return student.status === filter.value
      if (filter.type === 'special_status') {
        if (filter.value === 'none') return student.special_status_id === null
        return student.special_status_id === filter.value
      }
      return true
    })
  }

  const groupedStudents = selectedGroupId
    ? [
        {
          group: groups.find((g) => g.id === selectedGroupId)!,
          students: applyFilters(filteredStudents),
        },
      ]
    : groups.map((group) => ({
        group,
        students: applyFilters(filteredStudents.filter((s) => s.group_id === group.id)),
      }))

  const totalStudents = students.length
  const [totalTeachers, setTotalTeachers] = useState(0)
  const absentStudents = students.filter(s => s.status === 'استئذان').length
  const specialStatusStudents = students.filter(s => s.special_status_id !== null).length

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl shadow-lg">
                <Users className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {schoolName || 'نظام إدارة شاملة لبيانات الطلاب'}
                </h1>
                <p className="text-base text-gray-600 mt-1 font-medium">
                  {schoolName ? '' : 'قم بإضافة وصف النظام من الإعدادات'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative settings-menu-container">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="flex items-center gap-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all hover:shadow-xl hover:scale-105"
                >
                  <Settings size={20} />
                  <span>الإعدادات</span>
                </button>

                {showSettingsMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowImportSection(!showImportSection)
                        setShowSettingsMenu(false)
                        setCurrentPage('home')
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Download size={18} className="text-green-600" />
                      <span className="font-semibold text-gray-700">استيراد من Excel</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowGroupsManagement(true)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Users size={18} className="text-blue-600" />
                      <span className="font-semibold text-gray-700">إدارة المجموعات</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowStatusesModal(true)
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Heart size={18} className="text-pink-600" />
                      <span className="font-semibold text-gray-700">إدارة الحالات الخاصة</span>
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setShowSettingsMenu(false)
                      }}
                      className="w-full text-right px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3"
                    >
                      <LogOut size={18} className="text-red-600" />
                      <span className="font-semibold text-red-600">تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowProfileSettings(true)}
                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-bold shadow-lg border-2 border-gray-200 transition-all hover:shadow-xl"
              >
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                  <UserIcon className="text-white" size={20} />
                </div>
                {teacherName ? (
                  <span className="text-sm">{teacherName}</span>
                ) : (
                  <span className="text-sm">الملف الشخصي</span>
                )}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">إجمالي الطلاب</p>
                  <p className="text-3xl font-bold mt-1">{totalStudents}</p>
                </div>
                <Users size={40} className="text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">المعلمين</p>
                  <p className="text-3xl font-bold mt-1">{totalTeachers}</p>
                </div>
                <GraduationCap size={40} className="text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">استئذانات</p>
                  <p className="text-3xl font-bold mt-1">{absentStudents}</p>
                </div>
                <LogOut size={40} className="text-orange-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">حالات خاصة</p>
                  <p className="text-3xl font-bold mt-1">{specialStatusStudents}</p>
                </div>
                <Heart size={40} className="text-purple-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 overflow-x-auto py-3">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showImportSection && currentPage === 'home' && (
          <div className="mb-6">
            <ExcelImport
              onImportComplete={() => {
                fetchData()
                setShowImportSection(false)
              }}
            />
          </div>
        )}

        {currentPage === 'teachers' && !showGroupsManagement && (
          <TeachersPage />
        )}

        {currentPage === 'groups' && !showGroupsManagement && (
          <GroupsPage />
        )}

        {currentPage === 'special-status' && !showGroupsManagement && (
          <SpecialStatusPage
            students={students}
            groups={groups}
            specialStatuses={specialStatuses}
          />
        )}

        {currentPage === 'absence' && !showGroupsManagement && (
          <AbsencePage students={students} groups={groups} />
        )}

        {currentPage === 'reception' && !showGroupsManagement && (
          <ReceptionPage />
        )}

        {currentPage === 'permission' && !showGroupsManagement && (
          <PermissionPage />
        )}

        {showGroupsManagement && (
          <GroupsManagementPage
            onClose={() => {
              setShowGroupsManagement(false)
              fetchData()
            }}
          />
        )}

        {currentPage === 'home' && !showGroupsManagement && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-6">
              {editingStudent && (
                <StudentForm
                  groups={groups}
                  specialStatuses={specialStatuses}
                  onStudentAdded={fetchData}
                  editingStudent={editingStudent}
                  onEditingStudentChange={setEditingStudent}
                />
              )}

              <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl shadow-lg p-6 border-2 border-teal-400">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Search className="text-teal-100" size={28} />
                  استفسار عن طالب
                </h2>
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="ابحث عن طالب بالاسم، السجل المدني، أو رقم الجوال..."
                />
              </div>

              <div className="space-y-6">
                {filteredStudents.length === 0 && searchTerm ? (
                  <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-200 text-center">
                    <Search className="mx-auto text-gray-300 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد نتائج</h3>
                    <p className="text-gray-500">لم يتم العثور على طالب يطابق بحثك: "{searchTerm}"</p>
                  </div>
                ) : (
                  groupedStudents.map(({ group, students: groupStudents }) =>
                    groupStudents.length > 0 ? (
                      <div key={group.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                        <StudentsList
                          students={groupStudents}
                          groupName={group.name}
                          specialStatuses={specialStatuses}
                          onStudentDeleted={fetchData}
                          onEditStudent={setEditingStudent}
                        />
                      </div>
                    ) : null
                  )
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-200 sticky top-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="text-gray-600" size={22} />
                  التصفية
                </h3>
                <FiltersPanel
                  specialStatuses={specialStatuses}
                  filter={filter}
                  onFilterChange={setFilter}
                />

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="text-blue-600" size={22} />
                    المجموعات
                  </h3>
                  <GroupSelector
                    groups={groups}
                    selectedGroupId={selectedGroupId}
                    onSelectGroup={setSelectedGroupId}
                  />
                </div>

              </div>
            </aside>
          </div>
        )}
      </main>

      <ManageModal
        type="groups"
        isOpen={showGroupsModal}
        onClose={() => setShowGroupsModal(false)}
        onDataUpdated={fetchData}
        existingItems={groups}
      />

      <ManageModal
        type="special_statuses"
        isOpen={showStatusesModal}
        onClose={() => setShowStatusesModal(false)}
        onDataUpdated={fetchData}
        existingItems={specialStatuses}
      />

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          groups={groups}
          specialStatuses={specialStatuses}
          onClose={() => setEditingStudent(undefined)}
          onStudentUpdated={fetchData}
        />
      )}

      {showProfileSettings && (
        <ProfileSettings
          onClose={() => {
            setShowProfileSettings(false)
            fetchData()
          }}
        />
      )}

      <footer className="mt-12 pb-6 text-center">
        <div className="inline-block bg-gradient-to-r from-blue-50 to-slate-50 px-8 py-4 rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">
            تصميم وتطوير:{' '}
            <span className="font-bold text-blue-600">الأستاذ وائل الفيفي</span>
          </p>
          <p className="text-gray-500 text-xs mt-1" dir="ltr">
            📱 0558890902
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
