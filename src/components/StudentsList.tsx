import { useState, useEffect } from 'react'
import { Student, SpecialStatus, SchoolInfo } from '../types'
import { supabase } from '../lib/supabase'
import { Trash2, Edit2, MoreVertical, Printer, DoorOpen } from 'lucide-react'
import { AllowClassEntryModal } from './AllowClassEntryModal'

interface StudentsListProps {
  students: Student[]
  groupName: string
  specialStatuses: SpecialStatus[]
  onStudentDeleted: () => void
  onEditStudent: (student: Student) => void
}

export function StudentsList({
  students,
  groupName,
  specialStatuses,
  onStudentDeleted,
  onEditStudent,
}: StudentsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null)
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null)
  const [showAllowEntryModal, setShowAllowEntryModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    fetchSchoolInfo()
  }, [])

  const fetchSchoolInfo = async () => {
    const { data } = await supabase
      .from('school_info')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (data) setSchoolInfo(data)
  }


  const handleDelete = async (studentId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) return

    setLoadingDelete(studentId)
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (error) throw error
      onStudentDeleted()
    } finally {
      setLoadingDelete(null)
    }
  }


  const handleMoveStudent = async (
    studentId: string,
    currentGroupId: string,
    newGroupId: string
  ) => {
    if (!newGroupId || newGroupId === currentGroupId) return

    try {
      const { error } = await supabase
        .from('students')
        .update({ group_id: newGroupId })
        .eq('id', studentId)

      if (error) throw error
      onStudentDeleted()
    } finally {
      setExpandedId(null)
    }
  }

  const getSpecialStatusName = (statusId: string | null) => {
    if (!statusId) return '-'
    return specialStatuses.find((s) => s.id === statusId)?.name || '-'
  }

  const printStudent = async (student: Student) => {
    const specialStatusName = student.special_status_id
      ? getSpecialStatusName(student.special_status_id)
      : 'لا يوجد'
    const groupName = student.group?.name || '-'
    const now = new Date()
    const date = now.toLocaleDateString('ar-SA')
    const time = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

    // Fetch teacher name and school name
    const { data: teacherProfile } = await supabase
      .from('teacher_profile')
      .select('*')
      .maybeSingle()

    const teacherName = teacherProfile?.name || ''
    const schoolName = teacherProfile?.school_name || schoolInfo?.school_name || 'اسم المدرسة'


    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
        <head>
          <title>بيانات الطالب - ${student.name}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            @page {
              size: A4;
              margin: 15mm;
            }

            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: white;
              color: #1a1a1a;
              line-height: 1.4;
              font-size: 13px;
            }

            .page-container {
              max-width: 210mm;
              margin: 0 auto;
              background: white;
            }

            .header {
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              color: white;
              padding: 15px 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }

            .header h1 {
              font-size: 22px;
              margin-bottom: 4px;
              font-weight: 700;
            }

            .header .school-name {
              font-size: 16px;
              margin-bottom: 8px;
              opacity: 0.95;
              font-weight: 500;
            }

            .header .meta {
              font-size: 11px;
              opacity: 0.9;
              margin-top: 6px;
            }

            .content {
              padding: 20px;
            }

            .student-name-section {
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              border: 2px solid #3b82f6;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 15px;
              text-align: center;
            }

            .student-name-section h2 {
              color: #1e40af;
              font-size: 20px;
              font-weight: 700;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-bottom: 15px;
            }

            .info-item {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 10px;
            }

            .info-label {
              font-size: 11px;
              color: #6b7280;
              font-weight: 600;
              margin-bottom: 4px;
            }

            .info-value {
              font-size: 14px;
              color: #111827;
              font-weight: 600;
            }


            .footer {
              background: #f9fafb;
              padding: 15px 20px;
              border-top: 2px solid #e5e7eb;
              margin-top: 15px;
            }

            .footer-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }

            .signature-box {
              text-align: center;
            }

            .signature-label {
              font-size: 12px;
              color: #6b7280;
              font-weight: 600;
              margin-bottom: 6px;
            }

            .signature-line {
              border-top: 2px solid #374151;
              width: 150px;
              margin: 30px auto 8px;
            }

            .signature-name {
              font-size: 14px;
              color: #111827;
              font-weight: 600;
            }

            .print-info {
              text-align: center;
              color: #9ca3af;
              font-size: 10px;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
            }

            @media print {
              body {
                background: white;
              }

              .page-container {
                border: none;
                border-radius: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header">
              <div class="school-name">${schoolName}</div>
              <h1>بطاقة بيانات الطالب</h1>
              <div class="meta">طُبع بتاريخ: ${date} - الساعة: ${time}${teacherName ? ' - بواسطة: ' + teacherName : ''}</div>
            </div>

            <div class="content">
              <div class="student-name-section">
                <h2>${student.name}</h2>
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">السجل المدني</div>
                  <div class="info-value">${student.national_id}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">الصف الدراسي</div>
                  <div class="info-value">${student.grade}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">الفصل</div>
                  <div class="info-value">${groupName}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">جوال الطالب</div>
                  <div class="info-value">${student.phone}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">جوال ولي الأمر</div>
                  <div class="info-value">${student.guardian_phone}</div>
                </div>

                <div class="info-item">
                  <div class="info-label">الظروف الخاصة</div>
                  <div class="info-value">${specialStatusName}</div>
                </div>
              </div>

            </div>

            <div class="footer">
              <div class="footer-grid">
                <div class="signature-box">
                  <div class="signature-label">المرشد الطلابي</div>
                  <div class="signature-name">${teacherName || 'اسم المرشد الطلابي'}</div>
                  <div class="signature-line"></div>
                  <div style="font-size: 11px; color: #6b7280;">التوقيع</div>
                </div>

                <div class="signature-box">
                  <div class="signature-label">الإدارة</div>
                  <div class="signature-line"></div>
                  <div style="font-size: 11px; color: #6b7280;">التوقيع والختم</div>
                </div>
              </div>

              <div class="print-info">
                هذه الوثيقة صادرة من الإرشاد الطلابي
              </div>
            </div>
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.onafterprint = () => window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">لا توجد طلاب في {groupName}</p>
      </div>
    )
  }

  const groupColors = [
    { bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-gradient-to-r from-blue-400 to-blue-500', text: 'text-blue-900' },
    { bg: 'bg-green-50', border: 'border-green-200', header: 'bg-gradient-to-r from-green-400 to-green-500', text: 'text-green-900' },
    { bg: 'bg-orange-50', border: 'border-orange-200', header: 'bg-gradient-to-r from-orange-400 to-orange-500', text: 'text-orange-900' },
    { bg: 'bg-teal-50', border: 'border-teal-200', header: 'bg-gradient-to-r from-teal-400 to-teal-500', text: 'text-teal-900' },
    { bg: 'bg-pink-50', border: 'border-pink-200', header: 'bg-gradient-to-r from-pink-400 to-pink-500', text: 'text-pink-900' },
    { bg: 'bg-cyan-50', border: 'border-cyan-200', header: 'bg-gradient-to-r from-cyan-400 to-cyan-500', text: 'text-cyan-900' },
  ]

  const groupIndex = groupName.charCodeAt(0) % groupColors.length
  const colors = groupColors[groupIndex]

  return (
    <div className="space-y-2">
        <div className={`${colors.header} text-white px-4 py-3 rounded-lg shadow-md mb-4`}>
          <h3 className="text-lg font-bold flex items-center justify-between">
            <span>{groupName}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{students.length} طالب</span>
          </h3>
        </div>
        <div className="space-y-2">
          {students.map((student) => {
            const hasSpecialStatus = student.special_status_id !== null
            const bgColorClass = hasSpecialStatus
              ? 'bg-amber-50 border-amber-200'
              : `${colors.bg} ${colors.border}`

            return (
          <div
            key={student.id}
            className={`${bgColorClass} rounded-lg shadow-sm border-2 hover:shadow-md transition-shadow`}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">{student.name}</h4>
                  <p className="text-sm text-gray-600">السجل: {student.national_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {student.status === 'استئذان' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      استئذان
                    </span>
                  )}
                  {student.special_status_id && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      {getSpecialStatusName(student.special_status_id)}
                    </span>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === student.id ? null : student.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mb-2">
                <div>الصف: {student.grade}</div>
                <div>جوال: {student.phone}</div>
                <div>ولي أمر: {student.guardian_phone}</div>
              </div>

              {expandedId === student.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() => {
                      setSelectedStudent(student)
                      setShowAllowEntryModal(true)
                      setExpandedId(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded font-medium text-sm shadow-sm"
                  >
                    <DoorOpen size={16} />
                    السماح بدخول الفصل
                  </button>

                  <button
                    onClick={() => printStudent(student)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-800 rounded font-medium text-sm border border-slate-300 shadow-sm"
                  >
                    <Printer size={16} />
                    طباعة بيانات الطالب
                  </button>

                  <button
                    onClick={() => {
                      setExpandedId(null)
                      onEditStudent(student)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 hover:from-amber-200 hover:to-yellow-200 text-amber-900 rounded font-medium text-sm border border-amber-300 shadow-sm"
                  >
                    <Edit2 size={16} />
                    تعديل
                  </button>

                  <button
                    onClick={() => handleDelete(student.id)}
                    disabled={loadingDelete === student.id}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-100 to-rose-100 hover:from-red-200 hover:to-rose-200 text-red-700 rounded font-medium text-sm border border-red-300 shadow-sm disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    {loadingDelete === student.id ? 'جاري...' : 'حذف'}
                  </button>
                </div>
              )}
            </div>
          </div>
            )
          })}
      </div>

      <AllowClassEntryModal
        isOpen={showAllowEntryModal}
        onClose={() => {
          setShowAllowEntryModal(false)
          setSelectedStudent(null)
        }}
        student={selectedStudent}
      />
    </div>
  )
}
