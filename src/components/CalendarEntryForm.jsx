import { useState } from 'react'
import { saveCalendarEntry } from '../lib/calendar'

const TODAY = new Date().toISOString().split('T')[0]

export default function CalendarEntryForm({ onSaved }) {
  const [form, setForm]     = useState({ activity_name:'', from_date:'', to_date:'', institution:'', nominated_personnel:'', remarks:'' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave() {
    if (!form.activity_name.trim()) { showToast('Activity name is required', false); return }
    if (!form.from_date)            { showToast('From date is required', false); return }
    if (!form.to_date)              { showToast('To date is required', false); return }
    if (form.to_date < form.from_date) { showToast('To date must be after From date', false); return }

    setSaving(true)
    try {
      const entry = {
        activity_name:       form.activity_name.trim(),
        from_date:           form.from_date,
        to_date:             form.to_date,
        institution:         form.institution.trim() || null,
        nominated_personnel: form.nominated_personnel.trim() || null,
        remarks:             form.remarks.trim() || null,
      }
      const saved = await saveCalendarEntry(entry)
      showToast(`Saved — ${entry.activity_name}`)
      setForm({ activity_name:'', from_date:'', to_date:'', institution:'', nominated_personnel:'', remarks:'' })
      onSaved && onSaved(saved)
    } catch (e) {
      showToast('Save failed: ' + e.message, false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="activity-card" style={{ borderLeftColor: 'var(--c-primary)' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 className="card-title">Add Training / Course</h3>
      </div>

      {toast && (
        <div style={{
          background: toast.ok ? '#D8F3DC' : '#FFE8E8',
          color: toast.ok ? '#2D6A4F' : '#B8422E',
          border: `1px solid ${toast.ok ? '#B7E4C7' : '#F5C6C6'}`,
          borderRadius: 'var(--r-sm)',
          padding: '9px 14px',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12, fontWeight: 600,
          marginBottom: 14,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Course / Activity Name — free text, no chips */}
        <div>
          <label className="field-label">Course / Activity Name</label>
          <input
            type="text"
            className="field-input"
            placeholder="Enter course or activity name…"
            value={form.activity_name}
            onChange={e => set('activity_name', e.target.value)}
          />
        </div>

        {/* From / To dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="field-label">From Date</label>
            <input
              type="date"
              className="field-input"
              value={form.from_date}
              onChange={e => set('from_date', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">To Date</label>
            <input
              type="date"
              className="field-input"
              value={form.to_date}
              min={form.from_date || TODAY}
              onChange={e => set('to_date', e.target.value)}
            />
          </div>
        </div>

        {/* Institution — plain text, no datalist */}
        <div>
          <label className="field-label">Institution</label>
          <input
            type="text"
            className="field-input"
            placeholder="Enter institution name…"
            value={form.institution}
            onChange={e => set('institution', e.target.value)}
          />
        </div>

        {/* Nominated Personnel — text field, accepts numbers or descriptive text */}
        <div>
          <label className="field-label">Nominated Personnel</label>
          <input
            type="text"
            className="field-input"
            placeholder="e.g. 5, or Hav Ram Singh, Sub Insp Verma…"
            value={form.nominated_personnel}
            onChange={e => set('nominated_personnel', e.target.value)}
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="field-label">
            Remarks{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--c-secondary)', fontSize: '0.75rem' }}>
              (optional)
            </span>
          </label>
          <textarea
            className="field-input"
            rows={3}
            placeholder="Any additional details, reporting instructions, etc."
            value={form.remarks}
            onChange={e => set('remarks', e.target.value)}
            style={{ resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? 'var(--c-secondary)' : 'var(--c-primary)',
            color: '#fff',
            fontFamily: "'Public Sans', sans-serif",
            fontSize: '0.9375rem', fontWeight: 700,
            padding: '12px 20px', borderRadius: 'var(--r-sm)',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
            width: '100%',
          }}
        >
          {saving ? 'Saving…' : 'Save to Calendar'}
        </button>
      </div>
    </div>
  )
}
