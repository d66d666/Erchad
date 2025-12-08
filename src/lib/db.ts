import Dexie, { Table } from 'dexie'
import { Student, Group, SpecialStatus, Teacher } from '../types'

export { useLiveQuery } from 'dexie-react-hooks'

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
  phone?: string
  school_name?: string
  system_description?: string
  logo_url?: string
  created_at?: string
}

export interface LoginCredentials {
  id?: string
  username: string
  password_hash: string
  school_name?: string
  teacher_name?: string
  phone?: string
  expiry_date?: string | null // تاريخ انتهاء الصلاحية
  reset_token?: string | null
  reset_token_expires?: string | null
  created_at?: string
  updated_at?: string
}

export interface TeacherGroup {
  id?: string
  teacher_id: string
  group_id: string
  created_at?: string
}

export interface RenewalCode {
  id?: string
  code: string
  username: string
  extension_months: number
  used: boolean
  created_at?: string
  used_at?: string | null
}

export interface Subscription {
  id?: string
  school_id: string
  start_date: string
  end_date: string
  is_active: boolean
  last_key_used?: string
  created_at?: string
  updated_at?: string
}

export interface ActivationHistory {
  id?: string
  license_key: string
  key_id: string
  activation_date: string
  start_date: string
  end_date: string
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
  login_credentials!: Table<LoginCredentials>
  teachers!: Table<Teacher>
  teacher_groups!: Table<TeacherGroup>
  renewal_codes!: Table<RenewalCode>
  subscription!: Table<Subscription>
  activation_history!: Table<ActivationHistory>

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

    this.version(6).stores({
      teacher_groups: 'id, teacher_id, group_id'
    })

    this.version(7).stores({
      login_credentials: 'id, username, expiry_date'
    })

    this.version(8).stores({
      renewal_codes: 'id, code, username, used'
    })

    this.version(9).stores({
      subscription: 'id, school_id, is_active',
      activation_history: 'id, key_id, activation_date'
    })

    this.version(10).stores({
      groups: 'id, name, stage, display_order',
      students: 'id, student_id, name, national_id, group_id, special_status_id',
      special_statuses: 'id, name',
      student_visits: 'id, student_id, visit_date',
      student_permissions: 'id, student_id, permission_date',
      student_violations: 'id, student_id, violation_date, violation_type',
      teacher_profile: 'id',
      login_credentials: 'id, username, expiry_date',
      teachers: 'id, name, phone',
      teacher_groups: 'id, teacher_id, group_id',
      renewal_codes: 'id, code, username, used',
      subscription: 'id, school_id, is_active, end_date',
      activation_history: 'id, key_id, activation_date'
    })
  }
}

export const db = new StudentsDatabase()

// Initialize default login credentials - non-blocking
const initializeDefaultCredentials = async () => {
  try {
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
  } catch (error) {
    console.error('Failed to initialize credentials:', error)
  }
}

// Initialize in background without blocking
setTimeout(() => initializeDefaultCredentials(), 100)
