import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
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
            .filter((row: any) => row['المجموعة'] && row['المرحلة'])
            .map((row: any) => {
              const stage = String(row['المرحلة']).trim()
              const name = String(row['المجموعة']).trim()
              return [`${stage}|${name}`, { stage, name }]
            })
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
        const { data: insertedGroups, error: insertGroupError } = await supabase
          .from('groups')
          .insert(newGroups.map((g) => ({ stage: g.stage, name: g.name })))
          .select('id, name, stage')

        if (insertGroupError) throw insertGroupError

        // إضافة المجموعات الجديدة للخريطة
        insertedGroups?.forEach((g) => {
          existingGroupsMap.set(`${g.stage}|${g.name}`, g.id)
        })
      }

      const insertData = data
        .filter((row: any) => row['اسم الطالب'] && row['السجل المدني'])
        .map((row: any) => {
          const stage = String(row['المرحلة']).trim()
          const groupName = String(row['المجموعة']).trim()
          const groupKey = `${stage}|${groupName}`
          const groupId = existingGroupsMap.get(groupKey)

          if (!groupId) {
            throw new Error(`فشل في إنشاء المجموعة "${groupName}" في "${stage}"`)
          }

          return {
            name: String(row['اسم الطالب']).trim(),
            national_id: String(row['السجل المدني']).trim(),
            phone: row['جوال الطالب'] ? String(row['جوال الطالب']).trim() : '',
            guardian_phone: (row['جوال ولي الامر'] || row['جوالي ولي الامر'] || row['جوال ولي الأمر'])
              ? String(row['جوال ولي الامر'] || row['جوالي ولي الامر'] || row['جوال ولي الأمر']).trim()
              : '',
            grade: row['الصف'] ? String(row['الصف']).trim() : '',
            group_id: groupId,
            status: row['الحالة'] === 'استئذان' ? 'استئذان' : 'نشط',
            special_status_id: null,
          }
        })

      const { error: insertError } = await supabase
        .from('students')
        .insert(insertData)

      if (insertError) throw insertError

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
        const { error: teacherError } = await supabase
          .from('teachers')
          .upsert(uniqueTeachers, { onConflict: 'phone', ignoreDuplicates: false })

        if (teacherError) console.error('Teacher import error:', teacherError)
      }

      const groupsCreatedMessage =
        newGroups.length > 0
          ? ` وإنشاء ${newGroups.length} مجموعة جديدة`
          : ''
      const teachersImportedMessage = uniqueTeachers.length > 0
        ? ` واستيراد ${uniqueTeachers.length} معلم`
        : ''
      setSuccess(
        `تم استيراد ${insertData.length} طالب بنجاح${groupsCreatedMessage}${teachersImportedMessage}`
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

      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>تنسيق الملف المطلوب:</strong>
          <br />
          اسم الطالب | السجل المدني | جوال الطالب | جوال ولي الامر | الصف |
          المجموعة | الحالة | اسم المعلم | رقم جوال المعلم | التخصص
        </p>
        <p className="text-xs text-blue-600 mt-2">
          ملاحظة: يمكن كتابة "جوال ولي الامر" أو "جوالي ولي الامر" أو "جوال ولي الأمر"<br />
          بيانات المعلم اختيارية - يمكن استيراد الطلاب فقط
        </p>
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
