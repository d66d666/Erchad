import { useEffect, useState } from 'react'
import { Teacher, Group, TeacherGroup } from '../types'
import { Users, Plus, Edit2, Trash2, BookOpen, Search } from 'lucide-react'
import { db } from '../lib/db'
import { arabicTextIncludes } from '../lib/normalizeArabic'
import { CustomAlert } from '../components/CustomAlert'

interface TeacherWithGroups extends Teacher {
  teacher_groups?: TeacherGroup[]
  groups?: Group[]
}

export function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherWithGroups[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const allTeachers = await db.teachers.orderBy('name').toArray()
    const allGroups = await db.groups.orderBy('name').toArray()
    const allTeacherGroups = await db.teacher_groups.toArray()

    setGroups(allGroups)

    const teachersWithGroups = allTeachers.map(teacher => ({
      ...teacher,
      groups: allTeacherGroups
        .filter(tg => tg.teacher_id === teacher.id)
        .map(tg => allGroups.find(g => g.id === tg.group_id))
        .filter(Boolean) as Group[]
    }))
    setTeachers(teachersWithGroups)

    setLoading(false)
  }

  const handleAddNew = () => {
    setEditingTeacher(null)
    setShowModal(true)
  }

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setShowModal(true)
  }

  const handleDelete = async (teacherId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المعلم؟')) return

    try {
      await db.teachers.delete(teacherId)
      await db.teacher_groups.where('teacher_id').equals(teacherId).delete()
      fetchData()
    } catch (error) {
      setAlertMessage('حدث خطأ أثناء الحذف')
      setAlertType('error')
      setShowAlert(true)
      console.error(error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-md p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">المعلمين</h1>
              <p className="text-blue-100 text-sm">
                إجمالي المعلمين: {teachers.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all text-sm"
          >
            <Plus size={18} />
            <span>إضافة معلم</span>
          </button>
        </div>
      </div>

      {!loading && teachers.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن معلم بالاسم أو رقم الجوال..."
              className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
          <p className="text-gray-500 text-lg">جاري التحميل...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-200">
          <Users className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-xl mb-4">لا يوجد معلمين</p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            <span>إضافة أول معلم</span>
          </button>
        </div>
      ) : (() => {
        const filteredTeachers = teachers.filter((teacher) => {
          if (!searchQuery.trim()) return true
          return (
            arabicTextIncludes(teacher.name, searchQuery) ||
            teacher.phone.includes(searchQuery)
          )
        })

        if (filteredTeachers.length === 0) {
          return (
            <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
              <Search className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500 text-lg">لم يتم العثور على نتائج</p>
              <p className="text-gray-400 text-sm mt-2">جرب البحث بكلمات مختلفة</p>
            </div>
          )
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-400 p-3">
                <h3 className="text-lg font-bold text-white">{teacher.name}</h3>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📱</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">رقم الجوال</p>
                    <p className="text-sm font-medium text-gray-800 truncate">{teacher.phone}</p>
                  </div>
                </div>

                {teacher.groups && teacher.groups.length > 0 && (() => {
                  const stages = Array.from(new Set(teacher.groups!.map(g => g.stage)))
                  return (
                    <>
                      <div className="flex items-start gap-2">
                        <BookOpen className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">المراحل</p>
                          <div className="flex flex-wrap gap-1">
                            {stages.map((stage) => (
                              <span
                                key={stage}
                                className="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded"
                              >
                                {stage}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1.5">المجموعات</p>
                        <div className="space-y-1.5">
                          {stages.map((stage) => {
                            const stageGroups = teacher.groups!.filter(g => g.stage === stage)
                            return (
                              <div key={stage}>
                                <p className="text-xs font-semibold text-gray-600 mb-0.5">{stage}</p>
                                <div className="flex flex-wrap gap-1">
                                  {stageGroups.map((group) => (
                                    <span
                                      key={group.id}
                                      className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded"
                                    >
                                      {group.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )
                })()}

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(teacher)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <Edit2 size={14} />
                    <span>تعديل</span>
                  </button>
                  <button
                    onClick={() => handleDelete(teacher.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>حذف</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )
      })()}

      {showModal && (
        <TeacherFormModal
          teacher={editingTeacher}
          groups={groups}
          onClose={() => setShowModal(false)}
          onSave={fetchData}
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

interface TeacherFormModalProps {
  teacher: Teacher | null
  groups: Group[]
  onClose: () => void
  onSave: () => void
}

function TeacherFormModal({ teacher, groups, onClose, onSave }: TeacherFormModalProps) {
  const [name, setName] = useState(teacher?.name || '')
  const [phone, setPhone] = useState(teacher?.phone || '')
  const [specialization, setSpecialization] = useState(teacher?.specialization || '')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [selectedStages, setSelectedStages] = useState<string[]>([])

  const stages = Array.from(new Set(groups.map(g => g.stage))).sort()
  const filteredGroups = selectedStages.length > 0
    ? groups.filter(g => selectedStages.includes(g.stage))
    : []

  useEffect(() => {
    if (teacher) {
      fetchTeacherGroups()
    } else {
      setLoadingGroups(false)
    }
  }, [teacher])

  const fetchTeacherGroups = async () => {
    if (!teacher) return

    const teacherGroups = await db.teacher_groups
      .where('teacher_id')
      .equals(teacher.id)
      .toArray()

    if (teacherGroups) {
      const groupIds = teacherGroups.map(tg => tg.group_id)
      setSelectedGroupIds(groupIds)

      const allGroups = await db.groups.toArray()
      const teacherGroupsData = groupIds.map(gId => allGroups.find(g => g.id === gId)).filter(Boolean)
      const uniqueStages = Array.from(new Set(
        teacherGroupsData.map(g => g!.stage).filter(Boolean)
      )) as string[]
      setSelectedStages(uniqueStages)
    }
    setLoadingGroups(false)
  }

  const toggleStage = (stage: string) => {
    if (selectedStages.includes(stage)) {
      setSelectedStages(selectedStages.filter(s => s !== stage))
      const groupsInStage = groups.filter(g => g.stage === stage).map(g => g.id)
      setSelectedGroupIds(selectedGroupIds.filter(id => !groupsInStage.includes(id)))
    } else {
      setSelectedStages([...selectedStages, stage])
    }
  }

  const toggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter(id => id !== groupId))
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId])
    }
  }

  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !phone.trim()) {
      setAlertMessage('الرجاء تعبئة جميع الحقول المطلوبة')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    setLoading(true)

    try {
      if (teacher) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('💾 تحديث معلم:', teacher.id)
        console.log('📝 الاسم:', name.trim())
        console.log('📱 الجوال:', phone.trim())
        console.log('📚 عدد المجموعات المختارة:', selectedGroupIds.length)

        await db.teachers.update(teacher.id, {
          name: name.trim(),
          phone: phone.trim(),
          specialization: specialization.trim() || undefined
        })

        console.log('🗑️ حذف المجموعات القديمة للمعلم')
        const deletedCount = await db.teacher_groups.where('teacher_id').equals(teacher.id).delete()
        console.log(`✓ تم حذف ${deletedCount} رابط قديم`)

        if (selectedGroupIds.length > 0) {
          const teacherGroupsData = selectedGroupIds.map(groupId => ({
            id: crypto.randomUUID(),
            teacher_id: teacher.id,
            group_id: groupId,
            created_at: new Date().toISOString()
          }))

          console.log('➕ إضافة مجموعات جديدة:', teacherGroupsData.length, 'مجموعة')
          teacherGroupsData.forEach((tg, i) => {
            const group = groups.find(g => g.id === tg.group_id)
            console.log(`  ${i + 1}. ${group?.name || 'غير معروف'} (ID: ${tg.group_id})`)
          })

          await db.teacher_groups.bulkAdd(teacherGroupsData)

          const verified = await db.teacher_groups.where('teacher_id').equals(teacher.id).toArray()
          console.log('✅ تم التحقق - المجموعات المحفوظة:', verified.length, 'مجموعة')

          if (verified.length !== selectedGroupIds.length) {
            console.error('⚠️ تحذير: عدد المجموعات المحفوظة لا يطابق المتوقع!')
            console.error(`المتوقع: ${selectedGroupIds.length}, المحفوظ: ${verified.length}`)
          } else {
            console.log('✓ جميع المجموعات تم حفظها بنجاح')
          }
        } else {
          console.log('ℹ️ لم يتم اختيار أي مجموعات - سيتم حذف جميع الروابط')
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      } else {
        const newTeacherId = crypto.randomUUID()
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('💾 إضافة معلم جديد:', newTeacherId)
        console.log('📝 الاسم:', name.trim())
        console.log('📱 الجوال:', phone.trim())
        console.log('📚 عدد المجموعات المختارة:', selectedGroupIds.length)

        await db.teachers.add({
          id: newTeacherId,
          name: name.trim(),
          phone: phone.trim(),
          specialization: specialization.trim() || undefined,
          created_at: new Date().toISOString()
        })
        console.log('✓ تم إضافة المعلم بنجاح')

        if (selectedGroupIds.length > 0) {
          const teacherGroupsData = selectedGroupIds.map(groupId => ({
            id: crypto.randomUUID(),
            teacher_id: newTeacherId,
            group_id: groupId,
            created_at: new Date().toISOString()
          }))

          console.log('➕ إضافة مجموعات للمعلم الجديد:', teacherGroupsData.length, 'مجموعة')
          teacherGroupsData.forEach((tg, i) => {
            const group = groups.find(g => g.id === tg.group_id)
            console.log(`  ${i + 1}. ${group?.name || 'غير معروف'} (ID: ${tg.group_id})`)
          })

          await db.teacher_groups.bulkAdd(teacherGroupsData)

          const verified = await db.teacher_groups.where('teacher_id').equals(newTeacherId).toArray()
          console.log('✅ تم التحقق - المجموعات المحفوظة:', verified.length, 'مجموعة')

          if (verified.length !== selectedGroupIds.length) {
            console.error('⚠️ تحذير: عدد المجموعات المحفوظة لا يطابق المتوقع!')
            console.error(`المتوقع: ${selectedGroupIds.length}, المحفوظ: ${verified.length}`)
          } else {
            console.log('✓ جميع المجموعات تم حفظها بنجاح')
          }
        } else {
          console.log('ℹ️ لم يتم اختيار أي مجموعات')
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('❌ خطأ في الحفظ:', error)
      const errorMessage = error?.message || 'حدث خطأ غير معروف'
      setAlertMessage(`حدث خطأ أثناء الحفظ:\n${errorMessage}`)
      setAlertType('error')
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {teacher ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المعلم <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: أ. محمد أحمد"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الجوال <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              maxLength={10}
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '')
                setPhone(numericValue)
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="05xxxxxxxx"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              المراحل الدراسية (اختياري)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {stages.map((stage) => {
                const isSelected = selectedStages.includes(stage)
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => toggleStage(stage)}
                    className={`p-3 rounded-lg border-2 transition-all text-sm font-semibold ${
                      isSelected
                        ? 'bg-green-50 border-green-500 text-green-900'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {stage}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedStages.length > 0 && (
            loadingGroups ? (
              <div className="text-center py-4 text-gray-500">جاري تحميل المجموعات...</div>
            ) : filteredGroups.length > 0 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  المجموعات التي يدرسها (اختياري)
                </label>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {selectedStages.map((stage) => {
                    const stageGroups = groups.filter(g => g.stage === stage)
                    return (
                      <div key={stage} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">{stage}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {stageGroups.map((group) => {
                            const isSelected = selectedGroupIds.includes(group.id)
                            return (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() => toggleGroup(group.id)}
                                className={`p-2 rounded-lg border-2 transition-all text-sm font-medium ${
                                  isSelected
                                    ? 'bg-blue-50 border-blue-500 text-blue-900'
                                    : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                                }`}
                              >
                                {group.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                لا توجد مجموعات للمراحل المختارة
              </div>
            )
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'جاري الحفظ...' : teacher ? 'حفظ التعديلات' : 'إضافة المعلم'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
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
