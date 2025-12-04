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

  // إضافة حساب Ahmed التجريبي منتهي الاشتراك
  const ahmedExists = await db.login_credentials.where('username').equals('ahmed').count()
  if (ahmedExists === 0) {
    const ahmedId = crypto.randomUUID()
    await db.login_credentials.add({
      id: ahmedId,
      username: 'ahmed',
      password_hash: '12345',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    // إضافة ملف شخصي
    await db.teacher_profile.add({
      id: ahmedId,
      name: 'Ahmed',
      phone: '',
      school_name: 'مدرسة أحمد التجريبية',
      system_description: 'نظام إدارة الطلاب',
      created_at: new Date().toISOString()
    })

    // إضافة اشتراك منتهي (انتهى قبل شهر)
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() - 1)

    const startDate = new Date(endDate)
    startDate.setMonth(startDate.getMonth() - 12)

    await db.subscription.add({
      id: crypto.randomUUID(),
      school_id: ahmedId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }

  // إضافة حساب Ali التجريبي باشتراك فعّال
  const aliExists = await db.login_credentials.where('username').equals('ali').count()
  if (aliExists === 0) {
    const aliId = crypto.randomUUID()
    await db.login_credentials.add({
      id: aliId,
      username: 'ali',
      password_hash: '12345',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    // إضافة ملف شخصي
    await db.teacher_profile.add({
      id: aliId,
      name: 'Ali',
      phone: '0512345678',
      school_name: 'مدرسة علي النموذجية',
      system_description: 'نظام إدارة الطلاب',
      created_at: new Date().toISOString()
    })

    // إضافة اشتراك فعّال (ينتهي بعد 11 شهر)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 11)

    await db.subscription.add({
      id: crypto.randomUUID(),
      school_id: aliId,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
  }
})
