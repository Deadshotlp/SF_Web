import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';

const wallPapers = [
  'radial-gradient(circle at 20% 20%, rgba(0,120,212,.35), transparent 35%), linear-gradient(135deg, #081222 0%, #102c4a 45%, #34184c 100%)',
  'radial-gradient(circle at 80% 20%, rgba(16,124,16,.30), transparent 35%), linear-gradient(135deg, #03140d 0%, #113728 50%, #1d3f54 100%)',
  'radial-gradient(circle at 30% 30%, rgba(196,43,28,.28), transparent 35%), linear-gradient(135deg, #180b0b 0%, #411919 50%, #5a3211 100%)',
];

const settingsSections = [
  { id: 'system', label: 'System', icon: '🏠' },
  { id: 'display', label: 'Anzeige', icon: '🖥️' },
  { id: 'personalization', label: 'Personalisierung', icon: '🎨' },
  { id: 'security', label: 'Sicherheit', icon: '🛡️' },
];

const appsMeta = [
  { id: 'settings', label: 'Einstellungen', icon: '⚙️' },
  { id: 'staff', label: 'Personal Verwaltung', icon: '👥' },
  { id: 'groups', label: 'Nutzergruppen Management', icon: '🛡️' },
  { id: 'cases', label: 'Strafakten', icon: '📁' },
  { id: 'stats', label: 'Statistiken', icon: '📊' },
];

const emptyForm = {
  id: null,
  firstName: '',
  lastName: '',
  staffId: '',
  password: '',
  imageUrl: '',
  unitId: '',
  authLevel: 1,
  rank: '',
  groupId: '',
  notes: '',
  canLogin: true,
};

const statusLabels = ['Abgeschlossen', 'In Bearbeitung', 'Nicht Begonnen'];

const emptyCaseForm = {
  id: null,
  personName: '',
  personId: '',
  unitId: '',
  serviceRank: '',
  crime: '',
  punishment: '',
  penaltyLevel: '',
  authLevel: 1,
  statusLabel: 'Nicht Begonnen',
  imageUrl: '',
  notes: '',
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('sf_token'));
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [authLevels, setAuthLevels] = useState([]);
  const [loginForm, setLoginForm] = useState({ firstName: '', lastName: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  const [startOpen, setStartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openApps, setOpenApps] = useState(['settings']);
  const [activeApp, setActiveApp] = useState('settings');
  const [windowOrder, setWindowOrder] = useState(['settings']);
  const [wallpaperIndex, setWallpaperIndex] = useState(0);
  const [accent, setAccent] = useState('#0078d4');
  const [darkMode, setDarkMode] = useState(true);
  const [staffForm, setStaffForm] = useState(emptyForm);
  const [staffMessage, setStaffMessage] = useState('');
  const [groupMessage, setGroupMessage] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupAuthLevel, setGroupAuthLevel] = useState(1);
  const [newUnitName, setNewUnitName] = useState('');
  const [newAuthLevelName, setNewAuthLevelName] = useState('');
  const [newAuthLevelValue, setNewAuthLevelValue] = useState(1);
  const [groupTab, setGroupTab] = useState('groups');
  const [staffSearch, setStaffSearch] = useState('');
  const [strafakten, setStrafakten] = useState([]);
  const [strafakteLogs, setStrafakteLogs] = useState([]);
  const [strafStats, setStrafStats] = useState({ totals: { totalCases: 0, completed: 0, inProgress: 0, notStarted: 0 }, perUser: [], byUnit: [], byRank: [] });
  const [strafakteForm, setStrafakteForm] = useState(emptyCaseForm);
  const [strafMessage, setStrafMessage] = useState('');
  const [strafFilter, setStrafFilter] = useState({ unit: '', rank: '', status: '', sortBy: 'unit', order: 'asc' });
  const [strafSearch, setStrafSearch] = useState('');
  const [statsTab, setStatsTab] = useState('overview');
  const deferredStaffSearch = useDeferredValue(staffSearch);
  const deferredStrafSearch = useDeferredValue(strafSearch);
  const [settingsSection, setSettingsSection] = useState('system');
  const [submitting, setSubmitting] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [windowPositions, setWindowPositions] = useState({
    settings: { x: 110, y: 72 },
    staff: { x: 170, y: 100 },
    groups: { x: 230, y: 128 },
    cases: { x: 200, y: 76 },
    stats: { x: 260, y: 110 },
  });
  const startBtnRef = useRef(null);
  const startMenuRef = useRef(null);
  const searchBtnRef = useRef(null);
  const searchPanelRef = useRef(null);

  function nearestAuthLevelValue(value) {
    const numeric = Number(value || 1);
    if (!authLevels.length) return Math.max(1, numeric);
    return authLevels.reduce((best, item) => {
      return Math.abs(item.level - numeric) < Math.abs(best - numeric) ? item.level : best;
    }, authLevels[0].level);
  }

  const filteredStaff = useMemo(() => {
    const q = deferredStaffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((entry) => {
      return [entry.firstName, entry.lastName, entry.staffId, entry.rank, entry.permission, entry.notes]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [staff, deferredStaffSearch]);

  const canSeeStats = ['Admin', 'Superadmin'].includes(user?.groupName || '');

  const visibleApps = useMemo(() => {
    return appsMeta.filter((app) => app.id !== 'stats' || canSeeStats);
  }, [canSeeStats]);

  const filteredApps = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    if (!q) return visibleApps;
    return visibleApps.filter((a) => a.label.toLowerCase().includes(q));
  }, [appSearch, visibleApps]);

  const filteredStrafakten = useMemo(() => {
    const q = deferredStrafSearch.trim().toLowerCase();
    if (!q) return strafakten;
    return strafakten.filter((entry) => {
      return [entry.personName, entry.personId].join(' ').toLowerCase().includes(q);
    });
  }, [strafakten, deferredStrafSearch]);

  const permissions = user?.permissions || {};

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
  }, [accent]);

  useEffect(() => {
    document.body.classList.toggle('light', !darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!staffMessage) return;
    const t = setTimeout(() => setStaffMessage(''), 3000);
    return () => clearTimeout(t);
  }, [staffMessage]);

  useEffect(() => {
    if (!groupMessage) return;
    const t = setTimeout(() => setGroupMessage(''), 3000);
    return () => clearTimeout(t);
  }, [groupMessage]);

  useEffect(() => {
    if (!strafMessage) return;
    const t = setTimeout(() => setStrafMessage(''), 3500);
    return () => clearTimeout(t);
  }, [strafMessage]);

  useEffect(() => {
    function handleMouseDown(e) {
      if (startMenuRef.current && !startMenuRef.current.contains(e.target) && !startBtnRef.current?.contains(e.target)) {
        setStartOpen(false);
      }
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target) && !searchBtnRef.current?.contains(e.target)) {
        setSearchOpen(false);
        setAppSearch('');
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setStartOpen(false);
        setSearchOpen(false);
        setAppSearch('');
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;
    Promise.all([api.me(), api.staff(), api.groups(), api.units(), api.authLevels(), api.strafakten(), api.strafaktenLogs()])
      .then(async ([meData, staffData, groupsData, unitsData, authLevelsData, strafaktenData, logsData]) => {
        if (!active) return;
        setUser(meData.user);
        setStaff(staffData);
        setGroups(groupsData);
        setUnits(unitsData);
        setAuthLevels(authLevelsData);
        setStrafakten(strafaktenData);
        setStrafakteLogs(logsData);

        if (['Admin', 'Superadmin'].includes(meData.user?.groupName || '')) {
          try {
            const statsData = await api.strafaktenStats();
            if (active) setStrafStats(statsData);
          } catch {
            if (active) setStrafStats({ totals: { totalCases: 0, completed: 0, inProgress: 0, notStarted: 0 }, perUser: [], byUnit: [], byRank: [] });
          }
        }

        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('sf_token');
        if (!active) return;
        setToken(null);
        setUser(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function refreshData() {
    const [staffData, groupsData, unitsData, authLevelsData, meData] = await Promise.all([api.staff(), api.groups(), api.units(), api.authLevels(), api.me()]);
    setStaff(staffData);
    setGroups(groupsData);
    setUnits(unitsData);
    setAuthLevels(authLevelsData);
    setUser(meData.user);
  }

  async function refreshStrafaktenData(nextFilter = strafFilter) {
    const params = new URLSearchParams();
    if (nextFilter.unit) params.set('unit', nextFilter.unit);
    if (nextFilter.rank) params.set('rank', nextFilter.rank);
    if (nextFilter.status) params.set('status', nextFilter.status);
    params.set('sortBy', nextFilter.sortBy);
    params.set('order', nextFilter.order);

    const query = `?${params.toString()}`;
    const [casesData, logsData] = await Promise.all([api.strafakten(query), api.strafaktenLogs()]);
    setStrafakten(casesData);
    setStrafakteLogs(logsData);

    if (canSeeStats) {
      const statsData = await api.strafaktenStats();
      setStrafStats(statsData);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError('');
    try {
      const data = await api.login(loginForm);
      localStorage.setItem('sf_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setLoginForm({ firstName: '', lastName: '', password: '' });
    } catch (error) {
      setLoginError(error.message);
    }
  }

  function logout() {
    localStorage.removeItem('sf_token');
    setToken(null);
    setUser(null);
    setStaff([]);
    setGroups([]);
    setOpenApps(['settings']);
    setActiveApp('settings');
  }

  function openApp(appId) {
    setOpenApps((current) => (current.includes(appId) ? current : [...current, appId]));
    setWindowOrder((current) => {
      const rest = current.filter((id) => id !== appId);
      return [...rest, appId];
    });
    setActiveApp(appId);
    setStartOpen(false);
    setSearchOpen(false);
    setAppSearch('');
  }

  function closeApp(appId) {
    setOpenApps((current) => current.filter((entry) => entry !== appId));
    setWindowOrder((current) => current.filter((entry) => entry !== appId));
    if (activeApp === appId) {
      const next = windowOrder.filter((entry) => entry !== appId).at(-1) || null;
      setActiveApp(next);
    }
  }

  function focusWindow(appId) {
    setActiveApp(appId);
    setWindowOrder((current) => {
      const rest = current.filter((id) => id !== appId);
      return [...rest, appId];
    });
  }

  function getWindowZIndex(appId) {
    const idx = windowOrder.indexOf(appId);
    return idx === -1 ? 20 : 20 + idx;
  }

  function moveWindow(appId, nextPosition) {
    const maxX = Math.max(12, window.innerWidth - 320);
    const maxY = Math.max(12, window.innerHeight - 220);
    const x = Math.min(maxX, Math.max(12, nextPosition.x));
    const y = Math.min(maxY, Math.max(12, nextPosition.y));
    setWindowPositions((current) => ({ ...current, [appId]: { x, y } }));
  }

  async function submitStaff(mode) {
    setStaffMessage('');
    setSubmitting(true);
    try {
      const payload = {
        firstName: staffForm.firstName,
        lastName: staffForm.lastName,
        staffId: staffForm.staffId,
        password: staffForm.password,
        imageUrl: staffForm.imageUrl,
        unitId: Number(staffForm.unitId),
        authLevel: nearestAuthLevelValue(staffForm.authLevel),
        rank: staffForm.rank,
        groupId: Number(staffForm.groupId),
        notes: staffForm.notes,
        canLogin: staffForm.canLogin,
      };
      if (mode === 'create') {
        await api.createStaff(payload);
        setStaffMessage('Mitarbeiter angelegt.');
      } else {
        await api.updateStaff(staffForm.id, payload);
        setStaffMessage('Eintrag aktualisiert.');
      }
      setStaffForm(emptyForm);
      await refreshData();
    } catch (error) {
      setStaffMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(entry) {
    setStaffForm({
      id: entry.id,
      firstName: entry.firstName,
      lastName: entry.lastName,
      staffId: entry.staffId,
      password: '',
      imageUrl: entry.imageUrl || '',
      unitId: String(entry.unitId || ''),
      authLevel: String(nearestAuthLevelValue(entry.authLevel || 1)),
      rank: entry.rank || '',
      groupId: String(entry.groupId),
      notes: entry.notes || '',
      canLogin: entry.canLogin,
    });
    openApp('staff');
  }

  async function removeStaff(id) {
    try {
      await api.deleteStaff(id);
      await refreshData();
    } catch (error) {
      setStaffMessage(error.message);
    }
  }

  async function saveGroup(groupId, patch) {
    try {
      await api.updateGroup(groupId, patch);
      setGroupMessage('Gruppenrechte gespeichert.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    }
  }

  async function addGroup() {
    setSubmitting(true);
    try {
      await api.createGroup({ name: groupName, authLevel: Number(groupAuthLevel || 1) });
      setGroupName('');
      setGroupAuthLevel(1);
      setGroupMessage('Gruppe angelegt.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteGroup(id) {
    setSubmitting(true);
    try {
      await api.deleteGroup(id);
      setGroupMessage('Gruppe entfernt.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function addUnit() {
    setSubmitting(true);
    try {
      await api.createUnit({ name: newUnitName });
      setNewUnitName('');
      setGroupMessage('Einheit angelegt.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateUnit(unitId, name) {
    setSubmitting(true);
    try {
      await api.updateUnit(unitId, { name });
      setGroupMessage('Einheit aktualisiert.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeUnit(unitId) {
    setSubmitting(true);
    try {
      await api.deleteUnit(unitId);
      setGroupMessage('Einheit entfernt.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function addAuthLevel() {
    setSubmitting(true);
    try {
      await api.createAuthLevel({ name: newAuthLevelName, level: Number(newAuthLevelValue || 1) });
      setNewAuthLevelName('');
      setNewAuthLevelValue(1);
      setGroupMessage('Autorisierungsstufe angelegt.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateAuthLevel(id, payload) {
    setSubmitting(true);
    try {
      await api.updateAuthLevel(id, payload);
      setGroupMessage('Autorisierungsstufe aktualisiert.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeAuthLevel(id) {
    setSubmitting(true);
    try {
      await api.deleteAuthLevel(id);
      setGroupMessage('Autorisierungsstufe entfernt.');
      await refreshData();
    } catch (error) {
      setGroupMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStrafakte(mode) {
    setStrafMessage('');
    setSubmitting(true);
    try {
      const payload = {
        personName: strafakteForm.personName,
        personId: strafakteForm.personId,
        unitId: Number(strafakteForm.unitId),
        serviceRank: strafakteForm.serviceRank,
        crime: strafakteForm.crime,
        punishment: strafakteForm.punishment,
        penaltyLevel: strafakteForm.penaltyLevel,
        authLevel: nearestAuthLevelValue(strafakteForm.authLevel),
        statusLabel: strafakteForm.statusLabel,
        imageUrl: strafakteForm.imageUrl,
        notes: strafakteForm.notes,
      };

      if (mode === 'create') {
        await api.createStrafakte(payload);
        setStrafMessage('Strafakte erstellt.');
      } else {
        await api.updateStrafakte(strafakteForm.id, payload);
        setStrafMessage('Strafakte aktualisiert.');
      }

      setStrafakteForm(emptyCaseForm);
      await refreshStrafaktenData();
    } catch (error) {
      setStrafMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function editStrafakte(entry) {
    setStrafakteForm({
      id: entry.id,
      personName: entry.personName,
      personId: entry.personId,
      unitId: String(entry.unitId || ''),
      serviceRank: entry.serviceRank,
      crime: entry.crime,
      punishment: entry.punishment,
      penaltyLevel: entry.penaltyLevel,
      authLevel: String(nearestAuthLevelValue(entry.authLevel || 1)),
      statusLabel: entry.statusLabel,
      imageUrl: entry.imageUrl || '',
      notes: entry.notes || '',
    });
    openApp('cases');
  }

  async function removeStrafakte(id) {
    setStrafMessage('');
    setSubmitting(true);
    try {
      await api.deleteStrafakte(id);
      setStrafMessage('Strafakte gelöscht.');
      await refreshStrafaktenData();
    } catch (error) {
      setStrafMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function applyStrafFilter() {
    setSubmitting(true);
    try {
      await refreshStrafaktenData(strafFilter);
    } catch (error) {
      setStrafMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function resetStrafFilter() {
    const next = { unit: '', rank: '', status: '', sortBy: 'unit', order: 'asc' };
    setStrafFilter(next);
    setSubmitting(true);
    try {
      await refreshStrafaktenData(next);
    } catch (error) {
      setStrafMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      refreshStrafaktenData(strafFilter).catch((error) => setStrafMessage(error.message));
    }, 220);
    return () => clearTimeout(timer);
  }, [
    user,
    strafFilter.unit,
    strafFilter.rank,
    strafFilter.status,
    strafFilter.sortBy,
    strafFilter.order,
  ]);

  if (loading) {
    return <div className="boot-screen">System wird geladen...</div>;
  }

  return (
    <div className="app-shell" style={{ '--desktop-bg': wallPapers[wallpaperIndex], '--accent': accent }}>
      {!user && (
        <div className="login-overlay">
          <form className="login-card-react" onSubmit={handleLogin}>
            <div className="login-brand-react">SF Desktop</div>
            <h1>Anmeldung</h1>
            <label>
              Vorname
              <input
                autoComplete="given-name"
                value={loginForm.firstName}
                onChange={(e) => setLoginForm((s) => ({ ...s, firstName: e.target.value }))}
                placeholder="System"
              />
            </label>
            <label>
              Nachname
              <input
                autoComplete="family-name"
                value={loginForm.lastName}
                onChange={(e) => setLoginForm((s) => ({ ...s, lastName: e.target.value }))}
                placeholder="Admin"
              />
            </label>
            <label>
              Passwort
              <input
                type="password"
                autoComplete="current-password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="••••"
              />
            </label>
            <button type="submit">Anmelden</button>
            <div className="login-hint">Standardzugang: System / Admin / 1234</div>
            {loginError && <div className="error-box">{loginError}</div>}
          </form>
        </div>
      )}

      <div className="desktop-react">
        {visibleApps.map((app) => (
          <button key={app.id} className="desktop-icon-react" onDoubleClick={() => openApp(app.id)} onClick={() => setActiveApp(app.id)}>
            <span>{app.icon}</span>
            <small>{app.label}</small>
          </button>
        ))}

        {openApps.includes('settings') && (
          <Window
            title="Einstellungen"
            icon="⚙️"
            active={activeApp === 'settings'}
            onFocus={() => focusWindow('settings')}
            onClose={() => closeApp('settings')}
            position={windowPositions.settings}
            zIndex={getWindowZIndex('settings')}
            onMove={(position) => moveWindow('settings', position)}
          >
            <div className="settings-layout-react">
              <aside className="settings-sidebar-react">
                {settingsSections.map((section) => (
                  <button key={section.id} className={settingsSection === section.id ? 'active' : ''} onClick={() => setSettingsSection(section.id)}>
                    <span>{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </aside>
              <section className="settings-main-react">
                {settingsSection === 'system' && (
                  <SettingsCard title="Systemstatus" text={`Angemeldet als ${user ? `${user.firstName} ${user.lastName}` : '-'}`} />
                )}
                {settingsSection === 'display' && (
                  <div className="settings-stack-react">
                    <SettingsCard title="Hintergrund" text="Desktop-Hintergrund wechseln">
                      <div className="swatches">
                        {wallPapers.map((_, idx) => (
                          <button key={idx} className={wallpaperIndex === idx ? 'swatch active' : 'swatch'} onClick={() => setWallpaperIndex(idx)} />
                        ))}
                      </div>
                    </SettingsCard>
                  </div>
                )}
                {settingsSection === 'personalization' && (
                  <div className="settings-stack-react">
                    <SettingsCard title="Akzentfarbe" text="Steuert Highlights im System">
                      <div className="accent-row-react">
                        {['#0078d4', '#8764b8', '#038387', '#107c10', '#ca7700', '#c42b1c'].map((color) => (
                          <button key={color} className={accent === color ? 'accent-dot active' : 'accent-dot'} style={{ background: color }} onClick={() => setAccent(color)} />
                        ))}
                      </div>
                    </SettingsCard>
                    <SettingsCard title="Design" text="Hell oder dunkel">
                      <button className="primary-btn" onClick={() => setDarkMode((s) => !s)}>{darkMode ? 'Hell aktivieren' : 'Dunkel aktivieren'}</button>
                    </SettingsCard>
                  </div>
                )}
                {settingsSection === 'security' && (
                  <SettingsCard title="Rechtemodell" text="User = Read only, Admin = Edit, Superadmin = volle Kontrolle inkl. Gruppenverwaltung." />
                )}
              </section>
            </div>
          </Window>
        )}

        {openApps.includes('staff') && (
          <Window
            title="Personal Verwaltung"
            icon="👥"
            active={activeApp === 'staff'}
            onFocus={() => focusWindow('staff')}
            onClose={() => closeApp('staff')}
            position={windowPositions.staff}
            zIndex={getWindowZIndex('staff')}
            onMove={(position) => moveWindow('staff', position)}
          >
            <div className="management-page">
              <div className="page-header">
                <div>
                  <h2>Personal Verwaltung</h2>
                  <p>Client spricht mit Express-API, Daten liegen in SQLite.</p>
                </div>
                <input className="search-field" value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Mitarbeiter suchen" />
              </div>

              <div className="staff-form-layout">
                <div className={staffForm.id ? 'image-preview-panel top-left expanded' : 'image-preview-panel top-left compact'}>
                  {staffForm.imageUrl ? (
                    <img className={staffForm.id ? 'preview-large' : 'preview-compact'} src={staffForm.imageUrl} alt="Vorschau" />
                  ) : (
                    <div className={staffForm.id ? 'image-fallback large' : 'image-fallback compact'}>
                      <span className="placeholder-icon">👤</span>
                      <small>{staffForm.id ? 'Kein Bild fuer diesen Eintrag' : 'Bildvorschau nur im Bearbeiten-Modus'}</small>
                    </div>
                  )}
                </div>
                <div className="form-grid-react">
                  <input value={staffForm.firstName} onChange={(e) => setStaffForm((s) => ({ ...s, firstName: e.target.value }))} placeholder="Vorname" disabled={!permissions.canEdit && !permissions.canCreate} />
                  <input value={staffForm.lastName} onChange={(e) => setStaffForm((s) => ({ ...s, lastName: e.target.value }))} placeholder="Nachname" disabled={!permissions.canEdit && !permissions.canCreate} />
                  <input value={staffForm.staffId} onChange={(e) => setStaffForm((s) => ({ ...s, staffId: e.target.value }))} placeholder="ID" disabled={!permissions.canEdit && !permissions.canCreate} />
                  <input type="password" value={staffForm.password} onChange={(e) => setStaffForm((s) => ({ ...s, password: e.target.value }))} placeholder={staffForm.id ? 'Neues Passwort optional' : 'Passwort'} disabled={!permissions.canEdit && !permissions.canCreate} />
                  <input value={staffForm.imageUrl} onChange={(e) => setStaffForm((s) => ({ ...s, imageUrl: e.target.value }))} placeholder="Bild URL" disabled={!permissions.canEdit && !permissions.canCreate} />
                  <select value={staffForm.unitId} onChange={(e) => setStaffForm((s) => ({ ...s, unitId: e.target.value }))} disabled={!permissions.canEdit && !permissions.canCreate}>
                    <option value="">Einheit wählen</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                  <select value={staffForm.authLevel} onChange={(e) => setStaffForm((s) => ({ ...s, authLevel: e.target.value }))} disabled={!permissions.canEdit && !permissions.canCreate}>
                    {authLevels.map((level) => (
                      <option key={level.id} value={level.level}>{level.name} (Level {level.level})</option>
                    ))}
                  </select>
                  <input value={staffForm.rank} onChange={(e) => setStaffForm((s) => ({ ...s, rank: e.target.value }))} placeholder="Rang / Dienstgrad" disabled={!permissions.canEdit && !permissions.canCreate} />
                  <select value={staffForm.groupId} onChange={(e) => setStaffForm((s) => ({ ...s, groupId: e.target.value }))} disabled={!permissions.canManageGroups}>
                    <option value="">Berechtigung wählen</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                  <label className="checkbox-line">
                    <input type="checkbox" checked={staffForm.canLogin} onChange={(e) => setStaffForm((s) => ({ ...s, canLogin: e.target.checked }))} disabled={!permissions.canEdit && !permissions.canCreate} />
                    Login aktiv
                  </label>
                  <textarea value={staffForm.notes} onChange={(e) => setStaffForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Anmerkungen" disabled={!permissions.canEdit && !permissions.canCreate} />
                </div>
              </div>

              <div className="action-row-react">
                <button className="primary-btn" disabled={!permissions.canCreate || submitting} onClick={() => submitStaff('create')}>Erstellen</button>
                <button className="primary-btn secondary" disabled={!permissions.canEdit || !staffForm.id || submitting} onClick={() => submitStaff('update')}>Speichern</button>
                <button className="ghost-btn" disabled={submitting} onClick={() => setStaffForm(emptyForm)}>Zurücksetzen</button>
                {staffMessage && <span className="message-inline">{staffMessage}</span>}
              </div>

              <table className="data-table-react">
                <thead>
                  <tr>
                    <th>Bild</th>
                    <th>Vorname</th>
                    <th>Nachname</th>
                    <th>ID</th>
                    <th>Einheit</th>
                    <th>Rang</th>
                    <th>Auth-Stufe</th>
                    <th>Berechtigung</th>
                    <th>Anmerkungen</th>
                    <th>Login</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.imageUrl ? <img className="table-avatar-circle" src={entry.imageUrl} alt={entry.firstName} /> : <div className="table-avatar-circle empty">-</div>}</td>
                      <td>{entry.firstName}</td>
                      <td>{entry.lastName}</td>
                      <td>{entry.staffId}</td>
                      <td>{entry.unitName || '-'}</td>
                      <td>{entry.rank || '-'}</td>
                      <td>{entry.authLevel || 1}</td>
                      <td><PermissionBadge name={entry.permission} /></td>
                      <td>{entry.notes || '-'}</td>
                      <td>{entry.canLogin ? 'Ja' : 'Nein'}</td>
                      <td>
                        <div className="row-actions">
                          <button className="ghost-btn small" disabled={!permissions.canEdit} onClick={() => startEdit(entry)}>Bearbeiten</button>
                          <button className="danger-btn small" disabled={!permissions.canDelete} onClick={() => removeStaff(entry.id)}>Löschen</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Window>
        )}

        {openApps.includes('groups') && (
          <Window
            title="Nutzergruppen Management"
            icon="🛡️"
            active={activeApp === 'groups'}
            onFocus={() => focusWindow('groups')}
            onClose={() => closeApp('groups')}
            position={windowPositions.groups}
            zIndex={getWindowZIndex('groups')}
            onMove={(position) => moveWindow('groups', position)}
          >
            <div className="management-page">
              <div className="page-header">
                <div>
                  <h2>Nutzergruppen Management</h2>
                  <p>Nur Superadmins dürfen Gruppen anlegen, ändern oder löschen.</p>
                </div>
              </div>

              <div className="stats-tabs">
                <button className={groupTab === 'groups' ? 'active' : ''} onClick={() => setGroupTab('groups')}>Gruppen</button>
                <button className={groupTab === 'units' ? 'active' : ''} onClick={() => setGroupTab('units')}>Einheiten</button>
                <button className={groupTab === 'auth-levels' ? 'active' : ''} onClick={() => setGroupTab('auth-levels')}>Autorisierungsstufen</button>
              </div>

              {groupTab === 'groups' && (
                <>
                  <div className="action-row-react">
                    <input className="search-field short" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Neue Gruppe" disabled={!permissions.canManageGroups} />
                    <input type="number" min="1" className="search-field short" value={groupAuthLevel} onChange={(e) => setGroupAuthLevel(e.target.value)} placeholder="Auth-Stufe" disabled={!permissions.canManageGroups} />
                    <button className="primary-btn" disabled={!permissions.canManageGroups || submitting} onClick={addGroup}>Gruppe hinzufügen</button>
                    {groupMessage && <span className="message-inline">{groupMessage}</span>}
                  </div>

                  <table className="data-table-react">
                    <thead>
                      <tr>
                        <th>Gruppe</th>
                        <th>Auth-Stufe</th>
                        <th>Read</th>
                        <th>Edit</th>
                        <th>Create</th>
                        <th>Delete</th>
                        <th>User Gruppen ändern</th>
                        <th>Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group) => (
                        <tr key={group.id}>
                          <td>
                            <input
                              className="search-field short"
                              value={group.name}
                              disabled={!permissions.canManageGroups}
                              onChange={(e) => setGroups((current) => current.map((g) => (g.id === group.id ? { ...g, name: e.target.value } : g)))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={group.authLevel || 1}
                              disabled={!permissions.canManageGroups}
                              onChange={(e) => setGroups((current) => current.map((g) => (g.id === group.id ? { ...g, authLevel: Number(e.target.value || 1) } : g)))}
                              className="inline-number"
                            />
                          </td>
                          {['canRead', 'canEdit', 'canCreate', 'canDelete', 'canManageGroups'].map((key) => (
                            <td key={key}>
                              <input
                                type="checkbox"
                                checked={!!group[key]}
                                disabled={!permissions.canManageGroups}
                                onChange={(e) => setGroups((current) => current.map((g) => (g.id === group.id ? { ...g, [key]: e.target.checked } : g)))}
                              />
                            </td>
                          ))}
                          <td>
                            <button className="ghost-btn small" disabled={!permissions.canManageGroups || submitting} onClick={() => saveGroup(group.id, group)}>
                              Speichern
                            </button>
                            <button className="danger-btn small" disabled={!permissions.canManageGroups || submitting} onClick={() => deleteGroup(group.id)}>
                              Entfernen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {groupTab === 'units' && (
                <>
                  <div className="action-row-react">
                    <input className="search-field" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="Neue Einheit" disabled={!permissions.canManageGroups} />
                    <button className="primary-btn" disabled={!permissions.canManageGroups || submitting} onClick={addUnit}>Einheit hinzufügen</button>
                    {groupMessage && <span className="message-inline">{groupMessage}</span>}
                  </div>

                  <table className="data-table-react">
                    <thead>
                      <tr>
                        <th>Einheit</th>
                        <th>Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((unit) => (
                        <tr key={unit.id}>
                          <td>
                            <input
                              className="search-field"
                              value={unit.name}
                              disabled={!permissions.canManageGroups}
                              onChange={(e) => setUnits((current) => current.map((u) => (u.id === unit.id ? { ...u, name: e.target.value } : u)))}
                            />
                          </td>
                          <td>
                            <button className="ghost-btn small" disabled={!permissions.canManageGroups || submitting} onClick={() => updateUnit(unit.id, unit.name)}>
                              Speichern
                            </button>
                            <button className="danger-btn small" disabled={!permissions.canManageGroups || submitting} onClick={() => removeUnit(unit.id)}>
                              Entfernen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {groupTab === 'auth-levels' && (
                <>
                  <div className="action-row-react">
                    <input className="search-field" value={newAuthLevelName} onChange={(e) => setNewAuthLevelName(e.target.value)} placeholder="Name der Stufe" disabled={!permissions.canManageGroups} />
                    <input type="number" min="1" className="search-field short" value={newAuthLevelValue} onChange={(e) => setNewAuthLevelValue(e.target.value)} placeholder="Level" disabled={!permissions.canManageGroups} />
                    <button className="primary-btn" disabled={!permissions.canManageGroups || submitting} onClick={addAuthLevel}>Stufe hinzufügen</button>
                    {groupMessage && <span className="message-inline">{groupMessage}</span>}
                  </div>

                  <table className="data-table-react">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Level</th>
                        <th>Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authLevels.map((level) => (
                        <tr key={level.id}>
                          <td>
                            <input
                              className="search-field"
                              value={level.name}
                              disabled={!permissions.canManageGroups}
                              onChange={(e) => setAuthLevels((current) => current.map((a) => (a.id === level.id ? { ...a, name: e.target.value } : a)))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              className="inline-number"
                              value={level.level}
                              disabled={!permissions.canManageGroups}
                              onChange={(e) => setAuthLevels((current) => current.map((a) => (a.id === level.id ? { ...a, level: Number(e.target.value || 1) } : a)))}
                            />
                          </td>
                          <td>
                            <button className="ghost-btn small" disabled={!permissions.canManageGroups || submitting} onClick={() => updateAuthLevel(level.id, { name: level.name, level: level.level })}>
                              Speichern
                            </button>
                            <button className="danger-btn small" disabled={!permissions.canManageGroups || submitting} onClick={() => removeAuthLevel(level.id)}>
                              Entfernen
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </Window>
        )}

        {openApps.includes('cases') && (
          <Window
            title="Strafakten"
            icon="📁"
            active={activeApp === 'cases'}
            onFocus={() => focusWindow('cases')}
            onClose={() => closeApp('cases')}
            position={windowPositions.cases}
            zIndex={getWindowZIndex('cases')}
            onMove={(position) => moveWindow('cases', position)}
          >
            <div className="management-page">
              <div className="page-header">
                <div>
                  <h2>Strafakten</h2>
                  <p>Jeder Benutzer kann Strafakten anlegen. Alle Änderungen werden automatisch protokolliert.</p>
                </div>
              </div>

              <div className="form-grid-react straf-grid">
                <input value={strafakteForm.personName} onChange={(e) => setStrafakteForm((s) => ({ ...s, personName: e.target.value }))} placeholder="Name" />
                <input value={strafakteForm.personId} onChange={(e) => setStrafakteForm((s) => ({ ...s, personId: e.target.value }))} placeholder="ID" />
                <select value={strafakteForm.unitId} onChange={(e) => setStrafakteForm((s) => ({ ...s, unitId: e.target.value }))}>
                  <option value="">Einheit wählen</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
                <input value={strafakteForm.serviceRank} onChange={(e) => setStrafakteForm((s) => ({ ...s, serviceRank: e.target.value }))} placeholder="Dienstgrad" />
                <input value={strafakteForm.crime} onChange={(e) => setStrafakteForm((s) => ({ ...s, crime: e.target.value }))} placeholder="Verbrechen" />
                <input value={strafakteForm.punishment} onChange={(e) => setStrafakteForm((s) => ({ ...s, punishment: e.target.value }))} placeholder="Strafe" />
                <input value={strafakteForm.penaltyLevel} onChange={(e) => setStrafakteForm((s) => ({ ...s, penaltyLevel: e.target.value }))} placeholder="Straflevel" />
                <select value={strafakteForm.authLevel} onChange={(e) => setStrafakteForm((s) => ({ ...s, authLevel: e.target.value }))}>
                  {authLevels.map((level) => (
                    <option key={level.id} value={level.level}>{level.name} (Level {level.level})</option>
                  ))}
                </select>
                <select value={strafakteForm.statusLabel} onChange={(e) => setStrafakteForm((s) => ({ ...s, statusLabel: e.target.value }))}>
                  {statusLabels.map((label) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
                <input value={strafakteForm.imageUrl} onChange={(e) => setStrafakteForm((s) => ({ ...s, imageUrl: e.target.value }))} placeholder="Bild URL" />
                <textarea value={strafakteForm.notes} onChange={(e) => setStrafakteForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Anmerkungen" />
              </div>

              <div className="action-row-react">
                <button className="primary-btn" disabled={submitting} onClick={() => submitStrafakte('create')}>Erstellen</button>
                <button className="primary-btn secondary" disabled={submitting || !strafakteForm.id} onClick={() => submitStrafakte('update')}>Speichern</button>
                <button className="ghost-btn" disabled={submitting} onClick={() => setStrafakteForm(emptyCaseForm)}>Zurücksetzen</button>
                {strafMessage && <span className="message-inline">{strafMessage}</span>}
              </div>

              <div className="action-row-react filter-row">
                <input className="search-field short" value={strafSearch} onChange={(e) => setStrafSearch(e.target.value)} placeholder="Name / ID suchen" />
                <input className="search-field short" value={strafFilter.unit} onChange={(e) => setStrafFilter((s) => ({ ...s, unit: e.target.value }))} placeholder="Einheit filtern" />
                <input className="search-field short" value={strafFilter.rank} onChange={(e) => setStrafFilter((s) => ({ ...s, rank: e.target.value }))} placeholder="Dienstgrad filtern" />
                <select className="filter-select" value={strafFilter.status} onChange={(e) => setStrafFilter((s) => ({ ...s, status: e.target.value }))}>
                  <option value="">Alle Status</option>
                  {statusLabels.map((label) => <option key={label} value={label}>{label}</option>)}
                </select>
                <select className="filter-select" value={strafFilter.sortBy} onChange={(e) => setStrafFilter((s) => ({ ...s, sortBy: e.target.value }))}>
                  <option value="unit">Sortierung: Einheit</option>
                  <option value="rank">Sortierung: Dienstgrad</option>
                </select>
                <select className="filter-select" value={strafFilter.order} onChange={(e) => setStrafFilter((s) => ({ ...s, order: e.target.value }))}>
                  <option value="asc">Aufsteigend</option>
                  <option value="desc">Absteigend</option>
                </select>
                <button className="ghost-btn" disabled={submitting} onClick={resetStrafFilter}>Reset</button>
              </div>

              <table className="data-table-react">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Einheit</th>
                    <th>Dienstgrad</th>
                    <th>Verbrechen</th>
                    <th>Strafe</th>
                    <th>Level</th>
                    <th>Auth-Stufe</th>
                    <th>Status</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStrafakten.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.personName}</td>
                      <td>{entry.personId}</td>
                      <td>{entry.unitName}</td>
                      <td>{entry.serviceRank}</td>
                      <td>{entry.crime}</td>
                      <td>{entry.punishment}</td>
                      <td>{entry.penaltyLevel}</td>
                      <td>{entry.authLevel || 1}</td>
                      <td><span className={`status-pill ${entry.statusLabel === 'Abgeschlossen' ? 'done' : entry.statusLabel === 'In Bearbeitung' ? 'progress' : 'todo'}`}>{entry.statusLabel}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="ghost-btn small" onClick={() => editStrafakte(entry)}>Bearbeiten</button>
                          <button className="danger-btn small" disabled={!permissions.canDelete || submitting} onClick={() => removeStrafakte(entry.id)}>Löschen</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Window>
        )}

        {openApps.includes('stats') && canSeeStats && (
          <Window
            title="Statistiken"
            icon="📊"
            active={activeApp === 'stats'}
            onFocus={() => focusWindow('stats')}
            onClose={() => closeApp('stats')}
            position={windowPositions.stats}
            zIndex={getWindowZIndex('stats')}
            onMove={(position) => moveWindow('stats', position)}
          >
            <div className="management-page">
              <div className="page-header">
                <div>
                  <h2>Statistiken</h2>
                  <p>Nur für Admins und Superadmins: Aktivität und Kennzahlen zu Strafakten.</p>
                </div>
                <button className="ghost-btn" onClick={() => refreshStrafaktenData()}>Aktualisieren</button>
              </div>

              <div className="stats-tabs">
                <button className={statsTab === 'overview' ? 'active' : ''} onClick={() => setStatsTab('overview')}>Übersicht</button>
                <button className={statsTab === 'log' ? 'active' : ''} onClick={() => setStatsTab('log')}>Änderungslog</button>
              </div>

              {statsTab === 'overview' && (
                <>
                  <div className="stats-grid">
                    <div className="settings-card-react"><strong>Gesamt</strong><p>{strafStats.totals.totalCases || 0} Strafakten</p></div>
                    <div className="settings-card-react"><strong>Abgeschlossen</strong><p>{strafStats.totals.completed || 0}</p></div>
                    <div className="settings-card-react"><strong>In Bearbeitung</strong><p>{strafStats.totals.inProgress || 0}</p></div>
                    <div className="settings-card-react"><strong>Nicht Begonnen</strong><p>{strafStats.totals.notStarted || 0}</p></div>
                  </div>

                  <h3>Aktivität pro Benutzer</h3>
                  <table className="data-table-react compact-table">
                    <thead>
                      <tr>
                        <th>Benutzer</th>
                        <th>Erstellt</th>
                        <th>Bearbeitet</th>
                        <th>Gelöscht</th>
                        <th>Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strafStats.perUser.map((row) => (
                        <tr key={row.staffId}>
                          <td>{row.name}</td>
                          <td>{row.createdCount}</td>
                          <td>{row.updatedCount}</td>
                          <td>{row.deletedCount}</td>
                          <td>{row.totalActions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="stats-grid two-cols">
                    <div>
                      <h3>Nach Einheit</h3>
                      <table className="data-table-react compact-table">
                        <thead><tr><th>Einheit</th><th>Anzahl</th></tr></thead>
                        <tbody>
                          {strafStats.byUnit.map((row) => (
                            <tr key={row.unitName}><td>{row.unitName}</td><td>{row.count}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h3>Nach Dienstgrad</h3>
                      <table className="data-table-react compact-table">
                        <thead><tr><th>Dienstgrad</th><th>Anzahl</th></tr></thead>
                        <tbody>
                          {strafStats.byRank.map((row) => (
                            <tr key={row.serviceRank}><td>{row.serviceRank}</td><td>{row.count}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {statsTab === 'log' && (
                <>
                  <h3>Änderungslog (neueste 200)</h3>
                  <table className="data-table-react compact-table">
                    <thead>
                      <tr>
                        <th>Zeit</th>
                        <th>Benutzer</th>
                        <th>Aktion</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strafakteLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.createdAt).toLocaleString('de-DE')}</td>
                          <td>{log.actorName}</td>
                          <td>{log.actionType}</td>
                          <td>{log.changesText || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </Window>
        )}
      </div>

      <div className="taskbar-react">
        <button ref={startBtnRef} className="taskbar-start" onClick={() => setStartOpen((s) => !s)}>⊞</button>
        <button ref={searchBtnRef} className="taskbar-search" onClick={() => setSearchOpen((s) => !s)}>Suchen</button>
        <div className="taskbar-open-apps">
          {visibleApps.map((app) => (
            <button key={app.id} className={activeApp === app.id ? 'task-app active' : 'task-app'} onClick={() => openApp(app.id)}>
              {app.icon}
            </button>
          ))}
        </div>
        <div className="taskbar-userbox">
          <span>{user ? `${user.firstName} ${user.lastName}` : 'Nicht angemeldet'}</span>
          {user && <button className="ghost-btn small" onClick={logout}>Abmelden</button>}
        </div>
      </div>

      {startOpen && (
        <div className="start-menu-react" ref={startMenuRef}>
          {visibleApps.map((app) => (
            <button key={app.id} className="start-app-react" onClick={() => openApp(app.id)}>
              <span>{app.icon}</span>
              {app.label}
            </button>
          ))}
        </div>
      )}

      {searchOpen && (
        <div className="search-panel-react" ref={searchPanelRef}>
          <input
            autoFocus
            value={appSearch}
            onChange={(e) => setAppSearch(e.target.value)}
            placeholder="App suchen..."
            className="search-field"
          />
          {filteredApps.map((app) => (
            <button key={app.id} className="search-result-react" onClick={() => openApp(app.id)}>
              <span>{app.icon}</span>
              {app.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Window({ title, icon, active, onFocus, onClose, position, zIndex, onMove, children }) {
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  useEffect(() => {
    function handleMouseMove(e) {
      if (!draggingRef.current) return;
      onMove({
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      });
    }

    function handleMouseUp() {
      draggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onMove]);

  function handleTitleMouseDown(e) {
    // Buttons im Titelbereich sollen weiter klickbar bleiben
    if (e.target.closest('button')) return;
    draggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    onFocus();
  }

  return (
    <div className={active ? 'window-react active' : 'window-react'} style={{ left: position.x, top: position.y, zIndex }} onMouseDown={onFocus}>
      <div className="window-titlebar-react" onMouseDown={handleTitleMouseDown}>
        <div>{icon} {title}</div>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="window-content-react">{children}</div>
    </div>
  );
}

function SettingsCard({ title, text, children }) {
  return (
    <div className="settings-card-react">
      <strong>{title}</strong>
      <p>{text}</p>
      {children}
    </div>
  );
}

function PermissionBadge({ name }) {
  const cls = name === 'Superadmin' ? 'perm super' : name === 'Admin' ? 'perm admin' : 'perm user';
  return <span className={cls}>{name}</span>;
}

export default App;
