import { useState } from 'react'
import './style.css'

const lockerStatusLabels = {
  EMPTY: 'Boş',
  WAITING_COURIER: 'Kurye Bekleniyor',
  WAITING_PICKUP: 'Teslim Bekliyor',
  OPEN: 'Kapak Açık',
  EXPIRED: 'Süresi Doldu',
  DELIVERED: 'Teslim Edildi',
  ERROR: 'Hata',
}

const demoLogs = [
  'Admin giriş yaptı',
  'Dolap 1 kurye için açıldı',
  'Kurye kapağı kapattı',
  'Teslim kodu üretildi',
  'Kullanıcı kodu doğruladı',
  'Teslim tamamlandı',
]

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date)
}

function createMockData() {
  return {
    system: {
      state: 'ERROR',
      connected: true,
      emergency: false,
      resetRequired: false,
      alarm: true,
      alarmMessage: 'Dolap 2 için kapak sensörü beklenen sürede kapanmadı.',
      lastUpdate: formatDateTime(),
    },
    lockers: [
      {
        id: 1,
        status: 'WAITING_PICKUP',
        doorOpen: false,
        activeCode: '482913',
        remainingTime: '08 dk 42 sn',
        expired: false,
        alarm: false,
      },
      {
        id: 2,
        status: 'ERROR',
        doorOpen: true,
        activeCode: '759204',
        remainingTime: '02 dk 18 sn',
        expired: false,
        alarm: true,
      },
    ],
    logs: demoLogs,
  }
}

function App() {
  const [dashboardData, setDashboardData] = useState(createMockData)
  const [showCodes, setShowCodes] = useState(false)

  const refreshStatus = () => {
    // Gerçek ESP32 bağlantısı eklendiğinde /status ve /logs endpointleri
    // burada çağrılabilir. Şimdilik sadece mock veri güncelleniyor.
    // const status = await fetch('/status').then((response) => response.json())
    // const logs = await fetch('/logs').then((response) => response.json())
    setDashboardData((currentData) => ({
      ...currentData,
      system: {
        ...currentData.system,
        connected: true,
        lastUpdate: formatDateTime(),
      },
      logs: [
        `Durum yenilendi (${new Date().toLocaleTimeString('tr-TR')})`,
        ...currentData.logs,
      ].slice(0, 8),
    }))
  }

  const toggleEmergencyDemo = () => {
    setDashboardData((currentData) => {
      const emergency = !currentData.system.emergency

      return {
        ...currentData,
        system: {
          ...currentData.system,
          state: emergency
            ? 'EMERGENCY'
            : currentData.system.alarm
              ? 'ERROR'
              : 'NORMAL',
          emergency,
          alarmMessage: emergency
            ? 'Emergency modu demo olarak aktif edildi.'
            : currentData.system.alarmMessage,
          lastUpdate: formatDateTime(),
        },
        logs: [
          `Emergency demo ${emergency ? 'açıldı' : 'kapatıldı'}`,
          ...currentData.logs,
        ].slice(0, 8),
      }
    })
  }

  const toggleResetDemo = () => {
    setDashboardData((currentData) => {
      const resetRequired = !currentData.system.resetRequired

      return {
        ...currentData,
        system: {
          ...currentData.system,
          resetRequired,
          lastUpdate: formatDateTime(),
        },
        logs: [
          `Reset demo ${resetRequired ? 'gerekli' : 'normal'} duruma alındı`,
          ...currentData.logs,
        ].slice(0, 8),
      }
    })
  }

  const activeCodes = dashboardData.lockers.filter(
    (locker) => locker.activeCode && !locker.expired,
  )

  return (
    <main className="dashboard-shell">
      <Header onRefresh={refreshStatus} />

      <div className="alert-stack" aria-live="polite">
        {dashboardData.system.emergency && (
          <AlertBanner
            tone="danger"
            title="Emergency aktif"
            message="Sistem acil durum modunda. Dolap erişimleri manuel kontrol gerektirir."
          />
        )}

        {dashboardData.system.alarm && (
          <AlertBanner
            tone="warning"
            title="Alarm var"
            message={dashboardData.system.alarmMessage}
          />
        )}
      </div>

      <SystemStatus system={dashboardData.system} />

      <section className="section-block" aria-labelledby="lockers-title">
        <div className="section-heading">
          <span className="eyebrow">Dolaplar</span>
          <h2 id="lockers-title">Dolap durumu</h2>
        </div>
        <div className="locker-grid">
          {dashboardData.lockers.map((locker) => (
            <LockerCard key={locker.id} locker={locker} />
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        <ActiveCodes
          activeCodes={activeCodes}
          showCodes={showCodes}
          onToggleCodes={() => setShowCodes((visible) => !visible)}
        />
        <LogsPanel logs={dashboardData.logs} />
      </div>

      <AdminActions
        emergencyActive={dashboardData.system.emergency}
        resetRequired={dashboardData.system.resetRequired}
        showCodes={showCodes}
        onRefresh={refreshStatus}
        onToggleCodes={() => setShowCodes((visible) => !visible)}
        onToggleEmergency={toggleEmergencyDemo}
        onToggleReset={toggleResetDemo}
      />
    </main>
  )
}

function Header({ onRefresh }) {
  return (
    <header className="dashboard-header">
      <div>
        <span className="eyebrow">ESP32 Admin Demo</span>
        <h1>Akıllı Kargo Dolabı İzleme Paneli</h1>
        <p>ESP32 tabanlı sistem durumu ve teslim kodu takibi</p>
      </div>
      <button className="primary-button" type="button" onClick={onRefresh}>
        Durumu Yenile
      </button>
    </header>
  )
}

function AlertBanner({ tone, title, message }) {
  return (
    <section className={`alert-banner ${tone}`} role="status">
      <strong>{title}</strong>
      <span>{message}</span>
    </section>
  )
}

function SystemStatus({ system }) {
  const cards = [
    {
      title: 'Sistem Durumu',
      value: system.state,
      tone:
        system.state === 'NORMAL'
          ? 'success'
          : system.state === 'EMERGENCY'
            ? 'danger'
            : 'warning',
    },
    {
      title: 'Bağlantı',
      value: system.connected ? 'Aktif' : 'Pasif',
      tone: system.connected ? 'success' : 'danger',
    },
    {
      title: 'Emergency',
      value: system.emergency ? 'Aktif' : 'Pasif',
      tone: system.emergency ? 'danger' : 'muted',
    },
    {
      title: 'Reset',
      value: system.resetRequired ? 'Gerekli' : 'Normal',
      tone: system.resetRequired ? 'warning' : 'success',
    },
    {
      title: 'Alarm',
      value: system.alarm ? 'Var' : 'Yok',
      tone: system.alarm ? 'warning' : 'success',
    },
    {
      title: 'Son Güncelleme',
      value: system.lastUpdate,
      tone: 'info',
    },
  ]

  return (
    <section className="section-block" aria-labelledby="system-title">
      <div className="section-heading">
        <span className="eyebrow">Sistem</span>
        <h2 id="system-title">Sistem durumu</h2>
      </div>
      <div className="status-grid">
        {cards.map((card) => (
          <article className={`status-card ${card.tone}`} key={card.title}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}

function LockerCard({ locker }) {
  const statusLabel = lockerStatusLabels[locker.status] ?? locker.status
  const cardTone = locker.alarm || locker.status === 'ERROR' ? 'danger' : 'ready'

  return (
    <article className={`locker-card ${cardTone}`}>
      <div className="locker-card-header">
        <div>
          <span className="eyebrow">Dolap {locker.id}</span>
          <h3>Dolap {locker.id}</h3>
        </div>
        <StatusPill tone={cardTone === 'danger' ? 'danger' : 'success'}>
          {statusLabel}
        </StatusPill>
      </div>

      <dl className="details-list">
        <div>
          <dt>Durum</dt>
          <dd>{statusLabel}</dd>
        </div>
        <div>
          <dt>Kapak</dt>
          <dd>{locker.doorOpen ? 'Açık' : 'Kapalı'}</dd>
        </div>
        <div>
          <dt>Aktif teslim kodu</dt>
          <dd className="code-value">{locker.activeCode || 'Yok'}</dd>
        </div>
        <div>
          <dt>Kalan süre</dt>
          <dd>{locker.expired ? 'Süresi doldu' : locker.remainingTime}</dd>
        </div>
        <div>
          <dt>Alarm durumu</dt>
          <dd>{locker.alarm ? 'Alarm var' : 'Alarm yok'}</dd>
        </div>
      </dl>
    </article>
  )
}

function ActiveCodes({ activeCodes, showCodes, onToggleCodes }) {
  return (
    <section className="panel-card" aria-labelledby="active-codes-title">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Admin Demo</span>
          <h2 id="active-codes-title">Aktif teslim kodları</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onToggleCodes}>
          Kodları {showCodes ? 'Gizle' : 'Göster'}
        </button>
      </div>

      {activeCodes.length === 0 ? (
        <p className="empty-state">Aktif kod yok</p>
      ) : (
        <ul className="code-list">
          {activeCodes.map((locker) => (
            <li key={locker.id}>
              <span>Dolap {locker.id}</span>
              <strong>{showCodes ? locker.activeCode : '****'}</strong>
              <small>{locker.remainingTime}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function LogsPanel({ logs }) {
  return (
    <section className="panel-card" aria-labelledby="logs-title">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Kayıtlar</span>
          <h2 id="logs-title">Sistem logları</h2>
        </div>
      </div>
      <ol className="log-list">
        {logs.map((log, index) => (
          <li key={`${log}-${index}`}>{log}</li>
        ))}
      </ol>
    </section>
  )
}

function AdminActions({
  emergencyActive,
  resetRequired,
  showCodes,
  onRefresh,
  onToggleCodes,
  onToggleEmergency,
  onToggleReset,
}) {
  return (
    <section className="admin-actions" aria-labelledby="admin-actions-title">
      <div>
        <span className="eyebrow">Kontroller</span>
        <h2 id="admin-actions-title">Admin/demo butonları</h2>
      </div>
      <div className="action-row">
        <button className="primary-button" type="button" onClick={onRefresh}>
          Durumu Yenile
        </button>
        <button className="secondary-button" type="button" onClick={onToggleCodes}>
          Kodları {showCodes ? 'Gizle' : 'Göster'}
        </button>
        <button className="danger-button" type="button" onClick={onToggleEmergency}>
          Emergency Demo {emergencyActive ? 'Kapat' : 'Aç'}
        </button>
        <button className="warning-button" type="button" onClick={onToggleReset}>
          Reset Demo {resetRequired ? 'Kapat' : 'Aç'}
        </button>
      </div>
    </section>
  )
}

function StatusPill({ children, tone }) {
  return <span className={`status-pill ${tone}`}>{children}</span>
}

export default App
