import { useState, useEffect, useCallback } from 'react'
import { ACTIVITIES, FINANCIAL_YEARS, MONTHS } from '../lib/constants'
import { supabase, fetchCumulativeAchievements, deleteDailyEntry, getCurrentFY } from '../lib/supabase'
import {
  aggregateEntries, calcAchievementPct, calcBalance,
  filterByMonth, filterByActivity
} from '../utils/calculations'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ShareModal from '../components/ShareModal'
import CalendarWidget from '../components/CalendarWidget'
import { fetchCalendarEntries, deleteCalendarEntry, getStatus, statusStyle, formatDate } from '../lib/calendar'

function getBarFill(pct) {
  if (pct >= 100) return 'var(--prog-done)'
  if (pct >= 75)  return 'var(--prog-good)'
  if (pct >= 50)  return 'var(--prog-mid)'
  return 'var(--prog-low)'
}

function BadgeCell({ pct }) {
  const color = pct >= 100 ? 'var(--prog-done)' : pct >= 75 ? 'var(--prog-good)' : pct >= 50 ? 'var(--prog-mid)' : 'var(--prog-low)'
  const text  = pct >= 100 ? 'Met' : pct >= 75 ? 'On Track' : pct >= 50 ? 'In Progress' : 'Below'
  return <span style={{ color, fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', border: '1px solid var(--c-border-dark)', padding: '2px 7px', borderRadius: 4 }}>{text}</span>
}

export default function Dashboard() {
  const [financialYear,    setFinancialYear]    = useState(getCurrentFY())
  const [selectedMonth,    setSelectedMonth]    = useState('')
  const [selectedActivity, setSelectedActivity] = useState('')
  const [allEntries,       setAllEntries]       = useState([])
  const [targets,          setTargets]          = useState({})
  const [loading,          setLoading]          = useState(true)
  const [showShare,        setShowShare]        = useState(false)
  const [calEntries,       setCalEntries]       = useState([])
  const [calFilter,        setCalFilter]        = useState({ month: '', institution: '', from: '', to: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const entries = await fetchCumulativeAchievements(financialYear)
      setAllEntries(entries)
      const { data: td } = await supabase.from('annual_targets').select('*').eq('financial_year', financialYear)
      if (td) {
        const t = {}
        for (const row of td) {
          if (!t[row.activity_id]) t[row.activity_id] = {}
          t[row.activity_id][row.target_key] = row.target_value
        }
        setTargets(t)
      }
    } catch { /* offline */ }
    setLoading(false)
  }, [financialYear])

  useEffect(() => { loadData() }, [loadData])

  // Load calendar entries
  useEffect(() => {
    fetchCalendarEntries().then(setCalEntries).catch(() => {})
  }, [])

  async function handleDeleteCalEntry(id) {
    try {
      await deleteCalendarEntry(id)
      setCalEntries(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  async function handleDeleteDailyEntry(id) {
    try {
      await deleteDailyEntry(id)
      setAllEntries(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      console.error('Delete daily entry failed', e)
    }
  }

  function getTarget(activityId, fieldKey) {
    return targets?.[activityId]?.[fieldKey]
      ?? ACTIVITIES.find(a => a.id === activityId)?.targets.find(t => t.key === fieldKey)?.defaultValue
      ?? 0
  }

  const filteredEntries = (() => {
    let e = allEntries
    if (selectedMonth)    e = filterByMonth(e, Number(selectedMonth))
    if (selectedActivity) e = filterByActivity(e, selectedActivity)
    return e
  })()

  const cumul = aggregateEntries(filteredEntries)

  const tableRows = ACTIVITIES.map(a => {
    const target      = getTarget(a.id, a.achievementKey)
    const achievement = cumul[a.id]?.[a.achievementKey] || 0
    const balance     = calcBalance(achievement, target)
    const pct         = calcAchievementPct(achievement, target)
    return { activity: a, target, achievement, balance, pct }
  })

  // KPI values
  const totalPersonnel =
    (cumul['sdrf_training']?.personnel_trained    || 0) +
    (cumul['inter_agency']?.personnel_trained     || 0) +
    (cumul['boatmen_training']?.personnel_trained || 0) +
    (cumul['ncc_training']?.personnel_trained     || 0) +
    (cumul['nss_training']?.personnel_trained     || 0)

  const totalMandays =
    (cumul['sdrf_training']?.mandays || 0) +
    (cumul['inter_agency']?.mandays  || 0)

  const totalMock =
    (cumul['railway_mock']?.conducted  || 0) +
    (cumul['district_mock']?.conducted || 0) +
    (cumul['ropeway_mock']?.conducted  || 0)

  const kpis = [
    { label: 'Personnel Trained',  value: totalPersonnel },
    { label: 'Mandays Generated',  value: totalMandays },
    { label: 'CAP Conducted',      value: cumul['cap']?.programmes_conducted || 0 },
    { label: 'SSP Conducted',      value: cumul['ssp']?.programmes_conducted || 0 },
    { label: 'Mock Exercises',     value: totalMock },
    { label: 'Innovations',        value: cumul['innovations']?.count || 0 },
    { label: 'BFRC Pending',       value: cumul['bfrc']?.pending || 0 },
    { label: 'Validation Pending', value: Math.max(0, getTarget('online_validation', 'completed_today') - (cumul['online_validation']?.completed_today || 0)) },
  ]

  // Monthly summary
  const monthlySummary = MONTHS.map((name, idx) => {
    const me   = filterByMonth(allEntries, idx + 1)
    const mc   = aggregateEntries(me)
    return {
      name,
      personnel: (mc['sdrf_training']?.personnel_trained || 0) + (mc['inter_agency']?.personnel_trained || 0) + (mc['boatmen_training']?.personnel_trained || 0),
      mandays:   (mc['sdrf_training']?.mandays || 0) + (mc['inter_agency']?.mandays || 0),
      cap:       mc['cap']?.programmes_conducted || 0,
      ssp:       mc['ssp']?.programmes_conducted || 0,
      hasData:   me.length > 0,
    }
  })

  // ── Exports ──
  function exportExcel() {
    const rows = tableRows.map(r => ({
      Activity: r.activity.name,
      Target: r.target,
      Achievement: r.achievement,
      Balance: r.balance <= 0 ? `+${Math.abs(r.balance)} Surplus` : r.balance,
      'Achievement %': `${r.pct}%`,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Target Achievement')
    const ms = XLSX.utils.json_to_sheet(monthlySummary.map(m => ({ Month: m.name, Personnel: m.personnel, Mandays: m.mandays, CAP: m.cap, SSP: m.ssp })))
    XLSX.utils.book_append_sheet(wb, ms, 'Monthly Summary')
    XLSX.writeFile(wb, `NDRF_Training_${financialYear}_${TODAY()}.xlsx`)
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(15); doc.setTextColor(0, 32, 96)
    doc.text('NDRF Training Branch — Annual Target Achievement Report', 14, 16)
    doc.setFontSize(9); doc.setTextColor(100)
    doc.text(`Financial Year: ${financialYear}   Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 23)
    autoTable(doc, {
      startY: 28,
      head: [['Activity', 'Target', 'Achievement', 'Balance', 'Achvmt %']],
      body: tableRows.map(r => [
        r.activity.name, r.target, r.achievement,
        r.balance <= 0 ? `+${Math.abs(r.balance)} Surplus` : r.balance,
        `${r.pct}%`
      ]),
      headStyles: { fillColor: [0, 32, 96], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [238, 242, 255] },
    })
    // ── Page 2: Training Calendar Commitments ──
    doc.addPage()
    doc.setFontSize(12); doc.setTextColor(0, 32, 96)
    doc.text('Training Calendar — Commitments', 14, 16)
    doc.setFontSize(9); doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22)

    // Sort: Ongoing → Upcoming → Completed
    const ORDER = { Ongoing: 0, Upcoming: 1, Completed: 2 }
    const calRows = [...calEntries].sort((a, b) => {
      const sa = getStatus(a.from_date, a.to_date)
      const sb = getStatus(b.from_date, b.to_date)
      if (ORDER[sa] !== ORDER[sb]) return ORDER[sa] - ORDER[sb]
      return a.from_date.localeCompare(b.from_date)
    })

    if (calRows.length === 0) {
      doc.setFontSize(10); doc.setTextColor(120)
      doc.text('No training commitments recorded.', 14, 32)
    } else {
      autoTable(doc, {
        startY: 27,
        head: [['Course / Activity', 'Institution', 'From', 'To', 'Personnel', 'Status', 'Remarks']],
        body: calRows.map(e => [
          e.activity_name || '',
          e.institution || '—',
          formatDate(e.from_date),
          formatDate(e.to_date),
          e.nominated_personnel || '—',
          getStatus(e.from_date, e.to_date),
          e.remarks || '',
        ]),
        headStyles: { fillColor: [0, 32, 96], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [238, 242, 255] },
        columnStyles: { 6: { cellWidth: 60 } },
      })
    }
    doc.save(`NDRF_Training_${financialYear}.pdf`)
  }

  function TODAY() { return new Date().toISOString().split('T')[0] }

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, maxWidth: 680, margin: '0 auto' }}>
          {[
            { label: 'Financial Year', value: financialYear, onChange: setFinancialYear,
              options: FINANCIAL_YEARS.map(fy => ({ value: fy, label: fy })) },
            { label: 'Month', value: selectedMonth, onChange: setSelectedMonth,
              options: [{ value: '', label: 'All Months' }, ...MONTHS.map((m, i) => ({ value: i + 1, label: m }))] },
            { label: 'Activity', value: selectedActivity, onChange: setSelectedActivity,
              options: [{ value: '', label: 'All Activities' }, ...ACTIVITIES.map(a => ({ value: a.id, label: a.name }))] },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{f.label}</div>
              <select className="field-input" style={{ padding: '7px 10px', fontSize: 12 }}
                value={f.value} onChange={e => f.onChange(e.target.value)}>
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 16px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40, marginBottom: 16, animation: 'pulse 1.5s ease infinite' }}>📊</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Loading dashboard…</div>
          </div>
        ) : (
          <>
            {/* ── KPI grid ── */}
            <div className="section-label">Overview · {financialYear}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 1, background: 'var(--c-border)', border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 28 }}>
              {kpis.map(k => (
                <div key={k.label} style={{ background: 'var(--c-white)', padding: '16px' }}>
                  <div className="kpi-value">{k.value.toLocaleString('en-IN')}</div>
                  <div className="kpi-label" style={{ marginTop: 6 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* ── Export / Share row ── */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button onClick={() => setShowShare(true)} className="btn-secondary">
                <WaIcon /> Share Report
              </button>
              <button className="btn-secondary" onClick={exportExcel}>Excel</button>
              <button className="btn-secondary" onClick={exportPDF}>PDF</button>
              <button className="btn-secondary" onClick={loadData} style={{ marginLeft: 'auto' }}>Refresh</button>
            </div>

            {/* ── Achievement table ── */}
            <div className="section-label">Target Achievement</div>
            <div style={{ background: 'var(--c-white)', borderRadius: 'var(--r-md)', border: '1px solid var(--c-border)', overflow: 'hidden', marginBottom: 28 }}>
              {/* Mobile list */}
              <div style={{ display: 'block' }} className="sm:hidden">
                {tableRows.map(({ activity, target, achievement, balance, pct }) => (
                  <div key={activity.id} style={{ borderBottom: '1px solid var(--c-border)', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-primary)' }}>{activity.name}</span>
                      <BadgeCell pct={pct} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--c-border)', border: '1px solid var(--c-border)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                      {[
                        { l: 'Target',  v: target },
                        { l: 'Done',    v: achievement },
                        { l: 'Balance', v: balance <= 0 ? `+${Math.abs(balance)}` : balance },
                        { l: 'Ach%',    v: `${pct}%` },
                      ].map(s => (
                        <div key={s.l} style={{ background: 'var(--c-neutral)', padding: '6px 4px', textAlign: 'center' }}>
                          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--c-secondary)', marginBottom: 2 }}>{s.l}</div>
                          <div style={{ fontFamily: "'Public Sans', sans-serif", fontSize: 13, fontWeight: 700, color: 'var(--c-primary)' }}>{typeof s.v === 'number' ? s.v.toLocaleString('en-IN') : s.v}</div>
                        </div>
                      ))}
                    </div>
                    <div className="prog-wrap" style={{ marginBottom: 0 }}>
                      <div className="prog-fill" style={{ width: `${Math.min(pct, 100)}%`, background: getBarFill(pct) }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block" style={{ overflowX: 'auto' }}>
                <table className="ach-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Activity</th>
                      <th>Target</th>
                      <th>Achievement</th>
                      <th>Balance</th>
                      <th>Ach%</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(({ activity, target, achievement, balance, pct }) => (
                      <tr key={activity.id}>
                        <td style={{ fontWeight: 600, textAlign: 'left', color: 'var(--c-primary)' }}>{activity.name}</td>
                        <td style={{ fontWeight: 600, color: 'var(--c-primary)' }}>{target.toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{achievement.toLocaleString('en-IN')}</td>
                        <td style={{ fontWeight: 600, color: balance <= 0 ? 'var(--prog-good)' : 'var(--c-secondary)' }}>
                          {balance <= 0 ? `+${Math.abs(balance).toLocaleString('en-IN')}` : balance.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{pct}%</span>
                            <div className="mini-bar"><div className="mini-fill" style={{ width: `${Math.min(pct, 100)}%`, background: getBarFill(pct) }} /></div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}><BadgeCell pct={pct} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Training Calendar ── */}
            <TrainingCalendarSection
              calEntries={calEntries}
              calFilter={calFilter}
              setCalFilter={setCalFilter}
              onDelete={handleDeleteCalEntry}
            />

            {/* ── Daily summary ── */}
            <DailySummary entries={allEntries} />

            {/* ── Manage Entries ── */}
            <ManageEntries entries={allEntries} onDelete={handleDeleteDailyEntry} />
          </>
        )}
      </div>

      {/* ── WhatsApp Share Modal ── */}
      {showShare && (
        <ShareModal
          onClose={() => setShowShare(false)}
          cumulative={cumul}
          targets={targets}
          financialYear={financialYear}
          allEntries={allEntries}
          entryDate={new Date().toISOString().split('T')[0]}
        />
      )}
    </div>
  )
}

function WaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
      <path d="M16 3C8.82 3 3 8.82 3 16c0 2.39.63 4.64 1.73 6.6L3 29l6.54-1.72A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3z" fill="currentColor" opacity="0.3"/>
      <path d="M22.5 19.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.19-.57-.34z" fill="currentColor"/>
    </svg>
  )
}

function DailySummary({ entries }) {
  const byDate = {}
  for (const e of entries) {
    if (!byDate[e.entry_date]) byDate[e.entry_date] = []
    byDate[e.entry_date].push(e)
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, 10)
  if (!dates.length) return null

  return (
    <>
      <div className="section-label">Daily Report Log</div>
      <div style={{ background: 'var(--c-white)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: 28 }}>
        {dates.map((date, i) => {
          const agg  = aggregateEntries(byDate[date])
          const pers = (agg['sdrf_training']?.personnel_trained || 0) + (agg['inter_agency']?.personnel_trained || 0) + (agg['boatmen_training']?.personnel_trained || 0)
          const cap  = agg['cap']?.programmes_conducted || 0
          const ssp  = agg['ssp']?.programmes_conducted || 0
          const acts = byDate[date].length

          return (
            <div key={date} style={{
              padding: '11px 16px',
              borderBottom: i < dates.length - 1 ? '1px solid var(--c-border)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: i % 2 === 0 ? 'var(--c-white)' : 'var(--c-neutral)',
            }}>
              <div>
                <div style={{ fontFamily: "'Public Sans', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--c-primary)' }}>
                  {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: 'var(--c-secondary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2 }}>
                  {acts} activit{acts === 1 ? 'y' : 'ies'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {pers > 0 && <Chip label="Personnel" value={pers} />}
                {cap  > 0 && <Chip label="CAP"       value={cap}  />}
                {ssp  > 0 && <Chip label="SSP"       value={ssp}  />}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function Chip({ label, value }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: "'Public Sans', sans-serif", fontSize: 14, fontWeight: 700, color: 'var(--c-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 600, color: 'var(--c-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Manage Entries — view & delete individual daily reports ────────────────
function activityName(id) {
  return ACTIVITIES.find(a => a.id === id)?.name || id
}

// Build a readable "field: value" summary from an entry's data + override
function summarizeEntry(entry) {
  const parts = []
  const data = entry.data || {}
  for (const [k, v] of Object.entries(data)) {
    if (v === '' || v === null || v === undefined) continue
    const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    parts.push(`${label}: ${v === true ? 'Yes' : v === false ? 'No' : v}`)
  }
  const override = entry.cumulative_override || {}
  for (const [k, v] of Object.entries(override)) {
    if (v === '' || v === null || v === undefined) continue
    const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    parts.push(`${label} (till date): ${v}`)
  }
  return parts
}

function ManageEntries({ entries, onDelete }) {
  const [filterActivity, setFilterActivity] = useState('')
  const [filterDate,     setFilterDate]     = useState('')
  const [confirmId,      setConfirmId]      = useState(null)
  const [expanded,       setExpanded]       = useState(false)

  let rows = [...entries].sort((a, b) => {
    // newest first by date then created_at
    if (a.entry_date !== b.entry_date) return b.entry_date.localeCompare(a.entry_date)
    return (b.created_at || '').localeCompare(a.created_at || '')
  })
  if (filterActivity) rows = rows.filter(e => e.activity_id === filterActivity)
  if (filterDate)     rows = rows.filter(e => e.entry_date === filterDate)

  const shown = expanded ? rows : rows.slice(0, 8)

  return (
    <>
      <div className="section-label" style={{ marginTop: 28 }}>Manage Entries</div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Activity</div>
          <select className="field-input" style={{ padding:'7px 10px', fontSize:12 }}
            value={filterActivity} onChange={e => setFilterActivity(e.target.value)}>
            <option value="">All Activities</option>
            {ACTIVITIES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Date</div>
          <input type="date" className="field-input" style={{ padding:'7px 10px', fontSize:12 }}
            value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ background:'var(--c-white)', border:'1px solid var(--c-border)', borderRadius:'var(--r-md)', padding:'28px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:600, color:'var(--c-secondary)', letterSpacing:'0.06em', textTransform:'uppercase' }}>No entries</div>
          <div style={{ fontFamily:"'Public Sans',sans-serif", fontSize:13, color:'var(--c-secondary)', marginTop:6 }}>Submit a daily report to see entries here</div>
        </div>
      ) : (
        <>
          <div style={{ background:'var(--c-white)', border:'1px solid var(--c-border)', borderRadius:'var(--r-md)', overflow:'hidden' }}>
            {shown.map((entry, i) => {
              const summary = summarizeEntry(entry)
              const isConfirming = confirmId === entry.id
              return (
                <div key={entry.id} style={{
                  padding:'12px 14px',
                  borderBottom: i < shown.length - 1 ? '1px solid var(--c-border)' : 'none',
                  background: i % 2 === 0 ? 'var(--c-white)' : 'var(--c-neutral)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontFamily:"'Public Sans',sans-serif", fontWeight:700, fontSize:13, color:'var(--c-primary)' }}>{activityName(entry.activity_id)}</span>
                        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', letterSpacing:'0.04em', textTransform:'uppercase', border:'1px solid var(--c-border)', borderRadius:4, padding:'1px 6px' }}>{formatDate(entry.entry_date)}</span>
                      </div>
                      <div style={{ fontFamily:"'Public Sans',sans-serif", fontSize:12, color:'var(--c-secondary)', lineHeight:1.5 }}>
                        {summary.length ? summary.join('  ·  ') : <em>No values</em>}
                      </div>
                      {entry.remarks && (
                        <div style={{ fontFamily:"'Public Sans',sans-serif", fontSize:11, color:'var(--c-secondary)', marginTop:3, fontStyle:'italic' }}>“{entry.remarks}”</div>
                      )}
                    </div>

                    {/* Delete */}
                    {!isConfirming ? (
                      <button onClick={() => setConfirmId(entry.id)} style={{
                        fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:600,
                        letterSpacing:'0.04em', textTransform:'uppercase',
                        color:'var(--c-tertiary)', background:'none',
                        border:'1px solid var(--c-border)', borderRadius:'var(--r-sm)',
                        padding:'4px 10px', cursor:'pointer', flexShrink:0,
                      }}>Delete</button>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        <button onClick={() => { onDelete(entry.id); setConfirmId(null) }} style={{
                          fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:700,
                          background:'var(--c-tertiary)', color:'#fff',
                          border:'none', borderRadius:'var(--r-sm)', padding:'4px 10px', cursor:'pointer',
                        }}>Yes</button>
                        <button onClick={() => setConfirmId(null)} style={{
                          fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:600,
                          background:'var(--c-neutral)', color:'var(--c-secondary)',
                          border:'1px solid var(--c-border)', borderRadius:'var(--r-sm)', padding:'4px 10px', cursor:'pointer',
                        }}>No</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {rows.length > 8 && (
            <button onClick={() => setExpanded(x => !x)} style={{
              marginTop:10, width:'100%',
              fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:600,
              letterSpacing:'0.05em', textTransform:'uppercase',
              color:'var(--c-primary)', background:'var(--c-white)',
              border:'1px solid var(--c-border)', borderRadius:'var(--r-sm)',
              padding:'9px', cursor:'pointer',
            }}>
              {expanded ? 'Show Less' : `Show All ${rows.length} Entries`}
            </button>
          )}
        </>
      )}
    </>
  )
}

// ── Training Calendar Section ──────────────────────────────────────────────
function TrainingCalendarSection({ calEntries, calFilter, setCalFilter, onDelete }) {
  const [confirmId, setConfirmId] = useState(null)

  // Unique institutions for filter
  const institutions = [...new Set(calEntries.map(e => e.institution).filter(Boolean))].sort()

  // Apply filters
  const filtered = calEntries.filter(e => {
    const status = getStatus(e.from_date, e.to_date)
    if (calFilter.month) {
      const m = new Date(e.from_date + 'T00:00:00').getMonth() + 1
      if (String(m) !== calFilter.month) return false
    }
    if (calFilter.institution && e.institution !== calFilter.institution) return false
    if (calFilter.from && e.to_date < calFilter.from) return false
    if (calFilter.to   && e.from_date > calFilter.to) return false
    return true
  })

  // Sort: Ongoing first, then Upcoming, then Completed
  const ORDER = { Ongoing: 0, Upcoming: 1, Completed: 2 }
  const sorted = [...filtered].sort((a, b) => {
    const sa = getStatus(a.from_date, a.to_date)
    const sb = getStatus(b.from_date, b.to_date)
    if (ORDER[sa] !== ORDER[sb]) return ORDER[sa] - ORDER[sb]
    return a.from_date.localeCompare(b.from_date)
  })

  return (
    <>
      {/* Calendar widget */}
      <div className="section-label">Training Calendar</div>
      <div style={{ marginBottom: 28 }}>
        <CalendarWidget entries={calEntries} onDelete={onDelete} />
      </div>

      {/* Upcoming Commitments */}
      <div className="section-label">Upcoming Commitments</div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Month</div>
          <select className="field-input" style={{ padding:'7px 10px', fontSize:12 }}
            value={calFilter.month} onChange={e => setCalFilter(f => ({ ...f, month: e.target.value }))}>
            <option value="">All Months</option>
            {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Institution</div>
          <select className="field-input" style={{ padding:'7px 10px', fontSize:12 }}
            value={calFilter.institution} onChange={e => setCalFilter(f => ({ ...f, institution: e.target.value }))}>
            <option value="">All</option>
            {institutions.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>From</div>
          <input type="date" className="field-input" style={{ padding:'7px 10px', fontSize:12 }}
            value={calFilter.from} onChange={e => setCalFilter(f => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>To</div>
          <input type="date" className="field-input" style={{ padding:'7px 10px', fontSize:12 }}
            value={calFilter.to} onChange={e => setCalFilter(f => ({ ...f, to: e.target.value }))} />
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={{ background:'var(--c-white)', border:'1px solid var(--c-border)', borderRadius:'var(--r-md)', padding:'32px 16px', textAlign:'center' }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:600, color:'var(--c-secondary)', letterSpacing:'0.06em', textTransform:'uppercase' }}>No entries found</div>
          <div style={{ fontFamily:"'Public Sans',sans-serif", fontSize:13, color:'var(--c-secondary)', marginTop:6 }}>Add entries via the Data Entry → Training Calendar section</div>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:28 }}>
            {sorted.map(evt => {
              const st = getStatus(evt.from_date, evt.to_date)
              const ss = statusStyle(st)
              const DOT_COLOR = { Ongoing:'#2D6A4F', Upcoming:'#3730A3', Completed:'#6C7278' }
              const isConfirming = confirmId === evt.id
              return (
                <div key={evt.id} style={{
                  background:'var(--c-white)', border:'1px solid var(--c-border)',
                  borderLeft:`3px solid ${DOT_COLOR[st]}`,
                  borderRadius:'var(--r-md)', padding:'12px 14px',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ fontFamily:"'Public Sans',sans-serif", fontWeight:700, fontSize:14, color:'var(--c-primary)', flex:1 }}>{evt.activity_name}</div>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:9, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:ss.color, background:ss.bg, border:`1px solid ${ss.border}`, borderRadius:'var(--r-sm)', padding:'3px 8px', flexShrink:0, marginLeft:8 }}>{st}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'6px 12px' }}>
                    {[
                      { l:'From', v: formatDate(evt.from_date) },
                      { l:'To',   v: formatDate(evt.to_date) },
                      evt.institution && { l:'Institution', v: evt.institution },
                      evt.nominated_personnel && { l:'Personnel', v: evt.nominated_personnel },
                    ].filter(Boolean).map(r => (
                      <div key={r.l}>
                        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:8, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{r.l}</div>
                        <div style={{ fontFamily:"'Public Sans',sans-serif", fontSize:12, fontWeight:600, color:'var(--c-primary)' }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  {evt.remarks && (
                    <div style={{ fontFamily:"'Public Sans',sans-serif", fontSize:11, color:'var(--c-secondary)', marginTop:6, paddingTop:6, borderTop:'1px solid var(--c-border)', lineHeight:1.4 }}>{evt.remarks}</div>
                  )}
                  {/* Delete */}
                  <div style={{ marginTop:10, paddingTop:8, borderTop:'1px solid var(--c-border)' }}>
                    {!isConfirming ? (
                      <button onClick={() => setConfirmId(evt.id)} style={{
                        fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:600,
                        letterSpacing:'0.04em', textTransform:'uppercase',
                        color:'var(--c-tertiary)', background:'none',
                        border:'1px solid var(--c-border)', borderRadius:'var(--r-sm)',
                        padding:'4px 12px', cursor:'pointer',
                      }}>Delete</button>
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:10, color:'var(--c-secondary)', fontWeight:600 }}>Confirm delete?</span>
                        <button onClick={() => { onDelete(evt.id); setConfirmId(null) }} style={{
                          fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:700,
                          background:'var(--c-tertiary)', color:'#fff',
                          border:'none', borderRadius:'var(--r-sm)', padding:'4px 12px', cursor:'pointer',
                        }}>Yes</button>
                        <button onClick={() => setConfirmId(null)} style={{
                          fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:600,
                          background:'var(--c-neutral)', color:'var(--c-secondary)',
                          border:'1px solid var(--c-border)', borderRadius:'var(--r-sm)', padding:'4px 12px', cursor:'pointer',
                        }}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
