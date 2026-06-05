import { supabase } from './supabase'

export async function fetchCalendarEntries({ fromDate, toDate } = {}) {
  let q = supabase.from('training_calendar').select('*').order('from_date', { ascending: true })
  if (fromDate) q = q.gte('from_date', fromDate)
  if (toDate)   q = q.lte('from_date', toDate)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function saveCalendarEntry(entry) {
  const { data, error } = await supabase
    .from('training_calendar')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCalendarEntry(id) {
  const { error } = await supabase.from('training_calendar').delete().eq('id', id)
  if (error) throw error
}

// ── Status logic ───────────────────────────────────────────────────────────
export function getStatus(fromDate, toDate) {
  const today = new Date(); today.setHours(0,0,0,0)
  const from  = new Date(fromDate + 'T00:00:00')
  const to    = new Date(toDate   + 'T00:00:00')
  if (today < from) return 'Upcoming'
  if (today > to)   return 'Completed'
  return 'Ongoing'
}

export function statusStyle(status) {
  if (status === 'Ongoing')   return { color: '#2D6A4F', bg: '#D8F3DC', border: '#B7E4C7' }
  if (status === 'Upcoming')  return { color: '#1A1C1E', bg: '#EEF2FF', border: '#C7D2FE' }
  return                             { color: '#6C7278', bg: '#F7F5F2', border: '#E5E0D8' }
}

// ── Calendar helpers ───────────────────────────────────────────────────────
export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay() // 0=Sun
}

export function entriesForDay(entries, year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  return entries.filter(e => e.from_date <= dateStr && e.to_date >= dateStr)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}
