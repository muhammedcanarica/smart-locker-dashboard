import { useState } from 'react'
import './style.css'

const roles = {
  USER: 'Kullanıcı',
  COURIER: 'Kurye',
  ADMIN: 'Admin',
}

const lockerStatusLabels = {
  EMPTY: 'Boş',
  WAITING_COURIER: 'Kurye Bekleniyor',
  WAITING_COURIER_PIN: 'Kurye PIN Bekleniyor',
  COURIER_AUTHORIZED: 'Kurye Doğrulandı',
  WAITING_PICKUP: 'Teslim Bekliyor',
  OPEN: 'Kapak Açık',
  EXPIRED: 'Süresi Doldu',
  DELIVERED: 'Teslim Edildi',
  RETURN_REQUESTED: 'İade Talebi',
  RETURN_CODE_READY: 'İade Kodu Hazır',
  WAITING_RETURN: 'İade Bekleniyor',
  RETURN_COLLECTED: 'İade Alındı',
  BLOCKED: 'İşlem Engellendi',
  ERROR: 'Hata',
}

const stateMachineSteps = [
  {
    id: 'idle',
    title: 'Boşta',
    description: 'Dolap yeni işlem bekler',
  },
  {
    id: 'courierPin',
    title: 'Kurye PIN',
    description: 'Kurye yetkisi doğrulanır',
  },
  {
    id: 'deliveryCode',
    title: 'Teslim Kodu',
    description: 'Kullanıcı teslim kodu ile erişir',
  },
  {
    id: 'returnRequest',
    title: 'İade Talebi',
    description: 'Kullanıcı iade sürecini başlatır',
  },
  {
    id: 'adminReturnCode',
    title: 'Admin İade Kodu',
    description: 'Admin iade kodunu üretir veya yeniler',
  },
  {
    id: 'completed',
    title: 'Tamamlandı',
    description: 'Teslim ya da iade kapanır',
  },
]

function formatDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date)
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function createMockData() {
  return {
    system: {
      state: 'ROLE_FLOW',
      connected: true,
      emergency: false,
      resetRequired: false,
      alarm: true,
      alarmMessage: 'Dolap 2 için iade kodu admin onayı bekliyor.',
      lastUpdate: formatDateTime(),
    },
    activeRole: 'ADMIN',
    activeOperation: {
      id: 'OP-1042',
      lockerId: 2,
      type: 'İade',
      state: 'adminReturnCode',
      ownerRole: 'ADMIN',
      title: 'Dolap 2 için iade kodu yönetimi',
      description:
        'Admin, kullanıcı iade talebi için tek kullanımlık iade kodunu doğruluyor.',
      nextAction: 'İade kodunu üret veya yenile',
      risk: 'Yanlış rol denemeleri engellenir ve güvenlik olayına yazılır.',
    },
    lockers: [
      {
        id: 1,
        status: 'WAITING_PICKUP',
        doorOpen: false,
        deliveryCode: '482913',
        returnCode: '',
        activeCode: '482913',
        codeType: 'Teslim',
        remainingTime: '08 dk 42 sn',
        expired: false,
        alarm: false,
        allowedRoles: ['USER', 'ADMIN'],
        flowState: 'deliveryCode',
        courierPinVerified: true,
      },
      {
        id: 2,
        status: 'RETURN_REQUESTED',
        doorOpen: false,
        deliveryCode: '',
        returnCode: 'R-759204',
        activeCode: 'R-759204',
        codeType: 'İade',
        remainingTime: '14 dk 05 sn',
        expired: false,
        alarm: true,
        allowedRoles: ['USER', 'ADMIN'],
        flowState: 'adminReturnCode',
        courierPinVerified: false,
      },
    ],
    returnRequests: [
      {
        id: 'RET-2201',
        lockerId: 2,
        requestedBy: 'Kullanıcı',
        status: 'Admin onayı bekliyor',
        returnCode: 'R-759204',
        expiresIn: '14 dk 05 sn',
      },
    ],
    logs: [
      { role: 'Admin', message: 'Admin giriş yaptı', time: '19:04:12' },
      { role: 'Kurye', message: 'Kurye PIN doğrulama ekranına geldi', time: '19:04:28' },
      { role: 'Kurye', message: 'Dolap 1 kurye için açıldı', time: '19:04:41' },
      { role: 'Kullanıcı', message: 'Kullanıcı teslim kodunu doğruladı', time: '19:05:06' },
      { role: 'Kullanıcı', message: 'Dolap 2 için iade talebi oluşturdu', time: '19:06:19' },
      { role: 'Admin', message: 'İade kodu yönetimi beklemeye alındı', time: '19:06:44' },
    ],
    securityEvents: [
      {
        level: 'Uyarı',
        title: 'Rol kontrolü',
        message: 'Kullanıcı rolü kurye PIN adımına erişemez.',
        time: '19:06:51',
      },
      {
        level: 'Blok',
        title: 'Kod ayrımı',
        message: 'Teslim kodu iade işlemi için kullanılamaz.',
        time: '19:07:03',
      },
    ],
  }
}

function App() {
  const [dashboardData, setDashboardData] = useState(createMockData)
  const [showCodes, setShowCodes] = useState(false)

  const addRoleLog = (data, role, message) => ({
    ...data,
    logs: [{ role: roles[role] ?? role, message, time: formatTime() }, ...data.logs].slice(0, 9),
  })

  const addSecurityEvent = (data, event) => ({
    ...data,
    securityEvents: [{ ...event, time: formatTime() }, ...data.securityEvents].slice(0, 7),
  })

  const refreshStatus = () => {
    // Gerçek ESP32 bağlantısı eklendiğinde /status ve /logs endpointleri
    // burada çağrılabilir. Şimdilik sadece mock veri güncelleniyor.
    // const status = await fetch('/status').then((response) => response.json())
    // const logs = await fetch('/logs').then((response) => response.json())
    setDashboardData((currentData) =>
      addRoleLog(
        {
          ...currentData,
          system: {
            ...currentData.system,
            connected: true,
            lastUpdate: formatDateTime(),
          },
        },
        currentData.activeRole,
        'Panel durumu rol bazlı mock veriyle yenilendi',
      ),
    )
  }

  const setActiveRole = (role) => {
    setDashboardData((currentData) =>
      addRoleLog(
        {
          ...currentData,
          activeRole: role,
          system: {
            ...currentData.system,
            lastUpdate: formatDateTime(),
          },
        },
        role,
        `${roles[role]} rolü aktif edildi`,
      ),
    )
  }

  const toggleEmergencyDemo = () => {
    setDashboardData((currentData) => {
      const emergency = !currentData.system.emergency

      return addRoleLog(
        {
          ...currentData,
          system: {
            ...currentData.system,
            state: emergency
              ? 'EMERGENCY'
              : currentData.system.alarm
                ? 'ROLE_FLOW'
                : 'NORMAL',
            emergency,
            alarmMessage: emergency
              ? 'Emergency modu demo olarak aktif edildi.'
              : currentData.system.alarmMessage,
            lastUpdate: formatDateTime(),
          },
        },
        currentData.activeRole,
        `Emergency demo ${emergency ? 'açıldı' : 'kapatıldı'}`,
      )
    })
  }

  const toggleResetDemo = () => {
    setDashboardData((currentData) => {
      const resetRequired = !currentData.system.resetRequired

      return addRoleLog(
        {
          ...currentData,
          system: {
            ...currentData.system,
            resetRequired,
            lastUpdate: formatDateTime(),
          },
        },
        currentData.activeRole,
        `Reset demo ${resetRequired ? 'gerekli' : 'normal'} duruma alındı`,
      )
    })
  }

  const approveReturnCode = () => {
    setDashboardData((currentData) => {
      if (currentData.activeRole !== 'ADMIN') {
        return addSecurityEvent(
          addRoleLog(currentData, currentData.activeRole, 'Admin iade kodu işlemi engellendi'),
          {
            level: 'Blok',
            title: 'Yetkisiz admin işlemi',
            message: `${roles[currentData.activeRole]} rolü iade kodu üretemez.`,
          },
        )
      }

      const nextData = {
        ...currentData,
        system: {
          ...currentData.system,
          alarm: false,
          alarmMessage: 'İade kodu admin tarafından onaylandı.',
          lastUpdate: formatDateTime(),
        },
        activeOperation: {
          ...currentData.activeOperation,
          state: 'returnRequest',
          title: 'İade kodu hazır',
          description: 'Kullanıcı iade kodu ile dolaba erişebilir.',
          nextAction: 'Kullanıcının iade kodunu girmesi bekleniyor',
        },
        lockers: currentData.lockers.map((locker) =>
          locker.id === 2
            ? {
                ...locker,
                status: 'RETURN_CODE_READY',
                alarm: false,
                flowState: 'returnRequest',
              }
            : locker,
        ),
        returnRequests: currentData.returnRequests.map((request) =>
          request.id === 'RET-2201'
            ? { ...request, status: 'İade kodu hazır', expiresIn: '13 dk 55 sn' }
            : request,
        ),
      }

      return addRoleLog(nextData, 'ADMIN', 'Admin iade kodunu onayladı')
    })
  }

  const simulateCourierPin = () => {
    setDashboardData((currentData) => {
      if (currentData.activeRole !== 'COURIER') {
        return addSecurityEvent(
          addRoleLog(currentData, currentData.activeRole, 'Kurye PIN doğrulaması engellendi'),
          {
            level: 'Blok',
            title: 'Kurye PIN koruması',
            message: `${roles[currentData.activeRole]} rolü kurye PIN doğrulaması yapamaz.`,
          },
        )
      }

      const nextData = {
        ...currentData,
        activeOperation: {
          ...currentData.activeOperation,
          lockerId: 1,
          type: 'Teslim',
          state: 'courierPin',
          ownerRole: 'COURIER',
          title: 'Kurye PIN doğrulandı',
          description: 'Kurye Dolap 1 için yetkilendirildi, kapak açma adımı bekliyor.',
          nextAction: 'Kurye teslim yüklemesini tamamlar',
        },
        lockers: currentData.lockers.map((locker) =>
          locker.id === 1
            ? {
                ...locker,
                status: 'COURIER_AUTHORIZED',
                courierPinVerified: true,
                flowState: 'courierPin',
              }
            : locker,
        ),
      }

      return addRoleLog(nextData, 'COURIER', 'Kurye PIN doğrulaması başarılı')
    })
  }

  const simulateUserReturn = () => {
    setDashboardData((currentData) => {
      if (currentData.activeRole !== 'USER') {
        return addSecurityEvent(
          addRoleLog(currentData, currentData.activeRole, 'Kullanıcı iade akışı engellendi'),
          {
            level: 'Uyarı',
            title: 'Rol bazlı akış',
            message: `${roles[currentData.activeRole]} rolü kullanıcı iade talebi başlatamaz.`,
          },
        )
      }

      const nextData = {
        ...currentData,
        system: {
          ...currentData.system,
          alarm: true,
          alarmMessage: 'Yeni iade talebi admin onayı bekliyor.',
          lastUpdate: formatDateTime(),
        },
        activeOperation: {
          ...currentData.activeOperation,
          lockerId: 2,
          type: 'İade',
          state: 'adminReturnCode',
          ownerRole: 'ADMIN',
          title: 'Yeni iade talebi alındı',
          description: 'Kullanıcı iade talebi oluşturdu, admin iade kodu yönetimi bekleniyor.',
          nextAction: 'Admin iade kodunu üretir',
        },
        lockers: currentData.lockers.map((locker) =>
          locker.id === 2
            ? {
                ...locker,
                status: 'RETURN_REQUESTED',
                alarm: true,
                flowState: 'adminReturnCode',
              }
            : locker,
        ),
      }

      return addRoleLog(nextData, 'USER', 'Kullanıcı iade talebi başlattı')
    })
  }

  const simulateBlockedAction = () => {
    setDashboardData((currentData) =>
      addSecurityEvent(
        addRoleLog(currentData, currentData.activeRole, 'Hatalı işlem state machine tarafından reddedildi'),
        {
          level: 'Blok',
          title: 'State machine koruması',
          message: `${roles[currentData.activeRole]} rolü mevcut adımda teslim kodunu iade kodu gibi kullanmaya çalıştı.`,
        },
      ),
    )
  }

  const activeCodes = dashboardData.lockers.filter(
    (locker) => locker.activeCode && !locker.expired,
  )

  return (
    <main className="dashboard-shell">
      <Header onRefresh={refreshStatus} />

      <RoleOverview
        activeRole={dashboardData.activeRole}
        onRoleChange={setActiveRole}
        operation={dashboardData.activeOperation}
      />

      <div className="alert-stack" aria-live="polite">
        {dashboardData.system.emergency && (
          <AlertBanner
            tone="danger"
            title="Emergency aktif"
            message="Sistem acil durum modunda. Rol bazlı erişimler manuel kontrol gerektirir."
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

      <SystemStatus system={dashboardData.system} activeRole={dashboardData.activeRole} />

      <section className="section-block" aria-labelledby="operations-title">
        <div className="section-heading">
          <span className="eyebrow">İşlem Akışı</span>
          <h2 id="operations-title">Aktif işlem ve state machine</h2>
        </div>
        <div className="operation-grid">
          <ActiveOperationCard operation={dashboardData.activeOperation} />
          <StateMachinePanel
            activeState={dashboardData.activeOperation.state}
            steps={stateMachineSteps}
          />
        </div>
      </section>

      <section className="section-block" aria-labelledby="lockers-title">
        <div className="section-heading">
          <span className="eyebrow">Dolaplar</span>
          <h2 id="lockers-title">Rol bazlı dolap durumu</h2>
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
        <ReturnPanel
          requests={dashboardData.returnRequests}
          activeRole={dashboardData.activeRole}
          onApproveReturnCode={approveReturnCode}
          onUserReturn={simulateUserReturn}
        />
      </div>

      <div className="dashboard-grid wide-right">
        <LogsPanel logs={dashboardData.logs} />
        <SecurityEventsPanel events={dashboardData.securityEvents} />
      </div>

      <AdminActions
        emergencyActive={dashboardData.system.emergency}
        resetRequired={dashboardData.system.resetRequired}
        showCodes={showCodes}
        onRefresh={refreshStatus}
        onToggleCodes={() => setShowCodes((visible) => !visible)}
        onToggleEmergency={toggleEmergencyDemo}
        onToggleReset={toggleResetDemo}
        onCourierPin={simulateCourierPin}
        onBlockedAction={simulateBlockedAction}
      />
    </main>
  )
}

function Header({ onRefresh }) {
  return (
    <header className="dashboard-header">
      <div>
        <span className="eyebrow">ESP32 Rol Bazlı Admin Demo</span>
        <h1>Akıllı Kargo Dolabı İzleme Paneli</h1>
        <p>Kullanıcı, kurye ve admin akışları için teslim, iade ve güvenlik takibi</p>
      </div>
      <button className="primary-button" type="button" onClick={onRefresh}>
        Durumu Yenile
      </button>
    </header>
  )
}

function RoleOverview({ activeRole, onRoleChange, operation }) {
  return (
    <section className="role-overview" aria-labelledby="role-title">
      <div>
        <span className="eyebrow">Aktif Rol</span>
        <h2 id="role-title">{roles[activeRole]}</h2>
        <p>{operation.title}</p>
      </div>
      <div className="role-switcher" aria-label="Rol seçimi">
        {Object.entries(roles).map(([role, label]) => (
          <button
            className={role === activeRole ? 'role-button active' : 'role-button'}
            key={role}
            type="button"
            onClick={() => onRoleChange(role)}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
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

function SystemStatus({ system, activeRole }) {
  const cards = [
    {
      title: 'Sistem Durumu',
      value: system.state,
      tone:
        system.state === 'NORMAL'
          ? 'success'
          : system.state === 'EMERGENCY'
            ? 'danger'
            : 'info',
    },
    {
      title: 'Aktif Rol',
      value: roles[activeRole],
      tone: 'muted',
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

function ActiveOperationCard({ operation }) {
  return (
    <article className="panel-card active-operation-card">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Aktif İşlem</span>
          <h3>{operation.title}</h3>
        </div>
        <StatusPill tone={operation.type === 'İade' ? 'warning' : 'success'}>
          {operation.type}
        </StatusPill>
      </div>
      <dl className="details-list compact">
        <div>
          <dt>İşlem No</dt>
          <dd>{operation.id}</dd>
        </div>
        <div>
          <dt>Dolap</dt>
          <dd>Dolap {operation.lockerId}</dd>
        </div>
        <div>
          <dt>Sorumlu Rol</dt>
          <dd>{roles[operation.ownerRole]}</dd>
        </div>
      </dl>
      <p>{operation.description}</p>
      <p className="next-action">{operation.nextAction}</p>
      <p className="risk-note">{operation.risk}</p>
    </article>
  )
}

function StateMachinePanel({ activeState, steps }) {
  return (
    <section className="panel-card state-panel" aria-labelledby="state-machine-title">
      <div className="panel-header">
        <div>
          <span className="eyebrow">State Machine</span>
          <h3 id="state-machine-title">Rol bazlı işlem grafiği</h3>
        </div>
      </div>
      <ol className="state-steps">
        {steps.map((step) => (
          <li className={step.id === activeState ? 'active' : ''} key={step.id}>
            <strong>{step.title}</strong>
            <span>{step.description}</span>
          </li>
        ))}
      </ol>
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
          <dt>Teslim kodu</dt>
          <dd className="code-value">{locker.deliveryCode || 'Yok'}</dd>
        </div>
        <div>
          <dt>İade kodu</dt>
          <dd className="code-value">{locker.returnCode || 'Yok'}</dd>
        </div>
        <div>
          <dt>Aktif kod tipi</dt>
          <dd>{locker.codeType}</dd>
        </div>
        <div>
          <dt>Kalan süre</dt>
          <dd>{locker.expired ? 'Süresi doldu' : locker.remainingTime}</dd>
        </div>
        <div>
          <dt>Kurye PIN</dt>
          <dd>{locker.courierPinVerified ? 'Doğrulandı' : 'Bekliyor'}</dd>
        </div>
        <div>
          <dt>Yetkili roller</dt>
          <dd>{locker.allowedRoles.map((role) => roles[role]).join(', ')}</dd>
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
    <section className="panel-card code-panel" aria-labelledby="active-codes-title">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Kod Ayrımı</span>
          <h2 id="active-codes-title">Teslim ve iade kodları</h2>
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
              <em>{locker.codeType}</em>
              <strong>{showCodes ? locker.activeCode : '****'}</strong>
              <small>{locker.remainingTime}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ReturnPanel({ requests, activeRole, onApproveReturnCode, onUserReturn }) {
  return (
    <section className="panel-card return-panel" aria-labelledby="return-title">
      <div className="panel-header">
        <div>
          <span className="eyebrow">İade Sistemi</span>
          <h2 id="return-title">Admin iade kodu yönetimi</h2>
        </div>
      </div>
      <div className="return-summary">
        <span>Aktif rol</span>
        <strong>{roles[activeRole]}</strong>
      </div>
      <ul className="return-list">
        {requests.map((request) => (
          <li key={request.id}>
            <div>
              <strong>{request.id}</strong>
              <span>Dolap {request.lockerId} · {request.requestedBy}</span>
            </div>
            <div>
              <span>{request.status}</span>
              <small>{request.expiresIn}</small>
            </div>
          </li>
        ))}
      </ul>
      <div className="mini-action-row">
        <button className="secondary-button" type="button" onClick={onUserReturn}>
          Kullanıcı İade Talebi
        </button>
        <button className="primary-button" type="button" onClick={onApproveReturnCode}>
          Admin İade Kodunu Onayla
        </button>
      </div>
    </section>
  )
}

function LogsPanel({ logs }) {
  return (
    <section className="panel-card" aria-labelledby="logs-title">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Rol Logları</span>
          <h2 id="logs-title">Rol bazlı sistem logları</h2>
        </div>
      </div>
      <ol className="log-list role-log-list">
        {logs.map((log, index) => (
          <li key={`${log.message}-${index}`}>
            <div>
              <strong>{log.role}</strong>
              <span>{log.message}</span>
            </div>
            <small>{log.time}</small>
          </li>
        ))}
      </ol>
    </section>
  )
}

function SecurityEventsPanel({ events }) {
  return (
    <section className="panel-card security-panel" aria-labelledby="security-title">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Güvenlik</span>
          <h2 id="security-title">Hata ve engelleme olayları</h2>
        </div>
      </div>
      <ul className="security-list">
        {events.map((event, index) => (
          <li key={`${event.title}-${index}`}>
            <span className={event.level === 'Blok' ? 'security-level block' : 'security-level'}>
              {event.level}
            </span>
            <div>
              <strong>{event.title}</strong>
              <p>{event.message}</p>
              <small>{event.time}</small>
            </div>
          </li>
        ))}
      </ul>
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
  onCourierPin,
  onBlockedAction,
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
        <button className="secondary-button" type="button" onClick={onCourierPin}>
          Kurye PIN Demo
        </button>
        <button className="danger-button" type="button" onClick={onToggleEmergency}>
          Emergency Demo {emergencyActive ? 'Kapat' : 'Aç'}
        </button>
        <button className="warning-button" type="button" onClick={onToggleReset}>
          Reset Demo {resetRequired ? 'Kapat' : 'Aç'}
        </button>
        <button className="ghost-button" type="button" onClick={onBlockedAction}>
          Hatalı İşlem Demo
        </button>
      </div>
    </section>
  )
}

function StatusPill({ children, tone }) {
  return <span className={`status-pill ${tone}`}>{children}</span>
}

export default App
