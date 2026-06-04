import { useState, useRef, useEffect } from 'react'
import { generateQuickSummary, generateFullReport, generateMonthlyReport } from '../utils/whatsappReport'
import { MONTHS } from '../lib/constants'

const TABS = [
  { id: 'quick',   label: 'Quick',   desc: 'Overview snapshot — ideal for daily WhatsApp updates' },
  { id: 'full',    label: 'Full',    desc: 'All 16 activities with targets and progress' },
  { id: 'monthly', label: 'Monthly', desc: 'Single-month breakdown' },
]

export default function ShareModal({ onClose, cumulative, targets, financialYear, allEntries, entryDate }) {
  const [activeTab, setActiveTab] = useState('quick')
  const [selMonth,  setSelMonth]  = useState('')
  const [copyState, setCopyState] = useState('idle') // idle | copied | failed
  const textareaRef = useRef(null)

  function getReport() {
    if (activeTab === 'quick')   return generateQuickSummary({ cumulative, targets, financialYear, entryDate })
    if (activeTab === 'full')    return generateFullReport({ cumulative, targets, financialYear, entryDate })
    return generateMonthlyReport({
      allEntries, targets, financialYear,
      month:     selMonth ? Number(selMonth) : null,
      monthName: selMonth ? MONTHS[Number(selMonth) - 1] : null,
    })
  }

  const report = getReport()

  // Auto-select text in textarea whenever report or tab changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = report
    }
  }, [report])

  function selectAll() {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, ta.value.length)
  }

  async function copyToClipboard() {
    const text = report

    // Method 1: modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        setCopyState('copied')
        setTimeout(() => setCopyState('idle'), 3000)
        return
      } catch (e) {
        // fall through to method 2
      }
    }

    // Method 2: select + execCommand (works in most mobile browsers)
    try {
      const ta = textareaRef.current
      ta.focus()
      ta.select()
      ta.setSelectionRange(0, ta.value.length)
      const ok = document.execCommand('copy')
      if (ok) {
        setCopyState('copied')
        setTimeout(() => setCopyState('idle'), 3000)
        return
      }
    } catch (e) {
      // fall through
    }

    // Method 3: show "select all" prompt as last resort
    selectAll()
    setCopyState('failed')
  }

  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(report)}`, '_blank')
  }

  const lineCount = report.split('\n').length
  const charCount = report.length

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,20,60,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 200,
      }} />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff',
        borderRadius: '22px 22px 0 0',
        zIndex: 201,
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,32,96,0.2)',
        animation: 'slideUp 0.25s cubic-bezier(.4,0,.2,1)',
      }}>

        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 0' }}>
          <div style={{ width:40, height:4, borderRadius:99, background:'#d1d9e0' }} />
        </div>

        {/* Header */}
        <div style={{ padding:'12px 18px 14px', borderBottom:'1px solid #f0f4fb' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:'var(--navy)', letterSpacing:'-0.02em' }}>
                Share Report
              </div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>
                WhatsApp-formatted · copy & paste directly
              </div>
            </div>
            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:'50%',
              background:'#f1f5f9', border:'none', cursor:'pointer',
              fontSize:16, color:'var(--text-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>

          {/* Report type tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex:1, padding:'8px 4px', borderRadius:10, cursor:'pointer',
                border: activeTab === tab.id ? '2px solid var(--navy-light)' : '2px solid #e2e8f4',
                background: activeTab === tab.id ? '#eef2ff' : '#f8faff',
                color: activeTab === tab.id ? 'var(--navy)' : 'var(--text-2)',
                fontWeight:700, fontSize:12, transition:'all 0.15s',
              }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>
            {TABS.find(t => t.id === activeTab)?.desc}
          </div>

          {activeTab === 'monthly' && (
            <select className="field-input" style={{ marginTop:10 }}
              value={selMonth} onChange={e => setSelMonth(e.target.value)}>
              <option value="">Full Year Summary</option>
              {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          )}
        </div>

        {/* Report text area — the actual copy source */}
        <div style={{ flex:1, overflowY:'auto', padding:'14px 18px 0' }}>

          {/* Copy-state banner */}
          {copyState === 'copied' && (
            <div style={{
              background:'#dcfce7', color:'#166534', borderRadius:10,
              padding:'10px 14px', fontSize:13, fontWeight:700,
              marginBottom:10, display:'flex', alignItems:'center', gap:8,
            }}>
              Copied to clipboard — open WhatsApp and paste.
            </div>
          )}
          {copyState === 'failed' && (
            <div style={{
              background:'#fef3c7', color:'#92400e', borderRadius:10,
              padding:'10px 14px', fontSize:13, fontWeight:600,
              marginBottom:10, lineHeight:1.5,
            }}>
              Auto-copy failed. Text is selected below — press <strong>Ctrl+C</strong> (desktop) or <strong>long-press then Copy</strong> (mobile).
            </div>
          )}

          {/* Instruction row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:500 }}>
              {lineCount} lines · {charCount} chars
            </span>
            <button onClick={selectAll} style={{
              fontSize:11, fontWeight:700, color:'var(--navy-light)',
              background:'#eef2ff', border:'none', borderRadius:6,
              padding:'4px 10px', cursor:'pointer',
            }}>
              Select All
            </button>
          </div>

          {/* The textarea — always visible, always selectable */}
          <textarea
            ref={textareaRef}
            defaultValue={report}
            readOnly
            onClick={selectAll}
            style={{
              width:'100%',
              height: 280,
              background:'#f6fbf6',
              border:'1.5px solid #c8e6c9',
              borderRadius:12,
              padding:'12px 14px',
              fontFamily:'Arial, "Helvetica Neue", Helvetica, sans-serif',
              fontSize:10,
              lineHeight:1.65,
              color:'#111',
              resize:'none',
              outline:'none',
              boxSizing:'border-box',
              cursor:'text',
              WebkitUserSelect:'text',
              userSelect:'text',
            }}
          />
          <div style={{ fontSize:10, color:'var(--text-3)', textAlign:'center', padding:'6px 0 12px' }}>
            Tap inside the box to select · then Copy
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding:'10px 18px 28px', borderTop:'1px solid #f0f4fb', display:'flex', gap:10 }}>
          <button onClick={copyToClipboard} style={{
            flex:1, padding:'14px', borderRadius:14, border:'none',
            background: copyState === 'copied'
              ? 'linear-gradient(135deg,#0f9b58,#059669)'
              : 'linear-gradient(135deg,#002060,#0057b8)',
            color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            boxShadow:'0 4px 16px rgba(0,32,96,0.28)',
            transition:'background 0.3s',
          }}>
            {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Try Again' : 'Copy Text'}
          </button>

          <button onClick={openWhatsApp} title="Open in WhatsApp" style={{
            padding:'14px 16px', borderRadius:14, border:'none',
            background:'linear-gradient(135deg,#25d366,#128c7e)',
            color:'#fff', fontWeight:800, fontSize:14, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            boxShadow:'0 4px 14px rgba(37,211,102,0.4)', flexShrink:0,
          }}>
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="13" fill="white" opacity="0.15"/>
              <path d="M16 3C8.82 3 3 8.82 3 16c0 2.39.63 4.64 1.73 6.6L3 29l6.54-1.72A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3z" fill="white"/>
              <path d="M22.5 19.5c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.19-.57-.34z" fill="#25d366"/>
            </svg>
            WhatsApp
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
