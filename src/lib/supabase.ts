import { db } from './db'

// Generate unique ID
function generateId() {
  return crypto.randomUUID()
}

// Mock Supabase API for local database
export const supabase = {
  from: (table: string) => ({
    select: (columns: string = '*') => ({
      eq: (column: string, value: any) => ({
        eq: (column2: string, value2: any) => ({
          maybeSingle: async () => {
            try {
              const data = await (db as any)[table]
                .where(column).equals(value)
                .and(item => item[column2] === value2)
                .first()
              return { data: data || null, error: null }
            } catch (error) {
              return { data: null, error }
            }
          }
        }),
        maybeSingle: async () => {
          try {
            const data = await (db as any)[table].where(column).equals(value).first()
            return { data: data || null, error: null }
          } catch (error) {
            return { data: null, error }
          }
        },
        single: async () => {
          try {
            const data = await (db as any)[table].where(column).equals(value).first()
            return { data, error: data ? null : new Error('Not found') }
          } catch (error) {
            return { data: null, error }
          }
        }
      }),
      order: (column: string) => ({
        then: async (resolve: any) => {
          try {
            const data = await (db as any)[table].orderBy(column).toArray()
            resolve({ data, error: null })
          } catch (error) {
            resolve({ data: null, error })
          }
        }
      }),
      maybeSingle: async () => {
        try {
          const data = await (db as any)[table].limit(1).first()
          return { data: data || null, error: null }
        } catch (error) {
          return { data: null, error }
        }
      },
      then: async (resolve: any) => {
        try {
          const data = await (db as any)[table].toArray()
          resolve({ data, error: null })
        } catch (error) {
          resolve({ data: null, error })
        }
      }
    }),
    insert: (values: any) => ({
      select: () => ({
        single: async () => {
          try {
            const dataWithId = Array.isArray(values)
              ? values.map(v => ({ id: generateId(), created_at: new Date().toISOString(), ...v }))
              : { id: generateId(), created_at: new Date().toISOString(), ...values }

            if (Array.isArray(dataWithId)) {
              await (db as any)[table].bulkAdd(dataWithId)
              return { data: dataWithId, error: null }
            } else {
              await (db as any)[table].add(dataWithId)
              return { data: dataWithId, error: null }
            }
          } catch (error) {
            return { data: null, error }
          }
        }
      }),
      then: async (resolve: any) => {
        try {
          const dataWithId = Array.isArray(values)
            ? values.map(v => ({ id: generateId(), created_at: new Date().toISOString(), ...v }))
            : { id: generateId(), created_at: new Date().toISOString(), ...values }

          if (Array.isArray(dataWithId)) {
            await (db as any)[table].bulkAdd(dataWithId)
          } else {
            await (db as any)[table].add(dataWithId)
          }
          resolve({ error: null })
        } catch (error) {
          resolve({ error })
        }
      }
    }),
    update: (values: any) => ({
      eq: (column: string, value: any) => ({
        then: async (resolve: any) => {
          try {
            await (db as any)[table].where(column).equals(value).modify(values)
            resolve({ error: null })
          } catch (error) {
            resolve({ error })
          }
        }
      })
    }),
    upsert: (values: any, options?: any) => ({
      then: async (resolve: any) => {
        try {
          const dataArray = Array.isArray(values) ? values : [values]

          for (const item of dataArray) {
            const dataWithId = { id: generateId(), created_at: new Date().toISOString(), ...item }
            await (db as any)[table].put(dataWithId)
          }
          resolve({ error: null })
        } catch (error) {
          resolve({ error })
        }
      }
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        then: async (resolve: any) => {
          try {
            await (db as any)[table].where(column).equals(value).delete()
            resolve({ error: null })
          } catch (error) {
            resolve({ error })
          }
        }
      })
    })
  })
}
