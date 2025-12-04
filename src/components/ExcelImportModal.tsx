import { useState, useRef } from 'react'
import { db } from '../lib/db'
import { Upload, AlertCircle, Users, GraduationCap, X } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  groups?: Array<{ id: string; name: string }>
  onImportComplete: () => void
}

export function ExcelImportModal({ isOpen, onClose, groups, onImportComplete }: ExcelImportModalProps) {
  const studentsFileInputRef = useRef<HTMLInputElement>(null)
  const teachersFileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const handleStudentsImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet)

      if (!data || data.length === 0) {
        throw new Error('الملف فارغ أو صيغته غير صحيحة')
      }

      const requiredColumns = ['اسم الطالب', 'السجل المدني', 'الصف', 'المجموعة']
      const firstRow = data[0] as any
      const missingColumns = requiredColumns.filter(col => !(col in firstRow))

      if (missingColumns.length > 0) {
        throw new Error(`الملف يفتقد الأعمدة التالية: ${missingColumns.join('، ')}`)
      }

      const uniqueGroups = [
        ...new Map(
          data
            .filter((row: any) => row['المجموعة'] && row['الصف'])
            .map((row: any) => {
              const stage = String(row['الصف'] || '').trim()
              const name = String(row['المجموعة'] || '').trim()
              return [`${stage}|${name}`, { stage, name }]
            })
            .filter(([key, group]: any) => group.stage && group.name)
        ).values(),
      ]

      const existingGroups = await db.groups.toArray()

      const existingGroupsMap = new Map(
        (existingGroups || []).map((g) => [`${g.stage}|${g.name}`, g.id])
      )

      const newGroups = uniqueGroups.filter(
        (group) => !existingGroupsMap.has(`${group.stage}|${group.name}`)
      )

      if (newGroups.length > 0) {
        for (const group of newGroups) {
          const newId = crypto.randomUUID()
          const newGroup = {
            id: newId,
            stage: group.stage,
            name: group.name,
            display_order: 0,
            created_at: new Date().toISOString()
          }

          await db.groups.add(newGroup)

          existingGroupsMap.set(`${group.stage}|${group.name}`, newId)
          await db.groups.put(newGroup)
        }
      }

      const existingStudents = await db.students.toArray()

      const existingStudentsMap = new Map(
        (existingStudents || []).map((s) => [s.national_id, s.id])
      )

      const insertData: any[] = []
      const updateData: any[] = []

      data
        .filter((row: any) => row['اسم الطالب'] && row['السجل المدني'])
        .forEach((row: any) => {
          const stage = String(row['الصف'] || '').trim()
          const groupName = String(row['المجموعة'] || '').trim()

          if (!stage || !groupName) return

          const groupKey = `${stage}|${groupName}`
          const groupId = existingGroupsMap.get(groupKey)

          if (!groupId) throw new Error(`المجموعة "${groupName}" في "${stage}" غير موجودة`)

          const nationalId = String(row['السجل المدني']).trim()

          const studentData = {
            name: String(row['اسم الطالب']).trim(),
            national_id: nationalId,
            phone: row['جوال الطالب'] ? String(row['جوال الطالب']).trim() : null,
            guardian_phone: (row['جوال ولي الامر'] || row['جوالي ولي الامر'] || row['جوال ولي الأمر'])
              ? String(row['جوال ولي الامر'] || row['جوالي ولي الامر'] || row['جوال ولي الأمر']).trim()
              : null,
            grade: stage,
            group_id: groupId,
            status: row['الحالة'] && String(row['الحالة']).trim() === 'استئذان' ? 'استئذان' : 'نشط',
            special_status_id: null,
          }

          const existingStudentId = existingStudentsMap.get(nationalId)
          if (existingStudentId) {
            updateData.push({ id: existingStudentId, ...studentData })
          } else {
            insertData.push(studentData)
          }
        })

      let insertedCount = 0
      let skippedCount = 0

      for (const studentData of insertData) {
        try {
          const newId = crypto.randomUUID()
          await db.students.add({
            id: newId,
            ...studentData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          insertedCount++
        } catch (err) {
          skippedCount++
        }
      }

      let updatedCount = 0
      for (const student of updateData) {
        const { id, ...updateFields } = student
        await db.students.update(id, {
          ...updateFields,
          updated_at: new Date().toISOString()
        })
        updatedCount++
      }

      const messages: string[] = []
      if (insertedCount > 0) messages.push(`تم إضافة ${insertedCount} طالب جديد`)
      if (updatedCount > 0) messages.push(`تم تحديث ${updatedCount} طالب`)
      if (skippedCount > 0) messages.push(`تم تخطي ${skippedCount} طالب موجود مسبقاً`)
      if (newGroups.length > 0) messages.push(`تم إنشاء ${newGroups.length} مجموعة جديدة`)

      setSuccess(messages.length > 0 ? messages.join(' • ') : 'تمت العملية بنجاح')
      if (studentsFileInputRef.current) {
        studentsFileInputRef.current.value = ''
      }
      onImportComplete()
    } catch (err) {
      console.error('خطأ في استيراد الطلاب:', err)
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ ما'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleTeachersImport = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const data = XLSX.utils.sheet_to_json(worksheet)

      if (!data || data.length === 0) {
        throw new Error('الملف فارغ أو صيغته غير صحيحة')
      }

      const requiredColumns = ['اسم المعلم', 'رقم جوال المعلم']
      const firstRow = data[0] as any
      const missingColumns = requiredColumns.filter(col => !(col in firstRow))

      if (missingColumns.length > 0) {
        throw new Error(`الملف يفتقد الأعمدة التالية: ${missingColumns.join('، ')}`)
      }

      const teachersData = data
        .filter((row: any) => row['اسم المعلم'] && row['رقم جوال المعلم'])
        .map((row: any) => ({
          name: String(row['اسم المعلم']).trim(),
          phone: String(row['رقم جوال المعلم']).trim(),
          specialization: row['التخصص'] ? String(row['التخصص']).trim() : '',
        }))

      const uniqueTeachersMap = new Map()
      teachersData.forEach((teacher: any) => {
        if (!uniqueTeachersMap.has(teacher.phone)) {
          uniqueTeachersMap.set(teacher.phone, teacher)
        }
      })
      const uniqueTeachers = Array.from(uniqueTeachersMap.values())

      let addedCount = 0
      let updatedCount = 0

      for (const teacher of uniqueTeachers) {
        const existingTeacher = await db.teachers
          .where('phone')
          .equals(teacher.phone)
          .first()

        if (!existingTeacher) {
          const newId = crypto.randomUUID()
          await db.teachers.add({
            id: newId,
            ...teacher,
            created_at: new Date().toISOString()
          })
          addedCount++
        } else {
          await db.teachers.update(existingTeacher.id, {
            name: teacher.name,
            specialization: teacher.specialization,
            updated_at: new Date().toISOString()
          })
          updatedCount++
        }
      }

      const messages: string[] = []
      if (addedCount > 0) messages.push(`تم إضافة ${addedCount} معلم جديد`)
      if (updatedCount > 0) messages.push(`تم تحديث ${updatedCount} معلم`)

      setSuccess(messages.length > 0 ? messages.join(' • ') : 'تمت العملية بنجاح')
      if (teachersFileInputRef.current) {
        teachersFileInputRef.current.value = ''
      }
      onImportComplete()
    } catch (err) {
      console.error('خطأ في استيراد المعلمين:', err)
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ ما'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-3 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload size={22} />
            <h2 className="text-lg font-bold">استيراد من Excel</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-300 text-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm mb-0.5">خطأ</p>
                <p className="text-xs whitespace-pre-line">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-3 p-3 bg-green-50 border border-green-300 text-green-800 rounded-lg text-sm font-bold">
              {success}
            </div>
          )}

          {/* قسم استيراد الطلاب */}
          <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-300">
            <h3 className="text-base font-bold text-blue-900 mb-3 flex items-center gap-2">
              <GraduationCap size={18} />
              استيراد بيانات الطلاب
            </h3>

            <div className="bg-white rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-blue-800 mb-2">الأعمدة المطلوبة:</p>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-gray-700">
                <div className="flex items-start gap-1.5 bg-blue-50 p-1.5 rounded">
                  <span className="font-bold text-blue-600 min-w-[20px]">1.</span>
                  <span><strong className="text-blue-900">اسم الطالب</strong> - اسم الطالب الكامل</span>
                </div>
                <div className="flex items-start gap-1.5 bg-blue-50 p-1.5 rounded">
                  <span className="font-bold text-blue-600 min-w-[20px]">2.</span>
                  <span><strong className="text-blue-900">السجل المدني</strong> - رقم الهوية الوطنية</span>
                </div>
                <div className="flex items-start gap-1.5 bg-blue-50 p-1.5 rounded">
                  <span className="font-bold text-blue-600 min-w-[20px]">3.</span>
                  <span><strong className="text-blue-900">الصف</strong> - مثل: الاول الثانوي</span>
                </div>
                <div className="flex items-start gap-1.5 bg-blue-50 p-1.5 rounded">
                  <span className="font-bold text-blue-600 min-w-[20px]">4.</span>
                  <span><strong className="text-blue-900">المجموعة</strong> - اسم المجموعة مثل: مجموعة 1</span>
                </div>
                <div className="flex items-start gap-1.5 bg-blue-50 p-1.5 rounded">
                  <span className="font-bold text-blue-600 min-w-[20px]">5.</span>
                  <span><strong className="text-blue-900">جوال الطالب</strong> - رقم جوال الطالب (اختياري)</span>
                </div>
                <div className="flex items-start gap-1.5 bg-blue-50 p-1.5 rounded">
                  <span className="font-bold text-blue-600 min-w-[20px]">6.</span>
                  <span><strong className="text-blue-900">جوال ولي الامر</strong> - رقم جوال ولي الأمر (اختياري)</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg mb-3">
              <p className="text-xs font-bold text-yellow-900 mb-1.5">ملاحظات مهمة</p>
              <ul className="text-xs text-yellow-800 mr-4 space-y-0.5">
                <li>• المجموعات يتم إنشاؤها تلقائياً إذا لم تكن موجودة</li>
                <li>• إذا كان السجل المدني موجود، يتم تحديث بيانات الطالب</li>
                <li>• عمود "جوال ولي الامر" يقبل أيضاً: "جوالي ولي الامر" أو "جوال ولي الأمر"</li>
              </ul>
            </div>

            <input
              ref={studentsFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleStudentsImport}
              disabled={loading}
              className="hidden"
            />

            <button
              onClick={() => studentsFileInputRef.current?.click()}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
            >
              <GraduationCap size={18} />
              {loading ? 'جاري الاستيراد...' : 'استيراد ملف الطلاب'}
            </button>
          </div>

          {/* قسم استيراد المعلمين */}
          <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-300">
            <h3 className="text-base font-bold text-orange-900 mb-3 flex items-center gap-2">
              <Users size={18} />
              استيراد بيانات المعلمين
            </h3>

            <div className="bg-white rounded-lg p-3 mb-3">
              <p className="text-xs font-bold text-orange-800 mb-2">الأعمدة المطلوبة:</p>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-gray-700">
                <div className="flex items-start gap-1.5 bg-orange-50 p-1.5 rounded">
                  <span className="font-bold text-orange-600 min-w-[20px]">1.</span>
                  <span><strong className="text-orange-900">اسم المعلم</strong> - اسم المعلم الكامل</span>
                </div>
                <div className="flex items-start gap-1.5 bg-orange-50 p-1.5 rounded">
                  <span className="font-bold text-orange-600 min-w-[20px]">2.</span>
                  <span><strong className="text-orange-900">رقم جوال المعلم</strong> - رقم جوال المعلم</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg mb-3">
              <p className="text-xs font-bold text-yellow-900 mb-1.5">ملاحظات مهمة</p>
              <ul className="text-xs text-yellow-800 mr-4 space-y-0.5">
                <li>• إذا كان رقم الجوال موجود، يتم تحديث بيانات المعلم</li>
                <li>• يتم تخطي المعلمين المكررين في الملف</li>
              </ul>
            </div>

            <input
              ref={teachersFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleTeachersImport}
              disabled={loading}
              className="hidden"
            />

            <button
              onClick={() => teachersFileInputRef.current?.click()}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all text-sm"
            >
              <Users size={18} />
              {loading ? 'جاري الاستيراد...' : 'استيراد ملف المعلمين'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
