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
            h1 { text-align: center; color: #9333ea; margin-bottom: 10px; }
            .meta { text-align: center; color: #666; font-size: 12px; margin-bottom: 30px; }
            .group-section { margin-bottom: 40px; page-break-after: always; }
            .group-title { color: #9333ea; font-size: 24px; margin-bottom: 10px; }
            .group-info { margin-bottom: 15px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #9333ea; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
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
            h1 { text-align: center; color: #9333ea; }
            .meta { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
            th { background-color: #9333ea; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
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
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-500 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <Heart size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">الحالات الخاصة</h1>
              <p className="text-purple-100 text-lg mt-1">
                إجمالي الطلاب ذوي الحالات الخاصة: {studentsWithSpecialStatus.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSendToTeacherModal(true)}
              disabled={studentsWithSpecialStatus.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
              <span>إرسال للمعلم</span>
            </button>
            <button
              onClick={handlePrintAll}
              disabled={studentsWithSpecialStatus.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={20} />
              <span>طباعة الكل</span>
            </button>
            <label className="flex items-center gap-3 bg-white bg-opacity-20 px-4 py-3 rounded-xl cursor-pointer hover:bg-opacity-30 transition-all">
              <input
                type="checkbox"
                checked={showStatusDetails}
                onChange={(e) => setShowStatusDetails(e.target.checked)}
                className="w-5 h-5 rounded cursor-pointer"
              />
              <span className="text-white font-semibold">إظهار تفاصيل الحالة</span>
            </label>
          </div>
        </div>
      </div>

      {groupedData.map(({ group, students: groupStudents, count }) => {
        if (count === 0) return null

        return (
          <div
            key={group.id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200"
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-500 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{group.name}</h2>
                  <p className="text-purple-100">عدد الطلاب: {count}</p>
                </div>
                <button
                  onClick={() => handlePrint(group, groupStudents)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all hover:shadow-md"
                >
                  <Printer size={20} />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      الاسم
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      السجل المدني
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      جوال الطالب
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      جوال ولي الأمر
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      الحالة الخاصة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupStudents.map((student) => {
                    const status = specialStatuses.find(
                      (s) => s.id === student.special_status_id
                    )
                    return (
                      <tr key={student.id} className="hover:bg-purple-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.national_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.phone}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {student.guardian_phone}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
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
        <div className="bg-white rounded-2xl shadow-lg p-16 text-center border border-gray-200">
          <FileText className="mx-auto text-gray-300 mb-4" size={64} />
          <p className="text-gray-500 text-xl">لا يوجد طلاب بحالات خاصة</p>
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
