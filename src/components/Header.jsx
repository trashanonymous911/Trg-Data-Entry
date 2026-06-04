import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getOfflineQueueCount } from '../lib/supabase'

export default function Header() {
  const location = useLocation()
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    setQueueCount(getOfflineQueueCount())
    const id = setInterval(() => setQueueCount(getOfflineQueueCount()), 5000)
    return () => clearInterval(id)
  }, [])

  const isEntry     = location.pathname === '/'
  const isDashboard = location.pathname === '/dashboard'

  return (
    <header className="ndrf-header">
      {/* Brand row */}
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mark */}
          <div style={{
            width: 32, height: 32,
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 9, fontWeight: 600,
              color: '#FFFFFF', letterSpacing: '0.04em',
            }}>NDRF</span>
          </div>

          <div>
            <div style={{
              fontFamily: "'Public Sans', sans-serif",
              fontSize: 13, fontWeight: 700,
              color: '#FFFFFF', letterSpacing: '-0.01em', lineHeight: 1.2,
            }}>
              National Disaster Response Force
            </div>
            <div style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 9, fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2,
            }}>
              Training Branch · Target Monitoring
            </div>
          </div>
        </div>

        {queueCount > 0 && (
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 9, fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '3px 8px', borderRadius: 4,
          }}>
            {queueCount} offline
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', marginTop: 12 }}>
        <Link to="/"          className={`nav-tab ${isEntry     ? 'active' : 'inactive'}`}>Data Entry</Link>
        <Link to="/dashboard" className={`nav-tab ${isDashboard ? 'active' : 'inactive'}`}>Dashboard</Link>
      </div>
    </header>
  )
}
