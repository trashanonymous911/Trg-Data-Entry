import { useState } from 'react'
import {
  getDaysInMonth, getFirstDayOfMonth,
  entriesForDay, formatDate, getStatus, statusStyle
} from '../lib/calendar'

const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

// Color per status for calendar dots
const DOT = { Upcoming: '#3730A3', Ongoing: '#2D6A4F', Completed: '#6C7278' }

export default function CalendarWidget({ entries = [], onDelete }) {
  const today   = new Date()
  const [year,  setYear]   = useState(today.getFullYear())
  const [month, setMonth]  = useState(today.getMonth())
  const [selected, setSelected] = useState(null)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const daysInMonth  = getDaysInMonth(year, month)
  const firstDay     = getFirstDayOfMonth(year, month) // 0=Sun
  const todayStr     = today.toISOString().split('T')[0]

  // Build grid: leading empty cells + day cells
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div style={{ background: 'var(--c-white)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>

      {/* ── Month nav ── */}
      <div style={{
        background: 'var(--c-primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
      }}>
        <button onClick={prevMonth} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
          borderRadius: 'var(--r-sm)', width: 32, height: 32,
          fontWeight: 700, fontSize: 16, cursor: 'pointer',
        }}>‹</button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Public Sans', sans-serif", fontWeight: 700, fontSize: 15 }}>
            {MONTHS[month]} {year}
          </div>
        </div>

        <button onClick={nextMonth} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
          borderRadius: 'var(--r-sm)', width: 32, height: 32,
          fontWeight: 700, fontSize: 16, cursor: 'pointer',
        }}>›</button>
      </div>

      {/* ── Day headers ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: 'var(--c-neutral)', borderBottom: '1px solid var(--c-border)' }}>
        {DAYS.map(d => (
          <div key={d} style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--c-secondary)',
            textAlign: 'center', padding: '7px 2px',
          }}>{d}</div>
        ))}
      </div>

      {/* ── Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} style={{ minHeight: 52, borderBottom: '1px solid var(--c-border)', borderRight: idx % 7 !== 6 ? '1px solid var(--c-border)' : 'none', background: 'var(--c-neutral)' }} />

          const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const dayEvts  = entriesForDay(entries, year, month, day)
          const isToday  = dateStr === todayStr
          const isSun    = (firstDay + day - 1) % 7 === 0

          return (
            <div
              key={day}
              style={{
                minHeight: 52,
                padding: '5px 4px 4px',
                borderBottom: '1px solid var(--c-border)',
                borderRight: (firstDay + day - 1) % 7 !== 6 ? '1px solid var(--c-border)' : 'none',
                background: isToday ? '#FFF8F6' : 'var(--c-white)',
                cursor: dayEvts.length ? 'pointer' : 'default',
                position: 'relative',
              }}
              onClick={() => dayEvts.length && setSelected({ day, dateStr, events: dayEvts })}
            >
              {/* Day number */}
              <div style={{
                fontFamily: "'Public Sans', sans-serif",
                fontSize: 11, fontWeight: isToday ? 800 : 500,
                color: isToday ? 'var(--c-tertiary)' : isSun ? '#B8422E' : 'var(--c-primary)',
                textAlign: 'center', marginBottom: 3,
                ...(isToday ? {
                  background: 'var(--c-tertiary)', color: '#fff',
                  borderRadius: '50%', width: 20, height: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 3px',
                } : {})
              }}>{day}</div>

              {/* Event dots / bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvts.slice(0, 2).map(evt => {
                  const st = getStatus(evt.from_date, evt.to_date)
                  return (
                    <div key={evt.id} style={{
                      background: DOT[st],
                      borderRadius: 2,
                      height: 4,
                      width: '100%',
                      opacity: 0.85,
                    }} title={evt.activity_name} />
                  )
                })}
                {dayEvts.length > 2 && (
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 8, color: 'var(--c-secondary)', textAlign: 'center', fontWeight: 600 }}>+{dayEvts.length - 2}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Legend ── */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--c-border)', background: 'var(--c-neutral)', display: 'flex', gap: 16 }}>
        {Object.entries(DOT).map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 4, borderRadius: 2, background: color }} />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 9, fontWeight: 600, color: 'var(--c-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Day detail modal ── */}
      {selected && (
        <DayDetail
          day={selected.day}
          dateStr={selected.dateStr}
          events={selected.events}
          onClose={() => setSelected(null)}
          month={month} year={year}
          onDelete={id => {
            onDelete && onDelete(id)
            // Remove deleted entry from the selected list; close if none remain
            const remaining = selected.events.filter(e => e.id !== id)
            if (remaining.length === 0) setSelected(null)
            else setSelected(s => ({ ...s, events: remaining }))
          }}
        />
      )}
    </div>
  )
}

function DayDetail({ day, dateStr, events, onClose, month, year, onDelete }) {
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const [confirming, setConfirming] = useState(null) // id of entry awaiting confirm

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,20,60,0.4)', zIndex:200, backdropFilter:'blur(2px)' }} />
      <div style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:'var(--c-white)', borderRadius:'16px 16px 0 0',
        zIndex:201, maxHeight:'80vh', overflowY:'auto',
        boxShadow:'0 -4px 24px rgba(0,0,0,0.12)',
        animation:'slideUp 0.2s ease',
      }}>
        {/* Handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
          <div style={{ width:36, height:4, borderRadius:99, background:'var(--c-border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding:'12px 18px 14px', borderBottom:'1px solid var(--c-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Public Sans', sans-serif", fontWeight:700, fontSize:17, color:'var(--c-primary)' }}>
              {day} {MONTHS_SHORT[month]} {year}
            </div>
            <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:10, color:'var(--c-secondary)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginTop:2 }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'var(--c-neutral)', border:'1px solid var(--c-border)', borderRadius:'50%', width:30, height:30, cursor:'pointer', fontSize:14, color:'var(--c-secondary)' }}>✕</button>
        </div>

        {/* Events */}
        <div style={{ padding:'14px 18px 24px', display:'flex', flexDirection:'column', gap:12 }}>
          {events.map(evt => {
            const st = getStatus(evt.from_date, evt.to_date)
            const ss = statusStyle(st)
            const isConfirming = confirming === evt.id
            return (
              <div key={evt.id} style={{ border:'1px solid var(--c-border)', borderRadius:'var(--r-md)', padding:14, borderLeft:`3px solid ${DOT[st]}` }}>
                {/* Title row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ fontFamily:"'Public Sans', sans-serif", fontWeight:700, fontSize:14, color:'var(--c-primary)', flex:1 }}>{evt.activity_name}</div>
                  <span style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:9, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', color:ss.color, background:ss.bg, border:`1px solid ${ss.border}`, borderRadius:'var(--r-sm)', padding:'3px 8px', flexShrink:0, marginLeft:8 }}>{st}</span>
                </div>

                {/* Details */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { l:'From', v: formatDate(evt.from_date) },
                    { l:'To',   v: formatDate(evt.to_date) },
                    evt.institution && { l:'Institution', v: evt.institution },
                    evt.nominated_personnel && { l:'Personnel', v: evt.nominated_personnel },
                  ].filter(Boolean).map(r => (
                    <div key={r.l}>
                      <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>{r.l}</div>
                      <div style={{ fontFamily:"'Public Sans', sans-serif", fontSize:13, fontWeight:600, color:'var(--c-primary)' }}>{r.v}</div>
                    </div>
                  ))}
                </div>

                {evt.remarks && (
                  <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--c-border)' }}>
                    <div style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:9, fontWeight:600, color:'var(--c-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Remarks</div>
                    <div style={{ fontFamily:"'Public Sans', sans-serif", fontSize:13, color:'var(--c-primary)', lineHeight:1.5 }}>{evt.remarks}</div>
                  </div>
                )}

                {/* Delete row */}
                <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--c-border)' }}>
                  {!isConfirming ? (
                    <button onClick={() => setConfirming(evt.id)} style={{
                      fontFamily:"'Space Grotesk', sans-serif", fontSize:10, fontWeight:600,
                      letterSpacing:'0.04em', textTransform:'uppercase',
                      color:'var(--c-tertiary)', background:'none',
                      border:'1px solid var(--c-border)', borderRadius:'var(--r-sm)',
                      padding:'5px 12px', cursor:'pointer',
                    }}>Delete Entry</button>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:"'Space Grotesk', sans-serif", fontSize:10, color:'var(--c-secondary)', fontWeight:600 }}>Confirm delete?</span>
                      <button onClick={() => { onDelete(evt.id); setConfirming(null) }} style={{
                        fontFamily:"'Space Grotesk', sans-serif", fontSize:10, fontWeight:700,
                        background:'var(--c-tertiary)', color:'#fff',
                        border:'none', borderRadius:'var(--r-sm)', padding:'5px 12px', cursor:'pointer',
                      }}>Yes, Delete</button>
                      <button onClick={() => setConfirming(null)} style={{
                        fontFamily:"'Space Grotesk', sans-serif", fontSize:10, fontWeight:600,
                        background:'var(--c-neutral)', color:'var(--c-secondary)',
                        border:'1px solid var(--c-border)', borderRadius:'var(--r-sm)', padding:'5px 12px', cursor:'pointer',
                      }}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes slideUp { from{transform:translateY(100%)}to{transform:translateY(0)} }`}</style>
    </>
  )
}
