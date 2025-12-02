import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Student, Group, SpecialStatus } from '../types'
import { Star, Printer, FileText, Send, Filter } from 'lucide-react'
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
  const [selectedStatusId, setSelectedStatusId] = useState<string>('all')

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
    (s) => s.special_status_id !== null &&
    (selectedStatusId === 'all' || s.special_status_id === selectedStatusId)
  )

  const groupedByStage = groups.reduce((acc, group) => {
    const stage = group.stage || 'غير محدد'
    if (!acc[stage]) {
      acc[stage] = []
    }

    const groupStudents = studentsWithSpecialStatus.filter(
      (s) => s.group_id === group.id
    )

    if (groupStudents.length > 0) {
      acc[stage].push({
        group,
        students: groupStudents,
        count: groupStudents.length,
      })
    }

    return acc
  }, {} as Record<string, Array<{ group: Group; students: Student[]; count: number }>>)

  const stages = Object.keys(groupedByStage).sort()

  const handlePrintAll = async () => {
    const { data: teacherProfile } = await supabase
      .from('teacher_profile')
      .select('*')
      .maybeSingle()

    const teacherName = teacherProfile?.name || ''
    const schoolName = teacherProfile?.school_name || ''
    const systemDescription = teacherProfile?.system_description || ''
    const now = new Date()
    const date = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const selectedStatus = specialStatuses.find(s => s.id === selectedStatusId)
    const titleText = selectedStatusId === 'all'
      ? 'فئات الطلاب'
      : selectedStatus?.name || 'فئة محددة'

    const printContent = `
      <html dir="rtl">
        <head>
          <title>${titleText}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header-line { font-size: 14px; color: #374151; margin: 3px 0; }
            h1 { text-align: center; color: #7c3aed; margin-bottom: 10px; }
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
          <div class="header">
            <div class="header-line" style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${schoolName || 'اسم المدرسة'}</div>
            <div class="header-line">${systemDescription || 'برنامج إدارة الطلاب'}</div>
            <div class="header-line">الأستاذ: ${teacherName || 'اسم المعلم'}</div>
          </div>
          <h1>${titleText}</h1>
          <div class="meta">طُبع بتاريخ: ${date} - الساعة: ${time}</div>
          <p style="text-align: center; font-size: 18px; margin-bottom: 30px;">
            <strong>إجمالي الطلاب: ${studentsWithSpecialStatus.length}</strong>
          </p>
          ${stages.filter(stage => groupedByStage[stage].length > 0).map(stage => `
            <div style="margin-bottom: 50px;">
              <h2 style="color: #7c3aed; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">${stage}</h2>
              ${groupedByStage[stage].filter(({ students }) => students.length > 0).map(({ group, students: groupStudents }) => `
                <div class="group-section">
                  <h3 class="group-title">${group.name}</h3>
                  <p class="group-info"><strong>عدد الطلاب:</strong> ${groupStudents.length}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>السجل المدني</th>
                        <th>جوال الطالب</th>
                        <th>جوال ولي الأمر</th>
                        <th>الفئة</th>
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
    const schoolName = teacherProfile?.school_name || ''
    const systemDescription = teacherProfile?.system_description || ''
    const now = new Date()
    const date = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    const printContent = `
      <html dir="rtl">
        <head>
          <title>الحالات الخاصة - ${group.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .header-line { font-size: 14px; color: #374151; margin: 3px 0; }
            .stage {
              color: #16a34a;
              font-size: 20px;
              font-weight: bold;
              text-align: center;
              margin: 15px 0;
              padding: 10px;
              background-color: #f0fdf4;
              border: 2px solid #16a34a;
              border-radius: 8px;
            }
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
          <div class="header">
            <div class="header-line" style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${schoolName || 'اسم المدرسة'}</div>
            <div class="header-line">${systemDescription || 'برنامج إدارة الطلاب'}</div>
            <div class="header-line">الأستاذ: ${teacherName || 'اسم المعلم'}</div>
          </div>
          <div class="stage">${group.stage}</div>
          <h1>فئات الطلاب - ${group.name}</h1>
          <div class="meta">طُبع بتاريخ: ${date} - الساعة: ${time}</div>
          <p><strong>عدد الطلاب:</strong> ${groupStudents.length}</p>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>السجل المدني</th>
                <th>جوال الطالب</th>
                <th>جوال ولي الأمر</th>
                <th>الفئة</th>
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
      <div className="bg-gradient-to-br from-purple-100 via-violet-100 to-fuchsia-100 rounded-xl shadow-md border border-purple-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-purple-200">
              <Star size={20} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">فئات الطلاب</h1>
              <p className="text-sm text-purple-700 mt-0.5 font-medium">
                إجمالي الطلاب: {studentsWithSpecialStatus.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSendToTeacherModal(true)}
              disabled={studentsWithSpecialStatus.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
              <span>إرسال للمعلم</span>
            </button>
            <button
              onClick={handlePrintAll}
              disabled={studentsWithSpecialStatus.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={16} />
              <span>طباعة الكل</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Filter size={18} className="text-purple-600" />
          <span className="text-sm font-medium text-gray-700">فلترة حسب الفئة:</span>
          <select
            value={selectedStatusId}
            onChange={(e) => setSelectedStatusId(e.target.value)}
            className="px-4 py-2 border border-purple-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-purple-50 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">جميع الفئات</option>
            {specialStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 bg-white border border-purple-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-purple-50 transition-all shadow-sm">
            <input
              type="checkbox"
              checked={showStatusDetails}
              onChange={(e) => setShowStatusDetails(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer text-purple-500 focus:ring-purple-500"
            />
            <span className="text-gray-700 text-sm font-medium">إظهار تفاصيل الحالة</span>
          </label>
        </div>
      </div>

      {stages.filter(stage => groupedByStage[stage].length > 0).map((stage) => (
        <div key={stage} className="space-y-4">
          <div className="bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl shadow-lg px-6 py-4">
            <h2 className="text-xl font-bold text-white">{stage}</h2>
            <p className="text-purple-100 text-sm font-medium mt-1">
              عدد الطلاب: {groupedByStage[stage].reduce((sum, { count }) => sum + count, 0)}
            </p>
          </div>

          {groupedByStage[stage].map(({ group, students: groupStudents, count }) => (
            <div
              key={group.id}
              className="bg-white rounded-xl shadow-md overflow-hidden border border-purple-100 mr-6"
            >
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-5 py-3.5 border-b border-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{group.name}</h3>
                    <p className="text-sm text-purple-600 font-medium">عدد الطلاب: {count}</p>
                  </div>
                  <button
                    onClick={() => handlePrint(group, groupStudents)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-50 transition-all shadow-sm"
                  >
                    <Printer size={16} />
                    <span>طباعة</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-200">
                        الاسم
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-200">
                        السجل المدني
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-200">
                        جوال الطالب
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-200">
                        جوال ولي الأمر
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-200">
                        الفئة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {groupStudents.map((student) => {
                      const status = specialStatuses.find(
                        (s) => s.id === student.special_status_id
                      )
                      return (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
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
                            <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-md bg-purple-100 text-purple-700">
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
          ))}
        </div>
      ))}

      {studentsWithSpecialStatus.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
          <FileText className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 text-base">
            {selectedStatusId === 'all'
              ? 'لا يوجد طلاب في فئات مميزة'
              : 'لا يوجد طلاب في هذه الفئة'}
          </p>
        </div>
      )}

      <SendToTeacherModal
        isOpen={showSendToTeacherModal}
        onClose={() => setShowSendToTeacherModal(false)}
        allStudents={students}
      />
    </div>
  )
}
