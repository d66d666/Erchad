export interface Group {
  id: string
  name: string
  stage: string
  display_order: number
  created_at: string
}

export interface SpecialStatus {
  id: string
  name: string
  created_at: string
}

export interface Student {
  id: string
  name: string
  national_id: string
  phone: string
  guardian_phone: string
  grade: string
  group_id: string
  status: 'نشط' | 'استئذان'
  special_status_id: string | null
  visit_count: number
  permission_count: number
  violation_count: number
  created_at: string
  updated_at: string
  group?: Group
  special_status?: SpecialStatus
}

export interface StudentVisit {
  id: string
  student_id: string
  visit_date: string
  reason: string
  action_taken: string
  referred_to: 'لا يوجد' | 'مشرف صحي' | 'وكيل' | 'مدير' | 'معلم'
  notes: string
  created_at: string
  student?: Student
}

export interface StudentPermission {
  id: string
  student_id: string
  permission_date: string
  reason: string
  guardian_notified: boolean
  notes: string
  created_at: string
  student?: Student
}

export interface SchoolInfo {
  id: string
  school_name: string
  created_at: string
  updated_at: string
}

export interface StudentViolation {
  id: string
  student_id: string
  violation_date: string
  violation_type: 'هروب من الحصة' | 'غياب بدون عذر' | 'تأخر صباحي' | 'عدم إحضار الكتب' | 'سلوك غير لائق' | 'استخدام الجوال' | 'عدم ارتداء الزي المدرسي' | 'أخرى'
  description: string
  action_taken: string
  notes: string
  created_at: string
  student?: Student
}

export interface Teacher {
  id: string
  name: string
  phone: string
  specialization: string
  created_at: string
  updated_at: string
}

export interface TeacherGroup {
  id: string
  teacher_id: string
  group_id: string
  created_at: string
  teacher?: Teacher
  group?: Group
}
