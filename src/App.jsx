import { useCallback, useEffect, useMemo, useState } from 'react'
import './style.css'

const DEFAULT_API_BASE = 'http://192.168.4.1'
const API_STORAGE_KEY = 'smartLockerMonitorApiBase'

function normalizeApiBase(value) {
  return value.trim().replace(/\/$/, '')
}

function secondsToText(value) {
  if (value === null || value === undefined || value === '') return '-'
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return String(value)
  if (seconds <= 0) return '0 sn'

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes <= 0) return `${remainingSeconds} sn`
  return `${minutes} dk ${remainingSeconds} sn`
}

function maskCode(code, visible) {
  if (!code) return 'Yok'
  return visible ? String(code) : '****'
}

function yesNo(value, yes = 'Aktif', no = 'Pasif') {
  return value ? yes : no
}

function formatLocalTime(date = new Date()) {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function App() {
  const [apiBase, setApiBase] = useState(
    localStorage.getItem(API_STORAGE_KEY) || DEFAULT_API_BASE,
  )
  const [status, setStatus] = useState(null)
  const [logs, setLogs] = useState([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCodes, setShowCodes] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')

  const cleanApiBase = useMemo(() => normalizeApiBase(apiBase), [apiBase])

  const saveApiBase = () => {
    const normalized = normalizeApiBase(apiBase) || DEFAULT_API_BASE
    localStorage.setItem(API_STORAGE_KEY, normalized)
    setApiBase(normalized)
  }

  const loadData = useCallback(async () => {
    const base = normalizeApiBase(apiBase) || DEFAULT_API_BASE

    setLoading(true)
    try {
      const statusResponse = await fetch(`${base}/status`, { cache: 'no-store' })
      if (!statusResponse.ok) {
        throw new Error(`/status ${statusResponse.status}`)
      }

      const statusPayload = await statusResponse.json()
      setStatus(statusPayload)
      setConnected(true)
      setLastUpdated(formatLocalTime())

      try {
        const logsResponse = await fetch(`${base}/logs`, { cache: 'no-store' })
        if (!logsResponse.ok) {
          throw new Error(`/logs ${logsResponse.status}`)
        }

        const logsPayload = await logsResponse.json()
        setLogs(Array.isArray(logsPayload.logs) ? logsPayload.logs : [])
        setError('')
      } catch (logsError) {
        setError(`Durum alındı, loglar alınamadı: ${logsError.message}`)
      }
    } catch (statusError) {
      setConnected(false)
      setError(`ESP32 bağlantısı kurulamadı: ${statusError.message}`)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    const refresh = () => {
      loadData()
    }
    const timeoutId = window.setTimeout(refresh, 0)
    const intervalId = window.setInterval(refresh, 2000)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [loadData])

  const lockers = Array.isArray(status?.lockers) ? status.lockers : []
  const activeReturnCodes = Array.isArray(status?.activeReturnCodes)
    ? status.activeReturnCodes
    : []
  const fallbackReturnCodes = lockers
    .filter((locker) => locker.returnCode)
    .map((locker) => ({
      slot: locker.id,
      code: locker.returnCode,
      remaining: locker.deliveryRemaining,
    }))
  const visibleReturnCodes =
    activeReturnCodes.length > 0 ? activeReturnCodes : fallbackReturnCodes
  const activeDeliveryCodes = lockers.filter((locker) => locker.deliveryCode)
  const lockoutActive = Number(status?.lockoutCounter) > 0

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">ESP32 canlı izleme</p>
          <h1>Akıllı Kargo Dolabı Paneli</h1>
          <p>
            Web panel yalnızca ESP32 Access Point üzerinden durum ve log okur.
            Kod üretme, kod girme ve kapak işlemleri fiziksel ESP32 + keypad
            üzerinden yapılır.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={loadData} disabled={loading}>
          {loading ? 'Yenileniyor...' : 'Manuel Yenile'}
        </button>
      </header>

      <section className="connection-card">
        <div>
          <label htmlFor="apiBase">ESP32 API adresi</label>
          <div className="api-row">
            <input
              id="apiBase"
              value={apiBase}
              onChange={(event) => setApiBase(event.target.value)}
              placeholder={DEFAULT_API_BASE}
            />
            <button type="button" onClick={saveApiBase}>
              Adresi Kaydet
            </button>
          </div>
          <p className="hint">
            ESP32 Access Point modunda beklenen varsayılan adres: {DEFAULT_API_BASE}
          </p>
        </div>
        <div className="connection-meta">
          <StatusPill tone={connected ? 'success' : 'danger'}>
            {connected ? 'Bağlı' : 'Bağlantı yok'}
          </StatusPill>
          <span>Otomatik yenileme: 2 sn</span>
          <span>Son yenileme: {lastUpdated || '-'}</span>
        </div>
      </section>

      {error && <Alert tone="warning" title="Bağlantı bildirimi" message={error} />}
      {status?.emergencyMode && (
        <Alert
          tone="danger"
          title="Emergency aktif"
          message="ESP32 emergency modunda. Web panel bu durumda da sadece izleme yapar."
        />
      )}
      {status?.alarmActive && (
        <Alert
          tone="warning"
          title="Alarm aktif"
          message="ESP32 alarm durumunu bildiriyor. Fiziksel sistem kontrol edilmeli."
        />
      )}
      {lockoutActive && (
        <Alert
          tone="danger"
          title="Kilitlenme aktif"
          message={`Hatalı giriş kilidi: ${secondsToText(status.lockoutCounter)}`}
        />
      )}

      <SystemOverview
        status={status}
        connected={connected}
        lockoutActive={lockoutActive}
        apiBase={cleanApiBase}
      />

      <section className="section-header">
        <div>
          <p className="eyebrow">Dolaplar</p>
          <h2>Dolap 1 ve Dolap 2</h2>
        </div>
        <button className="ghost-button" type="button" onClick={() => setShowCodes((value) => !value)}>
          Kodları {showCodes ? 'Gizle' : 'Göster'}
        </button>
      </section>

      <section className="locker-grid">
        {lockers.length === 0 ? (
          <EmptyPanel text="ESP32 durum verisi bekleniyor." />
        ) : (
          lockers.map((locker) => (
            <LockerCard key={locker.id} locker={locker} showCodes={showCodes} />
          ))
        )}
      </section>

      <section className="dashboard-grid">
        <CodePanel
          title="Aktif teslim kodları"
          emptyText="Aktif teslim kodu yok."
          items={activeDeliveryCodes.map((locker) => ({
            id: `D${locker.id}`,
            label: `Dolap ${locker.id}`,
            code: locker.deliveryCode,
            remaining: locker.deliveryRemaining,
          }))}
          showCodes={showCodes}
        />
        <CodePanel
          title="Aktif iade kodları"
          emptyText="Aktif iade kodu yok."
          items={visibleReturnCodes.map((item) => ({
            id: `R${item.slot}`,
            label: `Slot ${item.slot}`,
            code: item.code,
            remaining: item.remaining,
          }))}
          showCodes={showCodes}
        />
      </section>

      <LogPanel logs={logs} />

      <footer className="footer-note">
        Okunan endpointler: <code>{cleanApiBase}/status</code> ve{' '}
        <code>{cleanApiBase}/logs</code>
      </footer>
    </main>
  )
}

function Alert({ tone, title, message }) {
  return (
    <section className={`alert alert-${tone}`} role="status">
      <strong>{title}</strong>
      <span>{message}</span>
    </section>
  )
}

function SystemOverview({ status, connected, lockoutActive, apiBase }) {
  const cards = [
    {
      label: 'Bağlantı',
      value: connected ? 'Aktif' : 'Pasif',
      tone: connected ? 'success' : 'danger',
    },
    {
      label: 'UI Modu',
      value: status?.uiMode || '-',
      tone: 'info',
    },
    {
      label: 'Sistem zamanı',
      value: status?.systemTime || '-',
      tone: 'muted',
    },
    {
      label: 'Emergency',
      value: yesNo(status?.emergencyMode),
      tone: status?.emergencyMode ? 'danger' : 'success',
    },
    {
      label: 'Alarm',
      value: status?.alarmActive ? 'Var' : 'Yok',
      tone: status?.alarmActive ? 'warning' : 'success',
    },
    {
      label: 'Kilitlenme',
      value: lockoutActive ? secondsToText(status?.lockoutCounter) : 'Yok',
      tone: lockoutActive ? 'danger' : 'success',
    },
  ]

  return (
    <section className="panel-card system-panel">
      <div className="card-title-row">
        <div>
          <p className="eyebrow">Sistem</p>
          <h2>Genel durum</h2>
        </div>
        <span className="api-chip">{apiBase}</span>
      </div>
      <div className="status-grid">
        {cards.map((card) => (
          <article className="mini-card" key={card.label}>
            <span>{card.label}</span>
            <StatusPill tone={card.tone}>{card.value}</StatusPill>
          </article>
        ))}
      </div>
    </section>
  )
}

function LockerCard({ locker, showCodes }) {
  const tone = locker.doorOpen || locker.servoOpen ? 'warning' : 'success'

  return (
    <article className="locker-card">
      <div className="locker-head">
        <div>
          <p className="eyebrow">Dolap {locker.id}</p>
          <h3>{locker.stateText || locker.state || 'Durum bekleniyor'}</h3>
        </div>
        <StatusPill tone={tone}>{locker.doorOpen ? 'Kapak açık' : 'Kapak kapalı'}</StatusPill>
      </div>

      <div className="info-list">
        <Info label="State" value={locker.state || '-'} />
        <Info label="Kapak" value={locker.doorOpen ? 'Açık' : 'Kapalı'} />
        <Info label="Kilit / servo" value={locker.servoOpen ? 'Açık' : 'Kapalı'} />
        <Info label="Teslim kodu" value={maskCode(locker.deliveryCode, showCodes)} />
        <Info label="Teslim kalan" value={secondsToText(locker.deliveryRemaining)} />
        <Info label="İade kodu" value={maskCode(locker.returnCode, showCodes)} />
      </div>
    </article>
  )
}

function CodePanel({ title, emptyText, items, showCodes }) {
  return (
    <section className="panel-card">
      <div className="card-title-row">
        <div>
          <p className="eyebrow">Kodlar</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="code-list">
        {items.length === 0 ? (
          <p className="empty-text">{emptyText}</p>
        ) : (
          items.map((item) => (
            <div className="code-row" key={item.id}>
              <span>{item.label}</span>
              <strong>{maskCode(item.code, showCodes)}</strong>
              <small>{secondsToText(item.remaining)}</small>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function LogPanel({ logs }) {
  return (
    <section className="panel-card log-panel">
      <div className="card-title-row">
        <div>
          <p className="eyebrow">Loglar</p>
          <h2>Son olay logları</h2>
        </div>
      </div>
      <div className="log-list">
        {logs.length === 0 ? (
          <p className="empty-text">Henüz log yok.</p>
        ) : (
          logs.map((log, index) => (
            <div className="log-item" key={`${log}-${index}`}>
              <span>#{index + 1}</span>
              <p>{log}</p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function EmptyPanel({ text }) {
  return (
    <section className="panel-card empty-panel">
      <p className="empty-text">{text}</p>
    </section>
  )
}

function Info({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function StatusPill({ children, tone = 'muted' }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>
}

export default App
