import Dexie, { Table } from 'dexie'
import { Student, Group, SpecialStatus } from '../types'

export interface StudentVisit {
  id?: string
  student_id: string
  visit_date: string
  reason?: string
  notes?: string
  created_at?: string
}

export interface StudentPermission {
  id?: string
  student_id: string
  permission_date: string
  reason?: string
  duration?: string
  notes?: string
  created_at?: string
}

export interface StudentViolation {
  id?: string
  student_id: string
  violation_type: string
  violation_date: string
  description?: string
  action_taken?: string
  notes?: string
  created_at?: string
}

export interface TeacherProfile {
  id?: string
  name?: string
  school_name?: string
  logo_url?: string
  created_at?: string
}

export class StudentsDatabase extends Dexie {
  groups!: Table<Group>
  students!: Table<Student>
  special_statuses!: Table<SpecialStatus>
  student_visits!: Table<StudentVisit>
  student_permissions!: Table<StudentPermission>
  student_violations!: Table<StudentViolation>
  teacher_profile!: Table<TeacherProfile>

  constructor() {
    super('StudentsDatabase')
    this.version(1).stores({
      groups: 'id, name',
      students: 'id, student_id, name, group_id, has_permission, special_status',
      special_statuses: 'id, name',
      student_visits: 'id, student_id, visit_date',
      student_permissions: 'id, student_id, permission_date',
      student_violations: 'id, student_id, violation_date',
      teacher_profile: 'id'
    })
  }
}

export const db = new StudentsDatabase()
