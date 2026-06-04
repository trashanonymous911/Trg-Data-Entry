import { ACTIVITIES, MONTHS } from '../lib/constants'
import { aggregateEntries, calcAchievementPct, calcBalance, filterByMonth } from './calculations'

const LINE  = '─────────────────────'
const DLINE = '═════════════════════'

function progressBar(pct, len = 10) {
  const filled = Math.round((Math.min(pct, 100) / 100) * len)
  return '▰'.repeat(filled) + '▱'.repeat(len - filled)
}

function statusText(pct) {
  if (pct >= 100) return 'Target Met'
  if (pct >= 75)  return 'On Track'
  if (pct >= 50)  return 'In Progress'
  return 'Below Target'
}

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN')
}

function getCurrentDateStr() {
  return new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function getDateStr(entryDate) {
  if (!entryDate) return getCurrentDateStr()
  return new Date(entryDate + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// ── Quick daily summary ────────────────────────────────────────────────────
export function generateQuickSummary({ cumulative, targets, financialYear, entryDate }) {

  function getTarget(id, key) {
    return targets?.[id]?.[key]
      ?? ACTIVITIES.find(a => a.id === id)?.targets.find(t => t.key === key)?.defaultValue
      ?? 0
  }

  const totalPersonnel =
    (cumulative['sdrf_training']?.personnel_trained    || 0) +
    (cumulative['inter_agency']?.personnel_trained     || 0) +
    (cumulative['boatmen_training']?.personnel_trained || 0) +
    (cumulative['ncc_training']?.personnel_trained     || 0) +
    (cumulative['nss_training']?.personnel_trained     || 0)

  const totalMandays =
    (cumulative['sdrf_training']?.mandays || 0) +
    (cumulative['inter_agency']?.mandays  || 0)

  const totalMock =
    (cumulative['railway_mock']?.conducted  || 0) +
    (cumulative['district_mock']?.conducted || 0) +
    (cumulative['ropeway_mock']?.conducted  || 0)

  const valDone   = cumulative['online_validation']?.completed_today || 0
  const valTarget = getTarget('online_validation', 'completed_today')
  const valPct    = calcAchievementPct(valDone, valTarget)
  const valPend   = Math.max(0, valTarget - valDone)

  const lines = [
    `*NDRF TRAINING BRANCH*`,
    `*Daily MIS Report — ${getDateStr(entryDate)}*`,
    `_FY: ${financialYear}_`,
    ``,
    DLINE,
    `*OVERVIEW*`,
    DLINE,
    ``,
    `Personnel Trained    : *${fmt(totalPersonnel)}*`,
    `Mandays Generated    : *${fmt(totalMandays)}*`,
    `CAP Conducted        : *${fmt(cumulative['cap']?.programmes_conducted || 0)}*`,
    `SSP Conducted        : *${fmt(cumulative['ssp']?.programmes_conducted || 0)}*`,
    `Mock Exercises       : *${fmt(totalMock)}*`,
    `Innovations          : *${fmt(cumulative['innovations']?.count || 0)}*`,
    `BFRC Pending         : *${fmt(cumulative['bfrc']?.pending || 0)}*`,
    ``,
    LINE,
    `*ONLINE VALIDATION TEST*`,
    LINE,
    `Target    : *${fmt(valTarget)}*`,
    `Completed : *${fmt(valDone)}*`,
    `Pending   : *${fmt(valPend)}*`,
    `Progress  : ${progressBar(valPct)} *${valPct}%*  (${statusText(valPct)})`,
    ``,
    LINE,
    `_NDRF Training MIS — ${getCurrentDateStr()}_`,
  ]

  return lines.join('\n')
}

// ── Full detailed report ───────────────────────────────────────────────────
export function generateFullReport({ cumulative, targets, financialYear, entryDate }) {

  function getTarget(id, key) {
    return targets?.[id]?.[key]
      ?? ACTIVITIES.find(a => a.id === id)?.targets.find(t => t.key === key)?.defaultValue
      ?? 0
  }

  const rows = ACTIVITIES.map(a => {
    const target      = getTarget(a.id, a.achievementKey)
    const achievement = cumulative[a.id]?.[a.achievementKey] || 0
    const balance     = calcBalance(achievement, target)
    const pct         = calcAchievementPct(achievement, target)
    return { a, target, achievement, balance, pct }
  })

  const totalPersonnel =
    (cumulative['sdrf_training']?.personnel_trained    || 0) +
    (cumulative['inter_agency']?.personnel_trained     || 0) +
    (cumulative['boatmen_training']?.personnel_trained || 0) +
    (cumulative['ncc_training']?.personnel_trained     || 0) +
    (cumulative['nss_training']?.personnel_trained     || 0)

  const totalMandays =
    (cumulative['sdrf_training']?.mandays || 0) +
    (cumulative['inter_agency']?.mandays  || 0)

  const metCount   = rows.filter(r => r.pct >= 100).length
  const onTrack    = rows.filter(r => r.pct >= 75 && r.pct < 100).length
  const inProgress = rows.filter(r => r.pct >= 50 && r.pct < 75).length
  const below      = rows.filter(r => r.pct < 50).length

  const lines = [
    `*NATIONAL DISASTER RESPONSE FORCE*`,
    `*Training Branch — Annual Target MIS*`,
    ``,
    `Date : *${getDateStr(entryDate)}*`,
    `FY   : *${financialYear}*`,
    ``,
    DLINE,
    `*KEY HIGHLIGHTS*`,
    DLINE,
    `Total Personnel Trained : *${fmt(totalPersonnel)}*`,
    `Total Mandays Generated : *${fmt(totalMandays)}*`,
    ``,
    DLINE,
    `*ACTIVITY-WISE ACHIEVEMENT*`,
    DLINE,
    ``,
  ]

  rows.forEach(({ a, target, achievement, balance, pct }) => {
    const balStr = balance <= 0
      ? `+${fmt(Math.abs(balance))} (Surplus)`
      : `${fmt(balance)} (Pending)`

    lines.push(LINE)
    lines.push(`*${a.name.toUpperCase()}*`)
    lines.push(`Target      : ${fmt(target)}`)
    lines.push(`Achievement : *${fmt(achievement)}*`)
    lines.push(`Balance     : ${balStr}`)
    lines.push(`Progress    : ${progressBar(pct)} *${pct}%* — _${statusText(pct)}_`)

    if (a.id === 'sdrf_training' || a.id === 'inter_agency') {
      const mdDone   = cumulative[a.id]?.mandays || 0
      const mdTarget = getTarget(a.id, 'mandays')
      const mdPct    = calcAchievementPct(mdDone, mdTarget)
      lines.push(`Mandays     : ${fmt(mdDone)} / ${fmt(mdTarget)} (${mdPct}%)`)
    }
    if (['cap','ssp','cyber_crime'].includes(a.id)) {
      const parts = cumulative[a.id]?.participants_covered || 0
      if (parts > 0) lines.push(`Participants: ${fmt(parts)}`)
    }
    if (a.id === 'bfrc') {
      lines.push(`Completed: ${cumulative['bfrc']?.completed||0}  Pending: ${cumulative['bfrc']?.pending||0}  Undergoing: ${cumulative['bfrc']?.undergoing||0}  Exempted: ${cumulative['bfrc']?.exempted||0}`)
    }
    lines.push(``)
  })

  lines.push(DLINE)
  lines.push(`*SUMMARY*`)
  lines.push(DLINE)
  lines.push(`Target Met   : *${metCount}* activities`)
  lines.push(`On Track     : *${onTrack}* activities`)
  lines.push(`In Progress  : *${inProgress}* activities`)
  lines.push(`Below Target : *${below}* activities`)
  lines.push(``)
  lines.push(LINE)
  lines.push(`_NDRF Training MIS — ${getCurrentDateStr()}_`)

  return lines.join('\n')
}

// ── Monthly summary ────────────────────────────────────────────────────────
export function generateMonthlyReport({ allEntries, targets, financialYear, month, monthName }) {

  function getTarget(id, key) {
    return targets?.[id]?.[key]
      ?? ACTIVITIES.find(a => a.id === id)?.targets.find(t => t.key === key)?.defaultValue
      ?? 0
  }

  const monthEntries = month ? filterByMonth(allEntries, month) : allEntries
  const cumul        = aggregateEntries(monthEntries)
  const label        = month ? `${monthName} — ${financialYear}` : `Full Year — ${financialYear}`

  const rows = ACTIVITIES.map(a => {
    const target      = getTarget(a.id, a.achievementKey)
    const achievement = cumul[a.id]?.[a.achievementKey] || 0
    const pct         = calcAchievementPct(achievement, target)
    return { a, target, achievement, pct }
  }).filter(r => r.achievement > 0)

  const lines = [
    `*NDRF TRAINING BRANCH*`,
    `*Monthly Report — ${label}*`,
    ``,
    DLINE,
    ``,
  ]

  rows.forEach(({ a, target, achievement, pct }) => {
    lines.push(`*${a.name}*`)
    lines.push(`${fmt(achievement)} / ${fmt(target)}  (${pct}%)  ${progressBar(pct, 8)}`)
    lines.push(``)
  })

  lines.push(LINE)
  lines.push(`_NDRF Training MIS — ${getCurrentDateStr()}_`)

  return lines.join('\n')
}
