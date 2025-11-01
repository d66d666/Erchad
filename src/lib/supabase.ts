import { db } from './db'

// Mock Supabase API for local database
export const supabase = {
  from: (table: string) => ({
    select: (columns: string = '*') => ({
      eq: (column: string, value: any) => ({
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
            const id = await (db as any)[table].add(values)
            const data = await (db as any)[table].get(id)
            return { data, error: null }
          } catch (error) {
            return { data: null, error }
          }
        }
      }),
      then: async (resolve: any) => {
        try {
          await (db as any)[table].add(values)
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
