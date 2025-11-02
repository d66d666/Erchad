import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import { Upload, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ExcelImportProps {
  groups?: Array<{ id: string; name: string }>
  onImportComplete: () => void
}

export function ExcelImport({ groups, onImportComplete }: ExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileSelect = async (
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
        // إنشاء المجموعات واحدة بواحدة لتفادي مشاكل RLS
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

            // إضافة للخريطة و IndexedDB
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
          const studentData = {
            name: String(row['اسم الطالب']).trim(),
            national_id: nationalId,
            phone: row['جوال الطالب'] ? String(row['جوال الطالب']).trim() : '',
            guardian_phone: (row['جوال ولي الامر'] || row['جوالي ولي الامر'] || row['جوال ولي الأمر'])
              ? String(row['جوال ولي الامر'] || row['جوالي ولي الامر'] || row['جوال ولي الأمر']).trim()
              : '',
            grade: stage,
            group_id: groupId,
            status: row['الحالة'] === 'استئذان' ? 'استئذان' : 'نشط',
            special_status_id: null,
          }

          // إذا كان الطالب موجود، نحدث بياناته، وإلا نضيفه
          const existingStudentId = existingStudentsMap.get(nationalId)
          if (existingStudentId) {
            updateData.push({ id: existingStudentId, ...studentData })
          } else {
            insertData.push(studentData)
          }
        })

      // إضافة الطلاب الجدد
      if (insertData.length > 0) {
        const { data: insertedStudents, error: insertError } = await supabase
          .from('students')
          .insert(insertData)
          .select()

        if (insertError) throw insertError

        // إضافة للـ IndexedDB المحلي
        if (insertedStudents) {
          for (const student of insertedStudents) {
            await db.students.put(student)
          }
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
          // تحديث في IndexedDB
          await db.students.update(id, updateFields)
        }
      }

      // استيراد المعلمين
      const teachersData = data
        .filter((row: any) => row['اسم المعلم'] && row['رقم جوال المعلم'])
        .map((row: any) => ({
          name: String(row['اسم المعلم']).trim(),
          phone: String(row['رقم جوال المعلم']).trim(),
          specialization: row['التخصص'] ? String(row['التخصص']).trim() : '',
        }))

      // إزالة المعلمين المكررين
      const uniqueTeachersMap = new Map()
      teachersData.forEach((teacher: any) => {
        const key = `${teacher.name}-${teacher.phone}`
        if (!uniqueTeachersMap.has(key)) {
          uniqueTeachersMap.set(key, teacher)
        }
      })
      const uniqueTeachers = Array.from(uniqueTeachersMap.values())

      if (uniqueTeachers.length > 0) {
        // استيراد المعلمين مع التحقق من عدم التكرار
        for (const teacher of uniqueTeachers) {
          const existingTeacher = await supabase
            .from('teachers')
            .select('*')
            .eq('phone', teacher.phone)
            .maybeSingle()

          if (!existingTeacher.data) {
            const { data: newTeacher } = await supabase.from('teachers').insert(teacher).select().single()
            if (newTeacher) {
              await db.teachers.put(newTeacher)
            }
          } else {
            // تحديث بيانات المعلم الموجود
            await supabase
              .from('teachers')
              .update({ name: teacher.name, specialization: teacher.specialization })
              .eq('phone', teacher.phone)
            await db.teachers.update(existingTeacher.data.id, { name: teacher.name, specialization: teacher.specialization })
          }
        }
      }

      const groupsCreatedCount = uniqueGroups.filter(
        (group) => !existingGroupsMap.has(`${group.stage}|${group.name}`)
      ).length
      const groupsCreatedMessage =
        groupsCreatedCount > 0
          ? ` وإنشاء ${groupsCreatedCount} مجموعة جديدة`
          : ''
      const teachersImportedMessage = uniqueTeachers.length > 0
        ? ` واستيراد ${uniqueTeachers.length} معلم`
        : ''
      const updatedMessage = updatedCount > 0
        ? ` وتحديث ${updatedCount} طالب`
        : ''
      const insertedMessage = insertData.length > 0
        ? `تم إضافة ${insertData.length} طالب جديد`
        : ''

      setSuccess(
        `${insertedMessage}${updatedMessage}${groupsCreatedMessage}${teachersImportedMessage}` || 'تمت العملية بنجاح'
      )
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onImportComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ ما')
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
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-300">
        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
          <Upload size={20} />
          تنسيق ملف Excel المطلوب
        </h3>

        <div className="bg-white rounded-lg p-3 mb-3">
          <p className="text-sm font-bold text-emerald-700 mb-2">📋 بيانات الطلاب (إلزامية):</p>
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
              <span><strong>جوال الطالب</strong> - رقم جوال الطالب (اختياري)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">4.</span>
              <span><strong>جوالي ولي الامر</strong> - رقم جوال ولي الأمر (اختياري)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">5.</span>
              <span><strong>الصف</strong> - مثل: الصف الأول الثانوي</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">6.</span>
              <span><strong>المجموعة</strong> - اسم المجموعة مثل: مجموعة 1</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold text-blue-600">7.</span>
              <span><strong>الحالة</strong> - نشط أو استئذان (اختياري)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3">
          <p className="text-sm font-bold text-orange-700 mb-2">👨‍🏫 بيانات المعلمين (اختيارية):</p>
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
              <span><strong>التخصص</strong> - مثل: رياضيات، علوم، لغة عربية</span>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <p className="text-sm font-bold text-yellow-900 mb-2">
            💡 ملاحظات مهمة
          </p>
          <ul className="text-xs text-yellow-800 mr-4 space-y-1.5">
            <li>• يمكن استيراد الطلاب فقط أو الطلاب والمعلمين معاً في نفس الملف</li>
            <li>• عمود "جوالي ولي الامر" يقبل أيضاً: "جوال ولي الامر" أو "جوال ولي الأمر"</li>
            <li>• المجموعات يتم إنشاؤها تلقائياً إذا لم تكن موجودة</li>
          </ul>
        </div>

        <div className="mt-3 p-3 bg-green-50 border-2 border-green-400 rounded-lg">
          <p className="text-sm font-bold text-green-900 mb-2">
            🔄 نقل الطلاب للمرحلة الدراسية الجديدة
          </p>
          <div className="text-xs text-green-800 space-y-2">
            <p className="font-semibold">يمكنك تحديث مجموعات الطلاب الموجودين عن طريق:</p>
            <ol className="mr-4 space-y-1">
              <li>1. تجهيز ملف Excel بنفس التنسيق أعلاه</li>
              <li>2. استخدام نفس <strong>السجل المدني</strong> للطالب</li>
              <li>3. تغيير الصف والمجموعة للمرحلة الجديدة</li>
              <li>4. عند رفع الملف، سيتم تحديث بيانات الطلاب تلقائياً</li>
            </ol>
            <div className="mt-2 p-2 bg-white rounded border border-green-300">
              <p className="font-semibold mb-1">مثال:</p>
              <p className="text-xs">• إذا كان الطالب في "الصف الأول الثانوي - مجموعة 1"</p>
              <p className="text-xs">• وتريد نقله إلى "الصف الثاني الثانوي - مجموعة 3"</p>
              <p className="text-xs">• فقط قم بتغيير الصف والمجموعة في ملف Excel مع الاحتفاظ بنفس السجل المدني</p>
              <p className="text-xs font-bold text-green-700 mt-1">✅ سيتم التحديث تلقائياً!</p>
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileSelect}
        disabled={loading}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
      >
        <Upload size={20} />
        {loading ? 'جاري الاستيراد...' : 'اختر ملف Excel'}
      </button>
    </div>
  )
}
