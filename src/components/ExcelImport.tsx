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

      // استخراج أسماء المجموعات الفريدة من الملف (تحويلها لنصوص)
      const uniqueGroupNames = [
        ...new Set(
          data
            .filter((row: any) => row['المجموعة'])
            .map((row: any) => String(row['المجموعة']).trim())
        ),
      ]

      // جلب المجموعات الموجودة حالياً
      const { data: existingGroups, error: fetchError } = await supabase
        .from('groups')
        .select('id, name')

      if (fetchError) throw fetchError

      const existingGroupsMap = new Map(
        (existingGroups || []).map((g) => [String(g.name).trim(), g.id])
      )

      // إنشاء المجموعات الجديدة فقط
      const newGroupNames = uniqueGroupNames.filter(
        (name) => !existingGroupsMap.has(name)
      )

      if (newGroupNames.length > 0) {
        const { data: newGroups, error: insertGroupError } = await supabase
          .from('groups')
          .insert(newGroupNames.map((name) => ({ name })))
          .select('id, name')

        if (insertGroupError) throw insertGroupError

        // إضافة المجموعات الجديدة للخريطة
        newGroups?.forEach((g) => {
          existingGroupsMap.set(g.name, g.id)
        })
      }

      const insertData = data
        .filter((row: any) => row['اسم الطالب'] && row['السجل المدني'])
        .map((row: any) => {
          const groupName = String(row['المجموعة']).trim()
          const groupId = existingGroupsMap.get(groupName)

          if (!groupId) {
            throw new Error(`فشل في إنشاء المجموعة "${groupName}"`)
          }

          return {
            name: String(row['اسم الطالب']).trim(),
            national_id: String(row['السجل المدني']).trim(),
            phone: row['جوال الطالب'] ? String(row['جوال الطالب']).trim() : '',
            guardian_phone: row['جوالي ولي الامر'] ? String(row['جوالي ولي الامر']).trim() : '',
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

      const groupsCreatedMessage =
        newGroupNames.length > 0
          ? ` وإنشاء ${newGroupNames.length} مجموعة جديدة`
          : ''
      setSuccess(
        `تم استيراد ${insertData.length} طالب بنجاح${groupsCreatedMessage}`
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
          اسم الطالب | السجل المدني | جوال الطالب | جوالي ولي الامر | الصف |
          المجموعة | الحالة
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
