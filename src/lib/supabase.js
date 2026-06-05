import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true },
})

// ─── Database helpers ──────────────────────────────────────────────────────

export async function fetchTargets(financialYear) {
  const { data, error } = await supabase
    .from('annual_targets')
    .select('*')
    .eq('financial_year', financialYear)
  if (error) throw error
  return data || []
}

export async function fetchCumulativeAchievements(financialYear) {
  const fy = financialYear || getCurrentFY()
  const [startYear] = fy.split('-')
  const startDate = `${startYear}-04-01`
  const endDate = `${parseInt(startYear) + 1}-03-31`

  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
  if (error) throw error
  return data || []
}

export async function saveDailyEntries(entries) {
  const { error } = await supabase
    .from('daily_entries')
    .insert(entries)
  if (error) throw error
}

export async function updateTarget(activityName, financialYear, updates) {
  const { data, error } = await supabase
    .from('annual_targets')
    .upsert({ activity_name: activityName, financial_year: financialYear, ...updates })
    .select()
  if (error) throw error
  return data
}

// ─── Offline queue (localStorage) ─────────────────────────────────────────

const QUEUE_KEY = 'ndrf_offline_queue'

export function queueOfflineEntry(entry) {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  queue.push({ ...entry, _queued_at: new Date().toISOString() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function syncOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  if (!queue.length) return 0
  try {
    await saveDailyEntries(queue.map(e => { const { _queued_at, ...rest } = e; return rest }))
    localStorage.removeItem(QUEUE_KEY)
    return queue.length
  } catch {
    return 0
  }
}

export function getOfflineQueueCount() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]').length
}

export function getCurrentFY() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}
