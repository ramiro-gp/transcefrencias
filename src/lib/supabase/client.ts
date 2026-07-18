import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { validateSupabaseConfig } from './config'

const config = validateSupabaseConfig(import.meta.env)

export const supabase = createClient<Database>(config.url, config.anonKey, {
  auth: {
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
