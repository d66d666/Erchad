import { db } from './db'

// نوع البيانات المرجعة من Supabase
type SupabaseResponse<T> = {
  data: T | null
  error: any
}

// بناء الاستعلام - يحاكي Supabase Query Builder
class QueryBuilder<T = any> {
  private tableName: string
  private filters: Array<(item: any) => boolean> = []
  private orderByField?: string
  private orderDirection: 'asc' | 'desc' = 'asc'
  private selectedFields: string = '*'
  private limitValue?: number

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(fields: string = '*'): this {
    this.selectedFields = fields
    return this
  }

  eq(field: string, value: any): this {
    this.filters.push((item) => item[field] === value)
    return this
  }

  neq(field: string, value: any): this {
    this.filters.push((item) => item[field] !== value)
    return this
  }

  gte(field: string, value: any): this {
    this.filters.push((item) => {
      const itemValue = item[field]
      if (itemValue instanceof Date || typeof itemValue === 'string') {
        return new Date(itemValue) >= new Date(value)
      }
      return itemValue >= value
    })
    return this
  }

  lte(field: string, value: any): this {
    this.filters.push((item) => {
      const itemValue = item[field]
      if (itemValue instanceof Date || typeof itemValue === 'string') {
        return new Date(itemValue) <= new Date(value)
      }
      return itemValue <= value
    })
    return this
  }

  gt(field: string, value: any): this {
    this.filters.push((item) => {
      const itemValue = item[field]
      if (itemValue instanceof Date || typeof itemValue === 'string') {
        return new Date(itemValue) > new Date(value)
      }
      return itemValue > value
    })
    return this
  }

  lt(field: string, value: any): this {
    this.filters.push((item) => {
      const itemValue = item[field]
      if (itemValue instanceof Date || typeof itemValue === 'string') {
        return new Date(itemValue) < new Date(value)
      }
      return itemValue < value
    })
    return this
  }

  order(field: string, options?: { ascending?: boolean }): this {
    this.orderByField = field
    this.orderDirection = options?.ascending === false ? 'desc' : 'asc'
    return this
  }

  limit(count: number): this {
    this.limitValue = count
    return this
  }

  // تنفيذ الاستعلام وإرجاع النتائج
  async execute(): Promise<SupabaseResponse<T[]>> {
    try {
      const table = this.getTable()
      let items = await table.toArray()

      // تطبيق الفلاتر
      for (const filter of this.filters) {
        items = items.filter(filter)
      }

      // الترتيب
      if (this.orderByField) {
        items.sort((a, b) => {
          const aVal = a[this.orderByField!]
          const bVal = b[this.orderByField!]
          
          let comparison = 0
          if (aVal < bVal) comparison = -1
          if (aVal > bVal) comparison = 1
          
          return this.orderDirection === 'asc' ? comparison : -comparison
        })
      }

      // التحديد (Limit)
      if (this.limitValue) {
        items = items.slice(0, this.limitValue)
      }

      return { data: items as T[], error: null }
    } catch (error) {
      console.error('IndexedDB query error:', error)
      return { data: null, error }
    }
  }

  // للحصول على عنصر واحد فقط
  async maybeSingle(): Promise<SupabaseResponse<T>> {
    try {
      const result = await this.execute()
      if (result.error) return { data: null, error: result.error }
      return { 
        data: result.data && result.data.length > 0 ? result.data[0] as T : null, 
        error: null 
      }
    } catch (error) {
      return { data: null, error }
    }
  }

  async single(): Promise<SupabaseResponse<T>> {
    return this.maybeSingle()
  }

  // الإدراج
  async insert(data: any): Promise<SupabaseResponse<T>> {
    try {
      const table = this.getTable()
      
      // التعامل مع الإدراج المتعدد
      if (Array.isArray(data)) {
        const ids = await Promise.all(
          data.map(async (item) => {
            const id = item.id || crypto.randomUUID()
            const now = new Date().toISOString()
            const record = {
              ...item,
              id,
              created_at: item.created_at || now,
              updated_at: item.updated_at || now
            }
            await table.put(record)
            return record
          })
        )
        return { data: ids as any, error: null }
      } else {
        // إدراج واحد
        const id = data.id || crypto.randomUUID()
        const now = new Date().toISOString()
        const record = {
          ...data,
          id,
          created_at: data.created_at || now,
          updated_at: data.updated_at || now
        }
        await table.put(record)
        return { data: record as T, error: null }
      }
    } catch (error) {
      console.error('IndexedDB insert error:', error)
      return { data: null, error }
    }
  }

  // التحديث
  async update(data: any): Promise<SupabaseResponse<T>> {
    try {
      const table = this.getTable()
      let items = await table.toArray()

      // تطبيق الفلاتر لإيجاد العناصر المطلوب تحديثها
      for (const filter of this.filters) {
        items = items.filter(filter)
      }

      const now = new Date().toISOString()
      const updatedItems = await Promise.all(
        items.map(async (item) => {
          const updated = {
            ...item,
            ...data,
            updated_at: now
          }
          await table.put(updated)
          return updated
        })
      )

      return { 
        data: updatedItems.length > 0 ? updatedItems[0] as T : null, 
        error: null 
      }
    } catch (error) {
      console.error('IndexedDB update error:', error)
      return { data: null, error }
    }
  }

  // الحذف
  async delete(): Promise<SupabaseResponse<null>> {
    try {
      const table = this.getTable()
      let items = await table.toArray()

      // تطبيق الفلاتر لإيجاد العناصر المطلوب حذفها
      for (const filter of this.filters) {
        items = items.filter(filter)
      }

      await Promise.all(
        items.map((item) => table.delete(item.id))
      )

      return { data: null, error: null }
    } catch (error) {
      console.error('IndexedDB delete error:', error)
      return { data: null, error }
    }
  }

  // الحصول على الجدول المناسب من IndexedDB
  private getTable() {
    switch (this.tableName) {
      case 'students':
        return db.students
      case 'groups':
        return db.groups
      case 'special_statuses':
        return db.special_statuses
      case 'student_visits':
        return db.student_visits
      case 'student_permissions':
        return db.student_permissions
      case 'student_violations':
        return db.student_violations
      case 'teachers':
        return db.teachers
      case 'teacher_groups':
        return db.teacher_groups
      case 'teacher_profile':
        return db.teacher_profile
      case 'login_credentials':
        return db.login_credentials
      default:
        throw new Error(`Unknown table: ${this.tableName}`)
    }
  }
}

// محاكاة Supabase Client
export class IndexedDBClient {
  from(tableName: string) {
    const builder = new QueryBuilder(tableName)
    
    // إنشاء proxy يدعم chaining كامل
    const createChainableBuilder = (currentBuilder: QueryBuilder) => {
      return new Proxy(currentBuilder, {
        get(target: any, prop: string) {
          // إذا كان method موجود في QueryBuilder
          if (prop in target && typeof target[prop] === 'function') {
            return (...args: any[]) => {
              const result = target[prop](...args)
              // إرجاع proxy جديد للسماح بالـ chaining
              if (result === target) {
                return createChainableBuilder(result)
              }
              return result
            }
          }
          
          // دعم خاص لـ then للسماح بـ Promise behavior
          if (prop === 'then') {
            return (resolve: any, reject: any) => target.execute().then(resolve, reject)
          }
          
          return target[prop]
        }
      })
    }
    
    return {
      select: (fields?: string) => {
        const selectBuilder = builder.select(fields || '*')
        return createChainableBuilder(selectBuilder)
      },
      insert: (data: any) => {
        const insertPromise = builder.insert(data)
        return {
          select: (fields?: string) => {
            return {
              maybeSingle: () => insertPromise,
              single: () => insertPromise,
              then: (resolve: any, reject: any) => insertPromise.then(resolve, reject)
            }
          },
          then: (resolve: any, reject: any) => insertPromise.then(resolve, reject)
        }
      },
      update: (data: any) => {
        return {
          eq: (field: string, value: any) => {
            builder.eq(field, value)
            const updatePromise = builder.update(data)
            return {
              select: (fields?: string) => {
                return {
                  maybeSingle: () => updatePromise,
                  single: () => updatePromise,
                  then: (resolve: any, reject: any) => updatePromise.then(resolve, reject)
                }
              },
              then: (resolve: any, reject: any) => updatePromise.then(resolve, reject)
            }
          },
          then: (resolve: any, reject: any) => builder.update(data).then(resolve, reject)
        }
      },
      delete: () => {
        return {
          eq: (field: string, value: any) => {
            builder.eq(field, value)
            const deletePromise = builder.delete()
            return {
              then: (resolve: any, reject: any) => deletePromise.then(resolve, reject)
            }
          },
          then: (resolve: any, reject: any) => builder.delete().then(resolve, reject)
        }
      }
    }
  }
}

export const indexedDBClient = new IndexedDBClient()
