import { useState, useMemo, useEffect } from 'react'
import { Student, SpecialStatus } from '../types'
import { MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginatedStudentsListProps {
  students: Student[]
  specialStatuses: SpecialStatus[]
  studentMenuOpen: string | null
  setStudentMenuOpen: (id: string | null) => void
  onEditStudent: (student: Student) => void
  onAllowEntry: (student: Student) => void
  onPrintStudent: (student: Student) => void
  onDeleteStudent: (id: string) => void
  loadingDelete: string | null
  mainMenuItems: {
    reception: boolean
    permission: boolean
    violations: boolean
  }
}

const STUDENTS_PER_PAGE = 30

export function PaginatedStudentsList({
  students,
  specialStatuses,
  studentMenuOpen,
  setStudentMenuOpen,
  onEditStudent,
  onAllowEntry,
  onPrintStudent,
  onDeleteStudent,
  loadingDelete,
  mainMenuItems
}: PaginatedStudentsListProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(students.length / STUDENTS_PER_PAGE)

  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE
    const endIndex = startIndex + STUDENTS_PER_PAGE
    return students.slice(startIndex, endIndex)
  }, [students, currentPage])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [students.length])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setStudentMenuOpen(null)
  }

  if (students.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4 text-sm">لا يوجد طلاب</p>
    )
  }

  const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * STUDENTS_PER_PAGE, students.length)

  return (
    <>
      {totalPages > 1 && (
        <div className="mb-3 text-center text-sm text-gray-600 font-medium bg-blue-50 rounded-lg py-2 px-4 border border-blue-200">
          عرض {startIndex} - {endIndex} من {students.length} طالب
        </div>
      )}

      <div className="space-y-2">
        {paginatedStudents.map(student => {
          const specialStatus = specialStatuses.find(ss => ss.id === student.special_status_id)
          return (
            <div
              key={student.id}
              className={`border rounded-lg p-3 transition-all relative ${
                specialStatus ? 'border-yellow-300 bg-yellow-50' : 'border-teal-200 bg-teal-50'
              }`}
            >
              {specialStatus && (
                <div className="absolute top-2 left-8 px-2 py-0.5 rounded-md text-xs font-bold bg-purple-200 text-purple-800 z-10">
                  {specialStatus.name}
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-base font-bold text-gray-900 mb-1.5">{student.name}</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-right mb-2">
                    <p className="text-gray-700">السجل: {student.national_id}</p>
                    <p className="text-gray-700">الصف: {student.grade}</p>
                    <p className="text-gray-700">جوال: {student.phone}</p>
                    <p className="text-gray-700">ولي أمر: {student.guardian_phone}</p>
                  </div>
                  <div className="flex gap-2 text-xs font-semibold">
                    {mainMenuItems.reception && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md">
                        الاستقبال: {student.visit_count || 0}
                      </span>
                    )}
                    {mainMenuItems.permission && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md">
                        الاستئذانات: {student.permission_count || 0}
                      </span>
                    )}
                    {mainMenuItems.violations && (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md">
                        المخالفات: {student.violation_count || 0}
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setStudentMenuOpen(studentMenuOpen === student.id ? null : student.id)
                    }}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <MoreVertical size={18} className="text-gray-600" />
                  </button>

                  {studentMenuOpen === student.id && (
                    <div className="absolute left-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]">
                      <button
                        onClick={() => {
                          onAllowEntry(student)
                          setStudentMenuOpen(null)
                        }}
                        className="w-full px-4 py-2 text-right hover:bg-blue-50 text-sm font-medium text-gray-700"
                      >
                        السماح بدخول الفصل
                      </button>
                      <button
                        onClick={() => {
                          onPrintStudent(student)
                          setStudentMenuOpen(null)
                        }}
                        className="w-full px-4 py-2 text-right hover:bg-blue-50 text-sm font-medium text-gray-700"
                      >
                        طباعة بيانات الطالب
                      </button>
                      <button
                        onClick={() => {
                          onEditStudent(student)
                          setStudentMenuOpen(null)
                        }}
                        className="w-full px-4 py-2 text-right hover:bg-blue-50 text-sm font-medium text-gray-700"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => {
                          onDeleteStudent(student.id)
                          setStudentMenuOpen(null)
                        }}
                        disabled={loadingDelete === student.id}
                        className="w-full px-4 py-2 text-right hover:bg-red-50 text-sm font-medium text-red-600 disabled:opacity-50"
                      >
                        {loadingDelete === student.id ? 'جاري الحذف...' : 'حذف'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 bg-white rounded-lg shadow-md p-3 border border-gray-200">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
          >
            <ChevronRight size={16} />
            السابق
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber: number

              if (totalPages <= 5) {
                pageNumber = i + 1
              } else if (currentPage <= 3) {
                pageNumber = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i
              } else {
                pageNumber = currentPage - 2 + i
              }

              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`w-8 h-8 rounded-lg font-bold text-sm transition-all ${
                    currentPage === pageNumber
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-110'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pageNumber}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-300 disabled:to-gray-400"
          >
            التالي
            <ChevronLeft size={16} />
          </button>

          <div className="mr-2 text-xs text-gray-600 font-medium">
            {currentPage}/{totalPages}
          </div>
        </div>
      )}
    </>
  )
}
