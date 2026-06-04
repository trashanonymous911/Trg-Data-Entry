// Aggregate daily_entries into cumulative totals per activity + field
export function aggregateEntries(entries) {
  const totals = {}
  for (const entry of entries) {
    const key = entry.activity_id
    if (!totals[key]) totals[key] = {}
    const data = entry.data || {}
    for (const [field, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        totals[key][field] = (totals[key][field] || 0) + value
      } else if (field === 'conducted' && value === true) {
        totals[key][field] = (totals[key][field] || 0) + 1
      }
    }
  }
  return totals
}

export function calcAchievementPct(achievement, target) {
  if (!target || target === 0) return 0
  return Math.round((achievement / target) * 100)
}

export function calcBalance(achievement, target) {
  return target - achievement
}

export function getBarColor(pct) {
  if (pct >= 100) return 'bg-green-500'
  if (pct >= 75) return 'bg-blue-500'
  if (pct >= 50) return 'bg-yellow-500'
  return 'bg-red-400'
}

export function getStatusBadge(pct) {
  if (pct >= 100) return { text: 'Target Met', cls: 'bg-green-100 text-green-800' }
  if (pct >= 75) return { text: 'On Track', cls: 'bg-blue-100 text-blue-800' }
  if (pct >= 50) return { text: 'In Progress', cls: 'bg-yellow-100 text-yellow-800' }
  return { text: 'Below Target', cls: 'bg-red-100 text-red-800' }
}

// Filter entries by month (1-based FY month: April=1, March=12)
export function filterByMonth(entries, fyMonth) {
  if (!fyMonth) return entries
  return entries.filter(e => {
    const d = new Date(e.entry_date)
    const calMonth = d.getMonth() + 1
    // FY month mapping: April(4)=1 ... March(3)=12
    const fyM = calMonth >= 4 ? calMonth - 3 : calMonth + 9
    return fyM === fyMonth
  })
}

export function filterByActivity(entries, activityId) {
  if (!activityId) return entries
  return entries.filter(e => e.activity_id === activityId)
}
