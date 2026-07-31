import { useEffect, useState } from 'react'
import axios from 'axios'

const TopBar = ({ mode }) => {
  const [connected, setConnected] = useState(null)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    let cancelled = false
    const checkHealth = async () => {
      try {
        await axios.get('http://localhost:8000/', { timeout: 4000 })
        if (!cancelled) setConnected(true)
      } catch {
        if (!cancelled) setConnected(false)
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clock)
  }, [])

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">Q</div>
        <div className="topbar-titles">
          <h1>QuantDash</h1>
          <span>{mode === 'live' ? 'Live Execution Console' : 'Backtesting Engine'}</span>
        </div>
      </div>

      <div className="topbar-status">
        <div className="status-pill">
          <span className={`status-dot ${connected === null ? '' : connected ? 'online' : 'offline'}`} />
          {connected === null ? 'Checking backend…' : connected ? 'Backend Connected' : 'Backend Offline'}
        </div>
        <div className="topbar-clock">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

export default TopBar
