import { useState, useEffect, useCallback } from 'react'
import ActivityCard from '../components/ActivityCard'
import { ACTIVITIES, FINANCIAL_YEARS } from '../lib/constants'
import {
  supabase, fetchCumulativeAchievements, saveDailyEntries,
  queueOfflineEntry, syncOfflineQueue, getCurrentFY
} from '../lib/supabase'
import { aggregateEntries } from '../utils/calculations'

const TODAY = new Date().toISOString().split('T')[0]

export default function DataEntry() {
  const [entryDate,     setEntryDate]     = useState(TODAY)
  const [financialYear, setFinancialYear] = useState(getCurrentFY())
  const [formData,      setFormData]      = useState({})
  const [targets,       setTargets]       = useState({})
  const [cumulative,    setCumulative]    = useState({})
  const [saving,        setSaving]        = useState(false)
  const [toast,         setToast]         = useState(null)
  const [isOnline,      setIsOnline]      = useState(navigator.onLine)

  const loadCumulative = useCallback(async () => {
    try {
      const entries = await fetchCumulativeAchievements(financialYear)
      const past    = entries.filter(e => e.entry_date !== entryDate)
      setCumulative(aggregateEntries(past))
    } catch { /* offline */ }
  }, [financialYear, entryDate])

  const loadTargets = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('annual_targets')
        .select('*')
        .eq('financial_year', financialYear)
      if (data) {
        const t = {}
        for (const row of data) {
          if (!t[row.activity_id]) t[row.activity_id] = {}
          t[row.activity_id][row.target_key] = row.target_value
        }
        setTargets(t)
      }
    } catch { /* offline */ }
  }, [financialYear])

  useEffect(() => { loadCumulative(); loadTargets() }, [loadCumulative, loadTargets])

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true)
      const n = await syncOfflineQueue()
      if (n > 0) showToast(`✅ Synced ${n} offline entries`, 'success')
      loadCumulative()
    }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [loadCumulative])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  function getTarget(activity, fieldKey) {
    return targets?.[activity.id]?.[fieldKey]
      ?? activity.targets.find(t => t.key === fieldKey)?.defaultValue
      ?? 0
  }

  function handleTargetChange(activityId, fieldKey, value) {
    setTargets(prev => ({ ...prev, [activityId]: { ...(prev[activityId] || {}), [fieldKey]: value } }))
    supabase.from('annual_targets').upsert({
      activity_id: activityId, target_key: fieldKey,
      target_value: value, financial_year: financialYear
    }).then(() => {})
  }

  async function handleSubmit() {
    const entries = Object.entries(formData).filter(([, d]) => {
      // Has any meaningful field besides internal keys
      return Object.entries(d).some(([k, v]) =>
        k !== 'remarks' && k !== '__cumulative_override' &&
        v !== '' && v !== null && v !== undefined && v !== 0
      ) || (d.__cumulative_override && Object.values(d.__cumulative_override).some(v => v !== '' && v !== undefined))
    }).map(([activityId, data]) => {
      const { __cumulative_override, ...dailyData } = data
      return {
        entry_date: entryDate, financial_year: financialYear,
        activity_id: activityId,
        data: dailyData,
        cumulative_override: __cumulative_override || null,
        remarks: data.remarks || null,
        created_at: new Date().toISOString()
      }
    })

    if (!entries.length) { showToast('Fill in at least one activity field', 'warn'); return }

    setSaving(true)
    try {
      if (isOnline) {
        await saveDailyEntries(entries)
        showToast(`Report submitted — ${entries.length} activit${entries.length === 1 ? 'y' : 'ies'} saved`, 'success')
      } else {
        entries.forEach(queueOfflineEntry)
        showToast('Saved offline — will sync when connected', 'info')
      }
      setFormData({})
      loadCumulative()
    } catch {
      entries.forEach(queueOfflineEntry)
      showToast('Queued offline — will retry automatically', 'warn')
    } finally {
      setSaving(false)
    }
  }

  const toastColors = {
    success: { background: 'var(--c-primary)', color: '#fff', borderColor: 'var(--c-primary)' },
    warn:    { background: '#FAF6F0',           color: 'var(--c-primary)', borderColor: 'var(--c-border-dark)' },
    info:    { background: 'var(--c-primary)', color: '#fff', borderColor: 'var(--c-primary)' },
    error:   { background: 'var(--c-tertiary)', color: '#fff', borderColor: 'var(--c-tertiary)' },
  }

  return (
    <div>
      {!isOnline && (
        <div className="offline-banner">Offline — data will sync when reconnected</div>
      )}

      {toast && (
        <div className="toast" style={toastColors[toast.type]}>{toast.msg}</div>
      )}

      <div className="page-wrap">

        {/* ── Date / FY card ── */}
        <div className="date-card">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
            Daily Report Entry
          </div>
          <div style={{ fontFamily: "'Public Sans', sans-serif", fontSize: '1.375rem', fontWeight: 700, color: '#fff', marginBottom: 16, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {new Date(entryDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">Entry Date</label>
              <input type="date" className="field-input" value={entryDate} max={TODAY}
                onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Financial Year</label>
              <select className="field-input" value={financialYear}
                onChange={e => setFinancialYear(e.target.value)}>
                {FINANCIAL_YEARS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Activity cards ── */}
        <div className="section-label">Activities — {ACTIVITIES.length} Total</div>

        {ACTIVITIES.map(activity => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            formData={formData[activity.id] || {}}
            onChange={data => setFormData(prev => ({ ...prev, [activity.id]: data }))}
            cumulative={cumulative[activity.id] || {}}
            targets={activity.targets.reduce((acc, t) => { acc[t.key] = getTarget(activity, t.key); return acc }, {})}
            onTargetChange={(fk, val) => handleTargetChange(activity.id, fk, val)}
          />
        ))}

        <div style={{ height: 100 }} />
      </div>

      {/* ── Sticky submit bar ── */}
      <div className="submit-bar">
        <button className="btn-submit" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Submitting…' : 'Submit Daily Report'}
        </button>
        <div style={{ textAlign: 'center', marginTop: 8, fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--c-secondary)' }}>
          <span style={{ color: isOnline ? 'var(--prog-good)' : 'var(--prog-low)' }}>
            {isOnline ? '● Online' : '● Offline'}
          </span>
          {' · '}{entryDate}{' · '}{financialYear}
        </div>
      </div>
    </div>
  )
}
