import { calcAchievementPct, calcBalance } from '../utils/calculations'

function getAccentClass(pct) {
  if (pct >= 100) return 'met'
  if (pct >= 75)  return 'on-track'
  if (pct >= 50)  return 'in-progress'
  return 'below'
}

function getBarClass(pct) {
  if (pct >= 100) return 'p-green'
  if (pct >= 75)  return 'p-blue'
  if (pct >= 50)  return 'p-amber'
  return 'p-red'
}

function getBadge(pct) {
  if (pct >= 100) return { text: 'Target Met',   cls: 'badge-green' }
  if (pct >= 75)  return { text: 'On Track',     cls: 'badge-blue'  }
  if (pct >= 50)  return { text: 'In Progress',  cls: 'badge-amber' }
  return             { text: 'Below Target', cls: 'badge-red'   }
}

function getCumulativeLabel(activity) {
  const labels = {
    online_validation: 'Tests Completed Till Today',
    sdrf_training:     'Personnel Trained Till Today',
    inter_agency:      'Personnel Trained Till Today',
    cap:               'Programmes Conducted Till Today',
    ssp:               'Programmes Conducted Till Today',
    cyber_crime:       'Programmes Conducted Till Today',
    boatmen_training:  'Boatmen Trained Till Today',
    railway_disaster:  'Qualified Personnel (Current Total)',
    railway_mock:      'Exercises Conducted Till Today',
    district_mock:     'Exercises Conducted Till Today',
    ropeway_mock:      'Exercises Conducted Till Today',
    innovations:       'Innovations Submitted Till Today',
    igot:              '% of Personnel Registered on iGOT (Current)',
    ncc_training:      'Personnel Trained Till Today',
    nss_training:      'Personnel Trained Till Today',
    bfrc:              '% of Personnel BFRC Completed (Current)',
    cyber_crime:       '% of Posted Personnel Covered (Current)',
  }
  return labels[activity.id] || 'Total Achievement Till Today'
}

export default function ActivityCard({ activity, formData, onChange, cumulative, targets, onTargetChange }) {
  const achievementKey = activity.achievementKey
  const mainTarget     = targets?.[achievementKey] ?? activity.targets.find(t => t.key === achievementKey)?.defaultValue ?? 0
  const dbCumulative   = cumulative?.[achievementKey] || 0
  const isPercentage   = !!activity.isPercentage
  const tillTodayRaw   = formData?.__cumulative_override?.[achievementKey]
  const hasTillToday   = tillTodayRaw !== undefined && tillTodayRaw !== ''
  const effectiveCumul = hasTillToday ? (Number(tillTodayRaw) || 0) : dbCumulative
  const todayVal       = isNaN(Number(formData?.[achievementKey])) ? 0 : Number(formData?.[achievementKey] || 0)
  const totalAch       = hasTillToday ? effectiveCumul : effectiveCumul + todayVal

  // For percentage activities: totalAch IS the percentage (0–100), target is always 100
  const pctTarget      = isPercentage ? 100 : mainTarget
  const balance        = calcBalance(totalAch, pctTarget)
  const pct            = isPercentage ? Math.min(totalAch, 100) : calcAchievementPct(totalAch, mainTarget)
  const badge          = getBadge(pct)
  const barClass       = getBarClass(pct)
  const barWidth       = Math.min(pct, 100)

  function handleChange(key, value) {
    const next = { ...formData, [key]: value }
    if (activity.id === 'online_validation') {
      const eligible  = Number(next.eligible_personnel) || 0
      const completed = Number(next.completed_today)    || 0
      next.pending = Math.max(0, eligible - completed)
    }
    onChange(next)
  }

  function handleCumulativeOverride(value) {
    onChange({
      ...formData,
      __cumulative_override: {
        ...(formData?.__cumulative_override || {}),
        [achievementKey]: value,
      }
    })
  }

  return (
    <div className={`activity-card ${getAccentClass(pct)}`}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <h3 className="card-title">{activity.name}</h3>
        <span className={`badge ${badge.cls}`}>{badge.text}</span>
      </div>

      {/* ── Progress ── */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span className="label-caps">Progress</span>
          <span style={{ fontFamily: "'Public Sans', sans-serif", fontSize: '0.8125rem', fontWeight: 700, color: 'var(--c-primary)' }}>{pct}%</span>
        </div>
        <div className="prog-wrap">
          <div className={`prog-fill ${barClass}`} style={{ width: `${barWidth}%` }} />
        </div>
      </div>

      {/* ── Stat grid ── */}
      <div className="stat-grid">
        <div className="stat-cell s-target">
          <div className="stat-label">Target</div>
          <div className="stat-value">{isPercentage ? '100%' : mainTarget.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-cell s-cumul">
          <div className="stat-label">{isPercentage ? 'Achieved' : 'Cumul.'}</div>
          <div className="stat-value">
            {isPercentage ? `${totalAch}%` : effectiveCumul.toLocaleString('en-IN')}
            {!isPercentage && hasTillToday && <sup style={{ fontSize: 7, marginLeft: 1 }}>*</sup>}
          </div>
        </div>
        <div className="stat-cell s-balance">
          <div className="stat-label">Balance</div>
          <div className={`stat-value ${balance <= 0 ? 'surplus' : ''}`}>
            {balance <= 0
              ? `+${Math.abs(balance)}${isPercentage ? '%' : ''}`
              : `${balance}${isPercentage ? '%' : ''}`}
          </div>
        </div>
        <div className="stat-cell s-pct">
          <div className="stat-label">Status</div>
          <div className="stat-value">{pct}%</div>
        </div>
      </div>

      {/* ── Till today override ── */}
      <div className={`till-today-box${hasTillToday ? ' active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="label-caps">{getCumulativeLabel(activity)}</span>
          {hasTillToday && (
            <button onClick={() => handleCumulativeOverride('')} style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: 'var(--c-secondary)',
              background: 'none', border: '1px solid var(--c-border)', borderRadius: 4,
              padding: '2px 8px', cursor: 'pointer',
            }}>Clear</button>
          )}
        </div>
        <input
          type="number"
          inputMode="numeric"
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontFamily: "'Public Sans', sans-serif",
            fontSize: hasTillToday ? '1.5rem' : '0.9375rem',
            fontWeight: 700,
            color: hasTillToday ? 'var(--c-primary)' : 'var(--c-secondary)',
            letterSpacing: '-0.02em', padding: 0,
          }}
          placeholder={
            isPercentage
              ? 'Enter current % (0–100)…'
              : dbCumulative > 0 ? `${dbCumulative.toLocaleString('en-IN')} (from records)` : 'Enter total count till today…'
          }
          value={tillTodayRaw ?? ''}
          min={0}
          max={isPercentage ? 100 : undefined}
          onChange={e => handleCumulativeOverride(e.target.value === '' ? '' : e.target.value)}
        />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, color: 'var(--c-secondary)', marginTop: 6, letterSpacing: '0.03em' }}>
          {hasTillToday
            ? `Overrides auto-calculated total · balance = ${balance <= 0 ? '+' + Math.abs(balance) + ' surplus' : balance + ' remaining'}`
            : 'Leave blank to use auto-calculated total from daily records'}
        </div>
      </div>

      {/* ── Editable target ── */}
      {activity.editableTarget && (
        <div className="editable-callout">
          <div className="editable-callout-label">Edit Annual Target — {activity.targets[0].label}</div>
          <input
            type="number"
            className="field-input editable-target"
            value={mainTarget}
            onChange={e => onTargetChange && onTargetChange(achievementKey, Number(e.target.value))}
            min={0} inputMode="numeric"
          />
        </div>
      )}

      {/* ── Multi-target pills ── */}
      {activity.targets.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          {activity.targets.map(t => (
            <span key={t.key} className="target-pill">
              {t.label}: {(targets?.[t.key] ?? t.defaultValue).toLocaleString('en-IN')}
            </span>
          ))}
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ borderTop: '1px solid var(--c-border)', margin: '16px 0 14px' }}>
        <span className="label-caps" style={{ display: 'inline-block', marginTop: 12 }}>Today's Entry</span>
      </div>

      {/* ── Fields ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activity.fields.map(field => {
          if (field.computed) return (
            <div key={field.key}>
              <label className="field-label">{field.label}</label>
              <div className="field-input computed">{formData?.[field.key] ?? 0}</div>
            </div>
          )
          if (field.type === 'boolean') return (
            <div key={field.key}>
              <label className="field-label">{field.label}</label>
              <select
                className="field-input"
                value={formData?.[field.key] === true ? 'yes' : formData?.[field.key] === false ? 'no' : ''}
                onChange={e => handleChange(field.key, e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
              >
                <option value="">— Select —</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          )
          if (field.type === 'text') return (
            <div key={field.key}>
              <label className="field-label">{field.label}</label>
              <input type="text" className="field-input"
                placeholder={`Enter ${field.label.toLowerCase()}…`}
                value={formData?.[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)} />
            </div>
          )
          // For percentage activities, the achievement key field shows a % input
          const isAchievementField = isPercentage && field.key === achievementKey
          return (
            <div key={field.key}>
              <label className="field-label">
                {field.label}
                {isAchievementField && (
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--c-secondary)', fontSize: '0.75rem' }}>
                    {' '}(enter 0–100)
                  </span>
                )}
              </label>
              <div style={{ position: 'relative' }}>
                <input type="number" inputMode="numeric" className="field-input"
                  placeholder={isAchievementField ? '0–100' : '0'}
                  value={formData?.[field.key] === 0 ? '' : formData?.[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
                  min={0}
                  max={isAchievementField ? 100 : undefined}
                  style={isAchievementField ? { paddingRight: 32 } : {}}
                />
                {isAchievementField && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700,
                    color: 'var(--c-secondary)', pointerEvents: 'none',
                  }}>%</span>
                )}
              </div>
            </div>
          )
        })}

        <div>
          <label className="field-label">Remarks <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--c-secondary)', fontSize: '0.75rem' }}>(optional)</span></label>
          <textarea className="field-input" rows={2}
            placeholder="Add any notes or observations…"
            value={formData?.remarks || ''}
            onChange={e => handleChange('remarks', e.target.value)}
            style={{ resize: 'none', lineHeight: 1.5 }} />
        </div>
      </div>
    </div>
  )
}
