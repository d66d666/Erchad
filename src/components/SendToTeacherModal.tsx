import { useState, useEffect } from 'react'
import { X, Send, RefreshCw } from 'lucide-react'
import { Teacher, Group, Student, SpecialStatus } from '../types'
import { formatPhoneForWhatsApp } from '../lib/formatPhone'
import { openWhatsApp } from '../lib/openWhatsApp'
import { db } from '../lib/db'
import { CustomAlert } from './CustomAlert'

interface SendToTeacherModalProps {
  isOpen: boolean
  onClose: () => void
  allStudents: Student[]
}

export function SendToTeacherModal({
  isOpen,
  onClose,
  allStudents,
}: SendToTeacherModalProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [stages, setStages] = useState<string[]>([])
  const [teacherGroups, setTeacherGroups] = useState<any[]>([])
  const [specialStatuses, setSpecialStatuses] = useState<SpecialStatus[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedStage, setSelectedStage] = useState('')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [selectedStatusId, setSelectedStatusId] = useState('all')
  const [loading, setLoading] = useState(false)
  const [systemAdminName, setSystemAdminName] = useState('')
  const [dataLoading, setDataLoading] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('success')

  useEffect(() => {
    if (isOpen) {
      loadAllData()
    }
  }, [isOpen])

  const loadAllData = async () => {
    setDataLoading(true)
    try {
      await Promise.all([
        fetchTeachers(),
        fetchGroups(),
        fetchSpecialStatuses(),
        fetchTeacherGroups(),
        fetchSystemAdminName()
      ])
    } finally {
      setDataLoading(false)
    }
  }

  const fetchTeachers = async () => {
    const data = await db.teachers.orderBy('name').toArray()
    setTeachers(data)
  }

  const fetchGroups = async () => {
    const data = await db.groups.orderBy('display_order').toArray()
    setAllGroups(data)
  }

  const fetchSpecialStatuses = async () => {
    const data = await db.special_statuses.orderBy('name').toArray()
    setSpecialStatuses(data)
  }

  const fetchTeacherGroups = async () => {
    const data = await db.teacher_groups.toArray()
    console.log('🔍 جلب روابط المعلمين والمجموعات:', data)
    console.log('📊 إجمالي الروابط:', data.length)
    setTeacherGroups(data)
    return data
  }

  const fetchSystemAdminName = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    const data = await db.teacher_profile.where('id').equals(userId).first()
    if (data?.name) setSystemAdminName(data.name)
  }

  useEffect(() => {
    if (selectedTeacherId && !dataLoading) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔍 تحليل مراحل المعلم:')
      console.log('- ID المعلم:', selectedTeacherId)
      console.log('- إجمالي المجموعات المتاحة:', allGroups.length)
      console.log('- إجمالي روابط المعلمين:', teacherGroups.length)

      // طباعة جميع الروابط
      console.log('- كل الروابط في قاعدة البيانات:')
      teacherGroups.forEach(tg => {
        console.log(`  * معلم ${tg.teacher_id} -> مجموعة ${tg.group_id}`)
      })

      const teacherGroupIds = teacherGroups
        .filter(tg => {
          const matches = tg.teacher_id === selectedTeacherId
          console.log(`  - فحص رابط: teacher_id=${tg.teacher_id}, يطابق=${matches}`)
          return matches
        })
        .map(tg => tg.group_id)

      console.log('✅ معرفات مجموعات هذا المعلم:', teacherGroupIds)
      console.log('📝 عدد المجموعات:', teacherGroupIds.length)

      const teacherAssignedGroups = allGroups.filter(g => {
        const included = teacherGroupIds.includes(g.id)
        if (included) {
          console.log(`  ✓ مجموعة مطابقة: ${g.name} (${g.stage})`)
        }
        return included
      })
      console.log('📚 المجموعات المسندة:', teacherAssignedGroups.length, 'مجموعة')

      const teacherStages = [...new Set(teacherAssignedGroups.map(g => g.stage))]
      console.log('🎓 المراحل المستخرجة:', teacherStages)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      setStages(teacherStages)
      setSelectedStage('')
      setGroups([])
      setSelectedGroupIds([])
    } else if (selectedTeacherId) {
      console.log('⚠️ لم يتم تحميل البيانات بعد')
    }
  }, [selectedTeacherId, allGroups, teacherGroups, dataLoading])

  useEffect(() => {
    if (selectedStage && selectedTeacherId) {
      const teacherGroupIds = teacherGroups
        .filter(tg => tg.teacher_id === selectedTeacherId)
        .map(tg => tg.group_id)

      const stageGroups = allGroups.filter(g =>
        g.stage === selectedStage && teacherGroupIds.includes(g.id)
      )
      setGroups(stageGroups)
      setSelectedGroupIds([])
    } else {
      setGroups([])
      setSelectedGroupIds([])
    }
  }, [selectedStage, selectedTeacherId, allGroups, teacherGroups])

  const toggleGroup = (groupId: string) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter(id => id !== groupId))
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId])
    }
  }

  const handleSend = async () => {
    if (!selectedTeacherId) {
      setAlertMessage('الرجاء اختيار المعلم')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    if (!selectedStage) {
      setAlertMessage('الرجاء اختيار المرحلة')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    if (selectedGroupIds.length === 0) {
      setAlertMessage('الرجاء اختيار مجموعة واحدة على الأقل')
      setAlertType('error')
      setShowAlert(true)
      return
    }

    setLoading(true)

    try {
      const teacher = teachers.find(t => t.id === selectedTeacherId)
      if (!teacher) return

      // فلتر الطلاب حسب الفئة والمجموعات
      let filteredStudents = allStudents.filter(
        student => selectedGroupIds.includes(student.group_id)
      )

      // تطبيق فلتر الفئة
      if (selectedStatusId !== 'all') {
        filteredStudents = filteredStudents.filter(
          student => student.special_status_id === selectedStatusId
        )
      } else {
        // إذا كانت "جميع الفئات"، عرض فقط الطلاب ذوي الحالات الخاصة
        filteredStudents = filteredStudents.filter(
          student => student.special_status_id !== null
        )
      }

      if (filteredStudents.length === 0) {
        setAlertMessage('لا يوجد طلاب في الفئة والمجموعات المختارة')
        setAlertType('error')
        setShowAlert(true)
        setLoading(false)
        return
      }

      // إنشاء رسالة واتساب مرتبة حسب الصف والحالة الخاصة والمجموعة
      let message = `السلام عليكم ورحمة الله وبركاته\n\n*${selectedStage}*\n\n`

      // تجميع الطلاب حسب الحالة الخاصة
      const statusGroups = new Map<string, Student[]>()

      filteredStudents.forEach(student => {
        const status = specialStatuses.find(s => s.id === student.special_status_id)
        const statusName = status?.name || 'بدون حالة خاصة'
        if (!statusGroups.has(statusName)) {
          statusGroups.set(statusName, [])
        }
        statusGroups.get(statusName)!.push(student)
      })

      // ترتيب الحالات أبجدياً
      const sortedStatuses = Array.from(statusGroups.keys()).sort()

      // طباعة كل حالة مع مجموعاتها
      sortedStatuses.forEach(statusName => {
        const statusStudents = statusGroups.get(statusName)!

        message += `*${statusName}*\n`

        // تجميع حسب المجموعة
        const groupMap = new Map<string, Student[]>()
        statusStudents.forEach(student => {
          const groupName = allGroups.find(g => g.id === student.group_id)?.name || 'غير محدد'
          if (!groupMap.has(groupName)) {
            groupMap.set(groupName, [])
          }
          groupMap.get(groupName)!.push(student)
        })

        // طباعة كل مجموعة
        Array.from(groupMap.keys()).sort().forEach(groupName => {
          const groupStudents = groupMap.get(groupName)!
          message += `  *${groupName}*\n`
          message += `عدد الطلاب: ${groupStudents.length}\n`
          groupStudents.forEach((student, index) => {
            message += `${index + 1}. *${student.name}*\n`
          })
          message += `\n`
        })
      })

      // إضافة التوقيع في نهاية الرسالة
      message += `\n${systemAdminName || 'مسؤول النظام'}`

      // فتح واتساب
      const phoneNumber = formatPhoneForWhatsApp(teacher.phone)
      openWhatsApp(phoneNumber, message)

      onClose()
    } catch (error) {
      console.error('Error sending to teacher:', error)
      setAlertMessage('حدث خطأ أثناء الإرسال')
      setAlertType('error')
      setShowAlert(true)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // حساب الطلاب المفلترين حسب الفئة المحددة
  const relevantStudents = selectedStatusId === 'all'
    ? allStudents.filter(s => s.special_status_id !== null)
    : allStudents.filter(s => s.special_status_id === selectedStatusId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send className="text-green-600" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">إرسال للمعلم</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={dataLoading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              title="إعادة تحميل البيانات"
            >
              <RefreshCw size={16} className={dataLoading ? 'animate-spin' : ''} />
              <span>تحديث</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              سيتم إرسال بيانات الطلاب ذوي الحالات الخاصة في المجموعة المحددة إلى المعلم عبر واتساب
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر الفئة <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedStatusId}
              onChange={(e) => setSelectedStatusId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-purple-300 bg-purple-50 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-semibold text-purple-900"
            >
              <option value="all">جميع الفئات</option>
              {specialStatuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المعلم <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              disabled={dataLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{dataLoading ? 'جاري التحميل...' : '-- اختر المعلم --'}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} - {teacher.specialization || 'غير محدد'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المرحلة <span className="text-red-500">*</span>
            </label>
            {!selectedTeacherId ? (
              <div className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-center">
                <p className="text-sm text-gray-500">اختر المعلم أولاً</p>
              </div>
            ) : dataLoading ? (
              <div className="bg-blue-50 border border-blue-300 rounded-lg px-4 py-3 text-center">
                <p className="text-sm text-blue-700">جاري تحميل البيانات...</p>
              </div>
            ) : stages.length === 0 ? (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <p className="text-sm text-yellow-900 font-bold mb-2">لا توجد مجموعات مسندة لهذا المعلم</p>
                    <div className="text-xs text-yellow-800 space-y-2">
                      <p>لحل هذه المشكلة:</p>
                      <ol className="list-decimal list-inside space-y-1 mr-2">
                        <li>اذهب إلى صفحة "المعلمين"</li>
                        <li>اضغط على "تعديل" بجانب اسم المعلم</li>
                        <li>اختر المراحل والمجموعات التي يدرسها</li>
                        <li>احفظ التعديلات</li>
                        <li>ارجع هنا واضغط زر "تحديث" أعلاه</li>
                      </ol>
                      <div className="mt-3 pt-2 border-t border-yellow-300">
                        <p className="font-semibold">💡 نصيحة:</p>
                        <p>تأكد من حفظ التعديلات في صفحة المعلمين قبل الرجوع</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">-- اختر المرحلة --</option>
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختر المجموعة <span className="text-red-500">*</span>
            </label>
            {!selectedTeacherId ? (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">اختر المعلم أولاً</p>
              </div>
            ) : !selectedStage ? (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">اختر المرحلة أولاً</p>
              </div>
            ) : groups.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-700">لا توجد مجموعات مسندة لهذا المعلم في هذه المرحلة</p>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {groups.map((group) => {
                  const isSelected = selectedGroupIds.includes(group.id)

                  // حساب عدد الطلاب حسب الفئة المختارة
                  const studentsCount = relevantStudents.filter(
                    s => s.group_id === group.id
                  ).length

                  return (
                    <label
                      key={group.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-green-50 border-green-500'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleGroup(group.id)}
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <span className={`font-medium ${
                          isSelected ? 'text-green-900' : 'text-gray-900'
                        }`}>
                          {group.name}
                        </span>
                        {studentsCount > 0 && (
                          <span className="text-xs text-gray-500 mr-2">
                            ({studentsCount} طالب)
                          </span>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
            {selectedGroupIds.length > 0 && (
              <p className="text-xs text-green-600 mt-2">
                تم اختيار {selectedGroupIds.length} مجموعة
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSend}
              disabled={loading || !selectedTeacherId || !selectedStage || selectedGroupIds.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Send size={20} />
              {loading ? 'جاري الإرسال...' : 'إرسال عبر واتساب'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
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
