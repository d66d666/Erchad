import Dexie, { Table } from 'dexie'
import { Student, Group, SpecialStatus, Teacher } from '../types'

export interface StudentVisit {
  id?: string
  student_id: string
  visit_date: string
  reason: string
  action_taken: string
  referred_to: string
  notes?: string
  created_at?: string
}

export interface StudentPermission {
  id?: string
  student_id: string
  permission_date: string
  reason: string
  guardian_notified?: boolean
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

export interface LoginCredentials {
  id?: string
  username: string
  password_hash: string
  reset_token?: string | null
  reset_token_expires?: string | null
  created_at?: string
  updated_at?: string
}

export class StudentsDatabase extends Dexie {
  groups!: Table<Group>
  students!: Table<Student>
  special_statuses!: Table<SpecialStatus>
  student_visits!: Table<StudentVisit>
  student_permissions!: Table<StudentPermission>
  student_violations!: Table<StudentViolation>
  teacher_profile!: Table<TeacherProfile>
  login_credentials!: Table<LoginCredentials>
  teachers!: Table<Teacher>

  constructor() {
    super('StudentsDatabase')
    this.version(5).stores({
      groups: 'id, name, stage, display_order',
      students: 'id, student_id, name, group_id, has_permission, special_status',
      special_statuses: 'id, name',
      student_visits: 'id, student_id, visit_date',
      student_permissions: 'id, student_id, permission_date',
      student_violations: 'id, student_id, violation_date',
      teacher_profile: 'id',
      login_credentials: 'id, username',
      teachers: 'id, phone, name'
    }).upgrade(trans => {
      return trans.table('groups').toCollection().modify(group => {
        if (group.display_order === undefined) {
          group.display_order = 999
        }
      })
    })
  }
}

export const db = new StudentsDatabase()

// Initialize default login credentials
db.on('ready', async () => {
  const count = await db.login_credentials.count()
  if (count === 0) {
    await db.login_credentials.add({
      id: crypto.randomUUID(),
      username: 'admin',
      password_hash: 'admin123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
})
