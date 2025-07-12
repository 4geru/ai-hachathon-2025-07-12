
import { createClient } from '@supabase/supabase-js'
import { Database } from '../lib/database.types'

export const supabase = createClient<
  Database,
  'public',
  Database['public']
>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
