import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { Upload, AlertCircle, Users, GraduationCap } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ExcelImportProps {
  groups?: Array<{ id: string; name: string }>
  onImportComplete: () => void
}

type ImportType = 'students' | 'teachers'

export function ExcelImport({ groups, onImportComplete }: ExcelImportProps) {
  const studentsFileInputRef = useRef<HTMLInputElement>(null)
  const teachersFileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

      // التحقق من وجود الأعمدة المطلوبة للطلاب
      const requiredColumns = ['اسم الطالب', 'السجل المدني', 'الصف', 'المجموعة']
      const firstRow = data[0] as any
      const missingColumns = requiredColumns.filter(col => !(col in firstRow))

      if (missingColumns.length > 0) {
        throw new Error(`الملف يفتقد الأعمدة التالية: ${missingColumns.join('، ')}\n\nالأعمدة المطلوبة:\n- اسم الطالب\n- السجل المدني\n- الصف\n- المجموعة\n- جوال الطالب (اختياري)\n- جوال ولي الامر (اختياري)\n- الحالة (اختياري)`)
      }

      // استخراج المجموعات الفريدة مع المراحل من الملف
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

      // جلب المجموعات الموجودة حالياً
      const { data: existingGroups, error: fetchError } = await supabase
        .from('groups')
        .select('id, name, stage')

      if (fetchError) throw fetchError

      const existingGroupsMap = new Map(
        (existingGroups || []).map((g) => [`${g.stage}|${g.name}`, g.id])
      )

      // إنشاء المجموعات الجديدة فقط
      const newGroups = uniqueGroups.filter(
        (group) => !existingGroupsMap.has(`${group.stage}|${group.name}`)
      )

      if (newGroups.length > 0) {
        for (const group of newGroups) {
          try {
            const newId = crypto.randomUUID()
            const newGroup = {
              id: newId,
              stage: group.stage,
              name: group.name,
              display_order: 0,
              created_at: new Date().toISOString()
            }

            const { error: insertGroupError } = await supabase
              .from('groups')
              .insert(newGroup)

            if (insertGroupError) {
              console.error('Error creating group:', insertGroupError)
              throw new Error(`فشل في إنشاء المجموعة "${group.name}" في "${group.stage}": ${insertGroupError.message}`)
            }

            existingGroupsMap.set(`${group.stage}|${group.name}`, newId)
            await db.groups.put(newGroup)
          } catch (err) {
            console.error('Error in group creation:', err)
            throw err
          }
        }
      }

      // جلب الطلاب الموجودين للتحقق من التحديث أو الإضافة
      const { data: existingStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, national_id')

      if (studentsError) throw studentsError

      const existingStudentsMap = new Map(
        (existingStudents || []).map((s) => [s.national_id, s.id])
      )

      const insertData: any[] = []
      const updateData: any[] = []
      const seenNationalIds = new Set<string>()
      const duplicatesInFile: string[] = []

      data
        .filter((row: any) => row['اسم الطالب'] && row['السجل المدني'])
        .forEach((row: any) => {
          const stage = String(row['الصف'] || '').trim()
          const groupName = String(row['المجموعة'] || '').trim()

          if (!stage || !groupName) {
            console.warn('تخطي طالب بدون صف أو مجموعة:', row)
            return
          }

          const groupKey = `${stage}|${groupName}`
          const groupId = existingGroupsMap.get(groupKey)

          if (!groupId) {
            console.error('المجموعة غير موجودة:', { stage, groupName, groupKey })
            console.error('المجموعات المتاحة:', Array.from(existingGroupsMap.keys()))
            throw new Error(`المجموعة "${groupName}" في "${stage}" غير موجودة`)
          }

          const nationalId = String(row['السجل المدني']).trim()

          // التحقق من التكرار في الملف نفسه
          if (seenNationalIds.has(nationalId)) {
            duplicatesInFile.push(`${String(row['اسم الطالب']).trim()} (${nationalId})`)
            return
          }
          seenNationalIds.add(nationalId)

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

      // إذا كان هناك تكرارات في الملف، اعرض تحذير
      if (duplicatesInFile.length > 0) {
        console.warn('طلاب مكررين في الملف:', duplicatesInFile)
        setError(`تنبيه: تم تخطي ${duplicatesInFile.length} طالب مكرر في الملف:\n${duplicatesInFile.slice(0, 5).join('\n')}${duplicatesInFile.length > 5 ? '\n...' : ''}`)
      }

      // إضافة الطلاب الجدد واحد بواحد
      let insertedCount = 0
      let skippedCount = 0

      for (const studentData of insertData) {
        try {
          const { data: insertedStudent, error: insertError } = await supabase
            .from('students')
            .insert(studentData)
            .select()
            .maybeSingle()

          if (insertError) {
            if (insertError.code === '23505' && insertError.message.includes('students_national_id_key')) {
              console.warn(`طالب موجود مسبقاً: ${studentData.name} (${studentData.national_id})`)
              skippedCount++
              continue
            }
            throw insertError
          }

          if (insertedStudent) {
            insertedCount++
            await db.students.put(insertedStudent)
          }
        } catch (err) {
          console.error('خطأ في إضافة الطالب:', studentData.name, err)
          skippedCount++
        }
      }

      // تحديث الطلاب الموجودين
      let updatedCount = 0
      for (const student of updateData) {
        const { id, ...updateFields } = student
        const { error: updateError } = await supabase
          .from('students')
          .update(updateFields)
          .eq('id', id)

        if (!updateError) {
          updatedCount++
          await db.students.update(id, updateFields)
        }
      }

      // رسالة النجاح
      const messages: string[] = []

      if (insertedCount > 0) {
        messages.push(`تم إضافة ${insertedCount} طالب جديد`)
      }

      if (updatedCount > 0) {
        messages.push(`تم تحديث ${updatedCount} طالب`)
      }

      if (skippedCount > 0) {
        messages.push(`تم تخطي ${skippedCount} طالب موجود مسبقاً`)
      }

      if (newGroups.length > 0) {
        messages.push(`تم إنشاء ${newGroups.length} مجموعة جديدة`)
      }

      setSuccess(
        messages.length > 0 ? messages.join(' • ') : 'تمت العملية بنجاح'
      )
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

      // التحقق من وجود الأعمدة المطلوبة للمعلمين
      const requiredColumns = ['اسم المعلم', 'رقم جوال المعلم']
      const firstRow = data[0] as any
      const missingColumns = requiredColumns.filter(col => !(col in firstRow))

      if (missingColumns.length > 0) {
        throw new Error(`الملف يفتقد الأعمدة التالية: ${missingColumns.join('، ')}\n\nالأعمدة المطلوبة:\n- اسم المعلم\n- رقم جوال المعلم\n- التخصص (اختياري)`)
      }

      // استيراد المعلمين
      const teachersData = data
        .filter((row: any) => row['اسم المعلم'] && row['رقم جوال المعلم'])
        .map((row: any) => ({
          name: String(row['اسم المعلم']).trim(),
          phone: String(row['رقم جوال المعلم']).trim(),
          specialization: row['التخصص'] ? String(row['التخصص']).trim() : '',
        }))

      // إزالة المعلمين المكررين في الملف
      const uniqueTeachersMap = new Map()
      teachersData.forEach((teacher: any) => {
        const key = teacher.phone
        if (!uniqueTeachersMap.has(key)) {
          uniqueTeachersMap.set(key, teacher)
        }
      })
      const uniqueTeachers = Array.from(uniqueTeachersMap.values())

      let addedCount = 0
      let updatedCount = 0
      let skippedCount = 0

      for (const teacher of uniqueTeachers) {
        const { data: existingTeacher } = await supabase
          .from('teachers')
          .select('*')
          .eq('phone', teacher.phone)
          .maybeSingle()

        if (!existingTeacher) {
          const { data: newTeacher, error: insertError } = await supabase
            .from('teachers')
            .insert(teacher)
            .select()
            .maybeSingle()

          if (!insertError && newTeacher) {
            await db.teachers.put(newTeacher)
            addedCount++
          } else {
            skippedCount++
          }
        } else {
          const { error: updateError } = await supabase
            .from('teachers')
            .update({ name: teacher.name, specialization: teacher.specialization })
            .eq('phone', teacher.phone)

          if (!updateError) {
            await db.teachers.update(existingTeacher.id, {
              name: teacher.name,
              specialization: teacher.specialization
            })
            updatedCount++
          }
        }
      }

      // رسالة النجاح
      const messages: string[] = []

      if (addedCount > 0) {
        messages.push(`تم إضافة ${addedCount} معلم جديد`)
      }

      if (updatedCount > 0) {
        messages.push(`تم تحديث ${updatedCount} معلم`)
      }

      if (skippedCount > 0) {
        messages.push(`تم تخطي ${skippedCount} معلم`)
      }

      setSuccess(
        messages.length > 0 ? messages.join(' • ') : 'تمت العملية بنجاح'
      )
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
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Upload size={24} className="text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">استيراد من Excel</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-start gap-2">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">خطأ:</p>
            <p className="text-sm whitespace-pre-line">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* قسم استيراد الطلاب */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-300">
        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
          <GraduationCap size={20} />
          استيراد بيانات الطلاب
        </h3>

        <div className="bg-white rounded-lg p-3 mb-3">
          <p className="text-sm font-bold text-emerald-700 mb-2">الأعمدة المطلوبة:</p>
          <div className="grid grid-cols-1 gap-1 text-xs text-gray-700">
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">1.</span>
              <span><strong>اسم الطالب</strong> - اسم الطالب الكامل</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">2.</span>
              <span><strong>السجل المدني</strong> - رقم الهوية الوطنية</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">3.</span>
              <span><strong>الصف</strong> - مثل: الصف الأول الثانوي</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">4.</span>
              <span><strong>المجموعة</strong> - اسم المجموعة مثل: مجموعة 1</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">5.</span>
              <span><strong>جوال الطالب</strong> - رقم جوال الطالب (اختياري)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">6.</span>
              <span><strong>جوال ولي الامر</strong> - رقم جوال ولي الأمر (اختياري)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">7.</span>
              <span><strong>الحالة</strong> - نشط أو استئذان (اختياري)</span>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg mb-3">
          <p className="text-sm font-bold text-yellow-900 mb-2">ملاحظات مهمة</p>
          <ul className="text-xs text-yellow-800 mr-4 space-y-1">
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
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <GraduationCap size={20} />
          {loading ? 'جاري الاستيراد...' : 'استيراد ملف الطلاب'}
        </button>
      </div>

      {/* قسم استيراد المعلمين */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-300">
        <h3 className="text-lg font-bold text-orange-900 mb-3 flex items-center gap-2">
          <Users size={20} />
          استيراد بيانات المعلمين
        </h3>

        <div className="bg-white rounded-lg p-3 mb-3">
          <p className="text-sm font-bold text-orange-700 mb-2">الأعمدة المطلوبة:</p>
          <div className="grid grid-cols-1 gap-1 text-xs text-gray-700">
            <div className="flex gap-2">
              <span className="font-semibold text-orange-600">1.</span>
              <span><strong>اسم المعلم</strong> - اسم المعلم الكامل</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-orange-600">2.</span>
              <span><strong>رقم جوال المعلم</strong> - رقم جوال المعلم</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-orange-600">3.</span>
              <span><strong>التخصص</strong> - مثل: رياضيات، علوم، لغة عربية (اختياري)</span>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg mb-3">
          <p className="text-sm font-bold text-yellow-900 mb-2">ملاحظات مهمة</p>
          <ul className="text-xs text-yellow-800 mr-4 space-y-1">
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
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Users size={20} />
          {loading ? 'جاري الاستيراد...' : 'استيراد ملف المعلمين'}
        </button>
      </div>
    </div>
  )
}
