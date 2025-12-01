import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Student, Group, SpecialStatus } from '../types'
import { Heart, Printer, FileText, Send } from 'lucide-react'
import { SendToTeacherModal } from '../components/SendToTeacherModal'

export function SpecialStatusPage({
  students,
  groups,
  specialStatuses,
}: {
  students: Student[]
  groups: Group[]
  specialStatuses: SpecialStatus[]
}) {
  const [labPhone, setLabPhone] = useState('')
  const [showStatusDetails, setShowStatusDetails] = useState(false)
  const [showSendToTeacherModal, setShowSendToTeacherModal] = useState(false)

  useEffect(() => {
    fetchLabContact()
  }, [])

  const fetchLabContact = async () => {
    const { data } = await supabase
      .from('lab_contact')
      .select('*')
      .maybeSingle()

    if (data) {
      setLabPhone(data.phone || '')
    }
  }

  const studentsWithSpecialStatus = students.filter(
    (s) => s.special_status_id !== null
  )

  const groupedData = groups.map((group) => {
    const groupStudents = studentsWithSpecialStatus.filter(
      (s) => s.group_id === group.id
    )
    return {
      group,
      students: groupStudents,
      count: groupStudents.length,
    }
  })

  const handlePrintAll = async () => {
    const { data: teacherProfile } = await supabase
      .from('teacher_profile')
      .select('*')
      .maybeSingle()

    const teacherName = teacherProfile?.name || ''
    const now = new Date()
    const date = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const printContent = `
      <html dir="rtl">
        <head>
          <title>جميع الحالات الخاصة</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #f43f5e; margin-bottom: 10px; }
            .meta { text-align: center; color: #666; font-size: 12px; margin-bottom: 30px; }
            .group-section { margin-bottom: 40px; page-break-after: always; }
            .group-title { color: #1e293b; font-size: 20px; margin-bottom: 10px; font-weight: 700; }
            .group-info { margin-bottom: 15px; color: #64748b; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
            th { background-color: #f8fafc; color: #475569; font-size: 12px; font-weight: 600; }
            tr:nth-child(even) { background-color: #fafafa; }
            td { font-size: 13px; color: #334155; }
          </style>
        </head>
        <body>
          <h1>جميع الحالات الخاصة</h1>
          <div class="meta">طُبع بتاريخ: ${date} - الساعة: ${time}${teacherName ? ' - بواسطة: ' + teacherName : ''}</div>
          <p style="text-align: center; font-size: 18px; margin-bottom: 30px;">
            <strong>إجمالي الطلاب ذوي الحالات الخاصة: ${studentsWithSpecialStatus.length}</strong>
          </p>
          ${groupedData.filter(({ count }) => count > 0).map(({ group, students: groupStudents }) => `
            <div class="group-section">
              <h2 class="group-title">${group.name}</h2>
              <p class="group-info"><strong>عدد الطلاب:</strong> ${groupStudents.length}</p>
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>السجل المدني</th>
                    <th>جوال الطالب</th>
                    <th>جوال ولي الأمر</th>
                    <th>الحالة الخاصة</th>
                  </tr>
                </thead>
                <tbody>
                  ${groupStudents
                    .map(
                      (student) => {
                        const status = specialStatuses.find(
                          (s) => s.id === student.special_status_id
                        )
                        const statusText = showStatusDetails ? (status?.name || '-') : 'لديه حالة خاصة'
                        return `
                    <tr>
                      <td>${student.name}</td>
                      <td>${student.national_id}</td>
                      <td>${student.phone}</td>
                      <td>${student.guardian_phone}</td>
                      <td>${statusText}</td>
                    </tr>
                  `
                      }
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
          `).join('')}
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handlePrint = async (group: Group, groupStudents: Student[]) => {
    const { data: teacherProfile } = await supabase
      .from('teacher_profile')
      .select('*')
      .maybeSingle()

    const teacherName = teacherProfile?.name || ''
    const now = new Date()
    const date = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const printContent = `
      <html dir="rtl">
        <head>
          <title>الحالات الخاصة - ${group.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; color: #1e293b; font-size: 22px; font-weight: 700; }
            .meta { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
            th { background-color: #f8fafc; color: #475569; font-size: 12px; font-weight: 600; }
            tr:nth-child(even) { background-color: #fafafa; }
            td { font-size: 13px; color: #334155; }
          </style>
        </head>
        <body>
          <h1>الحالات الخاصة - ${group.name}</h1>
          <div class="meta">طُبع بتاريخ: ${date} - الساعة: ${time}${teacherName ? ' - بواسطة: ' + teacherName : ''}</div>
          <p><strong>عدد الطلاب:</strong> ${groupStudents.length}</p>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>السجل المدني</th>
                <th>جوال الطالب</th>
                <th>جوال ولي الأمر</th>
                <th>الحالة الخاصة</th>
              </tr>
            </thead>
            <tbody>
              ${groupStudents
                .map(
                  (student) => {
                    const status = specialStatuses.find(
                      (s) => s.id === student.special_status_id
                    )
                    return `
                <tr>
                  <td>${student.name}</td>
                  <td>${student.national_id}</td>
                  <td>${student.phone}</td>
                  <td>${student.guardian_phone}</td>
                  <td>${showStatusDetails ? (status?.name || '-') : 'لديه حالة خاصة'}</td>
                </tr>
              `
                  }
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }


  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 rounded-xl shadow-sm border border-rose-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <Heart size={20} className="text-rose-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">الحالات الخاصة</h1>
              <p className="text-sm text-rose-600 mt-0.5 font-medium">
                إجمالي الطلاب: {studentsWithSpecialStatus.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSendToTeacherModal(true)}
              disabled={studentsWithSpecialStatus.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              <span>إرسال للمعلم</span>
            </button>
            <button
              onClick={handlePrintAll}
              disabled={studentsWithSpecialStatus.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              <span>طباعة الكل</span>
            </button>
            <label className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={showStatusDetails}
                onChange={(e) => setShowStatusDetails(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer text-rose-500 focus:ring-rose-500"
              />
              <span className="text-gray-700 text-sm font-medium">إظهار تفاصيل الحالة</span>
            </label>
          </div>
        </div>
      </div>

      {groupedData.map(({ group, students: groupStudents, count }) => {
        if (count === 0) return null

        return (
          <div
            key={group.id}
            className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200"
          >
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-5 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{group.name}</h2>
                  <p className="text-sm text-gray-500">عدد الطلاب: {count}</p>
                </div>
                <button
                  onClick={() => handlePrint(group, groupStudents)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <Printer size={16} />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      الاسم
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      السجل المدني
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      جوال الطالب
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      جوال ولي الأمر
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      الحالة الخاصة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupStudents.map((student) => {
                    const status = specialStatuses.find(
                      (s) => s.id === student.special_status_id
                    )
                    return (
                      <tr key={student.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-800">
                          {student.name}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">
                          {student.national_id}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">
                          {student.phone}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">
                          {student.guardian_phone}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700">
                            {showStatusDetails ? (status?.name || '-') : 'لديه حالة خاصة'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {studentsWithSpecialStatus.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 text-base">لا يوجد طلاب بحالات خاصة</p>
        </div>
      )}

      <SendToTeacherModal
        isOpen={showSendToTeacherModal}
        onClose={() => setShowSendToTeacherModal(false)}
        specialStatusStudents={studentsWithSpecialStatus}
      />
    </div>
  )
}
