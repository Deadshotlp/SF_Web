/* ============================
	 WINDOWS DESKTOP – MAIN SCRIPT
============================ */

// ===========================
// CLOCK
// ===========================
function updateClock() {
	const now = new Date();
	const hh = String(now.getHours()).padStart(2, '0');
	const mm = String(now.getMinutes()).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	const mo = String(now.getMonth() + 1).padStart(2, '0');
	const yy = now.getFullYear();
	const timeEl = document.getElementById('clock-time');
	const dateEl = document.getElementById('clock-date');
	if (timeEl) timeEl.textContent = `${hh}:${mm}`;
	if (dateEl) dateEl.textContent = `${dd}.${mo}.${yy}`;
}
updateClock();
setInterval(updateClock, 1000);


// ===========================
// WALLPAPERS & THEMING
// ===========================
const WALLPAPERS = [
	{ name: 'Mitternachtsblau', value: 'radial-gradient(ellipse at 20% 80%,rgba(0,90,200,.4) 0%,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(80,0,200,.35) 0%,transparent 50%),linear-gradient(145deg,#0a0a1a 0%,#0d1b3e 35%,#1a0d3e 65%,#0a1525 100%)' },
	{ name: 'Smaragdwald',      value: 'radial-gradient(ellipse at 30% 70%,rgba(0,180,100,.4) 0%,transparent 50%),radial-gradient(ellipse at 70% 30%,rgba(0,80,180,.35) 0%,transparent 50%),linear-gradient(145deg,#001a0a 0%,#0a2e1a 40%,#091e35 100%)' },
	{ name: 'Vulkanrot',        value: 'radial-gradient(ellipse at 50% 50%,rgba(200,50,50,.3) 0%,transparent 60%),radial-gradient(ellipse at 80% 80%,rgba(200,100,0,.3) 0%,transparent 50%),linear-gradient(145deg,#1a0a0a 0%,#2e1010 40%,#1a1000 100%)' },
	{ name: 'Nebelviolett',     value: 'radial-gradient(ellipse at 20% 30%,rgba(200,0,200,.35) 0%,transparent 50%),radial-gradient(ellipse at 80% 70%,rgba(0,200,200,.3) 0%,transparent 50%),linear-gradient(145deg,#0a001a 0%,#1a0030 40%,#001a1a 100%)' },
	{ name: 'Ozean',            value: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)' },
	{ name: 'Aurora',           value: 'linear-gradient(135deg,#1c1c2e 0%,#2d1b69 50%,#11998e 100%)' },
	{ name: 'Dämmerung',        value: 'linear-gradient(135deg,#2c1654 0%,#3a1043 30%,#c0392b 100%)' },
	{ name: 'Monochrom',        value: 'linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%)' },
];

const ACCENT_COLORS = [
	{ name: 'Blau',   value: '#0078d4' },
	{ name: 'Lila',   value: '#8764b8' },
	{ name: 'Teal',   value: '#038387' },
	{ name: 'Grün',   value: '#107c10' },
	{ name: 'Orange', value: '#ca7700' },
	{ name: 'Rot',    value: '#c42b1c' },
	{ name: 'Pink',   value: '#e74856' },
	{ name: 'Grau',   value: '#69797e' },
];

let currentWallpaper = 0;
let currentAccent    = '#0078d4';
let darkMode         = true;
let fontSize         = 14;
let animationsOn     = true;
let transparency     = true;
let notificationsOn  = true;
let volume           = 70;
let brightness       = 80;
let username         = 'Benutzer';
let userEmail        = 'benutzer@beispiel.de';

// ===========================
// LOCAL DATABASE (HINTERGRUND)
// ===========================
const DB_KEY = 'sf_web_db_v1';
const DEFAULT_DB = {
	groups: [
		{ name: 'Superadmin', canRead: 1, canEdit: 1, canCreate: 1, canDelete: 1, canManageGroups: 1 },
		{ name: 'Admin',      canRead: 1, canEdit: 1, canCreate: 0, canDelete: 0, canManageGroups: 0 },
		{ name: 'User',       canRead: 1, canEdit: 0, canCreate: 0, canDelete: 0, canManageGroups: 0 },
	],
	staff: [
		{
			recordId: 'rec-1',
			firstName: 'System',
			lastName: 'Admin',
			staffId: 'A-1001',
			password: '1234',
			imageUrl: 'https://i.pravatar.cc/120?img=12',
			rank: 'Leitung',
			permission: 'Superadmin',
			notes: 'Initialer Systemzugang',
			canLogin: true,
		},
	],
};

let currentSessionUser = null;
let editRecordId = null;

function loadDatabaseFromStorage() {
	try {
		const raw = localStorage.getItem(DB_KEY);
		if (!raw) {
			localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB));
			return JSON.parse(JSON.stringify(DEFAULT_DB));
		}
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed.staff) || parsed.staff.length === 0) return JSON.parse(JSON.stringify(DEFAULT_DB));

		// Migrationslogik für ältere Datensätze
		const migrated = {
			groups: Array.isArray(parsed.groups) && parsed.groups.length ? parsed.groups.map(g => ({
				name: g.name,
				canRead: +!!g.canRead,
				canEdit: +!!g.canEdit,
				canCreate: +!!g.canCreate,
				canDelete: +!!g.canDelete,
				canManageGroups: +!!g.canManageGroups,
			})) : JSON.parse(JSON.stringify(DEFAULT_DB.groups)),
			staff: parsed.staff.map((p, idx) => {
				const fullName = String(p.name || '').trim();
				const firstName = p.firstName || fullName.split(' ')[0] || 'Unbekannt';
				const lastName = p.lastName || fullName.split(' ').slice(1).join(' ') || '-';
				return {
					recordId: p.recordId || p.id || `rec-${Date.now()}-${idx}`,
					firstName,
					lastName,
					staffId: p.staffId || p.username || `U-${1000 + idx}`,
					password: p.password || p.pin || '1234',
					imageUrl: p.imageUrl || '',
					rank: p.rank || p.role || '-',
					permission: p.permission || (p.role === 'Administrator' ? 'Admin' : 'User'),
					notes: p.notes || '',
					canLogin: p.canLogin !== false,
				};
			}),
		};

		saveDatabaseFrom(migrated);
		return migrated;
	} catch (_e) {
		return JSON.parse(JSON.stringify(DEFAULT_DB));
	}
}

function saveDatabaseFrom(db) {
	localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function sql(query, params = []) {
	if (!window.alasql) throw new Error('AlaSQL ist nicht geladen.');
	return window.alasql(query, params);
}

function initSqlDatabase() {
	const db = loadDatabaseFromStorage();
	sql('DROP TABLE IF EXISTS staff');
	sql('DROP TABLE IF EXISTS groups');

	sql('CREATE TABLE groups (name STRING, canRead INT, canEdit INT, canCreate INT, canDelete INT, canManageGroups INT)');
	sql('CREATE TABLE staff (recordId STRING, firstName STRING, lastName STRING, staffId STRING, password STRING, imageUrl STRING, rank STRING, permission STRING, notes STRING, canLogin INT)');

	db.groups.forEach(g => {
		sql('INSERT INTO groups VALUES (?,?,?,?,?,?)', [g.name, +!!g.canRead, +!!g.canEdit, +!!g.canCreate, +!!g.canDelete, +!!g.canManageGroups]);
	});
	db.staff.forEach(p => {
		sql('INSERT INTO staff VALUES (?,?,?,?,?,?,?,?,?,?)', [p.recordId, p.firstName, p.lastName, p.staffId, p.password, p.imageUrl, p.rank, p.permission, p.notes, +!!p.canLogin]);
	});

	persistSqlToStorage();
}

function persistSqlToStorage() {
	const groups = sql('SELECT * FROM groups');
	const staff = sql('SELECT * FROM staff');
	saveDatabaseFrom({ groups, staff });
}

function getAllGroups() {
	return sql('SELECT * FROM groups ORDER BY name');
}

function getAllStaff() {
	return sql('SELECT * FROM staff ORDER BY firstName, lastName');
}

function getLoginUsers() {
	return sql('SELECT * FROM staff WHERE canLogin = 1 ORDER BY firstName, lastName');
}

function getDisplayName(person) {
	return `${person.firstName} ${person.lastName}`.trim();
}

function getGroupByName(name) {
	const rows = sql('SELECT * FROM groups WHERE name = ?', [name]);
	return rows[0] || null;
}

function hasRight(rightName) {
	if (!currentSessionUser) return false;
	const g = getGroupByName(currentSessionUser.permission);
	if (!g) return false;
	return !!g[rightName];
}

function isSuperAdmin() {
	return hasRight('canManageGroups');
}

function syncLoginUserSelect() {
	const sel = document.getElementById('login-user');
	if (!sel) return;
	sel.innerHTML = '';
	const users = getLoginUsers();
	users.forEach(u => {
		const opt = document.createElement('option');
		opt.value = u.staffId;
		opt.textContent = `${getDisplayName(u)} (${u.staffId})`;
		sel.appendChild(opt);
	});
	if (!users.length) {
		const opt = document.createElement('option');
		opt.value = '';
		opt.textContent = 'Keine berechtigten Benutzer vorhanden';
		sel.appendChild(opt);
	}
}

function setDesktopLocked(locked) {
	document.body.classList.toggle('desktop-locked', locked);
	const login = document.getElementById('login-screen');
	if (login) login.classList.toggle('hidden', !locked);
	if (locked) {
		closeAllMenus();
		document.getElementById('login-pin')?.focus();
	}
}

function updateUserLabels() {
	document.getElementById('start-user-name')?.replaceChildren(document.createTextNode(username));
	const nameEl = document.getElementById('settings-username-display');
	if (nameEl) nameEl.textContent = username;
	const mailEl = document.getElementById('settings-email-display');
	if (mailEl) mailEl.textContent = userEmail;
}

function showLoginMessage(msg, isError = true) {
	const box = document.getElementById('login-message');
	if (!box) return;
	box.textContent = msg;
	box.style.color = isError ? '#ff7a7a' : '#88e188';
}

function attemptLogin() {
	const loginId = document.getElementById('login-user')?.value?.trim();
	const password = document.getElementById('login-pin')?.value?.trim() || '';
	if (!loginId) {
		showLoginMessage('Kein Benutzer verfügbar. Bitte in Personal Verwaltung Benutzer anlegen.');
		return;
	}
	const person = getLoginUsers().find(p => p.staffId.toLowerCase() === loginId.toLowerCase());
	if (!person) {
		showLoginMessage('Benutzer ist nicht zur Anmeldung berechtigt.');
		return;
	}
	if (String(person.password || '') !== password) {
		showLoginMessage('Passwort ist falsch.');
		return;
	}
	currentSessionUser = person;
	username = getDisplayName(person);
	userEmail = `${person.staffId.toLowerCase()}@firma.local`;
	updateUserLabels();
	showLoginMessage('Anmeldung erfolgreich.', false);
	setDesktopLocked(false);
	const pinInput = document.getElementById('login-pin');
	if (pinInput) pinInput.value = '';
}

function ensureActiveSessionStillAllowed() {
	if (!currentSessionUser) return;
	const stillAllowed = getLoginUsers().some(u => u.recordId === currentSessionUser.recordId);
	if (!stillAllowed) {
		currentSessionUser = null;
		showLoginMessage('Aktive Sitzung wurde entfernt. Bitte erneut anmelden.');
		setDesktopLocked(true);
		syncLoginUserSelect();
	}
}

function applyWallpaper(idx) {
	currentWallpaper = idx;
	document.getElementById('desktop').style.background = WALLPAPERS[idx].value;
}

function applyAccent(color) {
	currentAccent = color;
	document.documentElement.style.setProperty('--accent', color);
	document.documentElement.style.setProperty('--accent-light', color + 'cc');
}

function applyDarkMode(on) {
	darkMode = on;
	document.body.classList.toggle('light-mode', !on);
}

function changeWallpaper() {
	applyWallpaper((currentWallpaper + 1) % WALLPAPERS.length);
	closeAllMenus();
}


// ===========================
// MENUS
// ===========================
function closeAllMenus() {
	document.getElementById('start-menu')?.classList.add('hidden');
	document.getElementById('start-btn')?.classList.remove('active');
	document.getElementById('power-menu')?.classList.add('hidden');
	document.getElementById('search-panel')?.classList.add('hidden');
	document.getElementById('context-menu')?.classList.add('hidden');
	['notif-panel','vol-panel','net-panel','bat-panel'].forEach(id => {
		document.getElementById(id)?.classList.add('hidden');
	});
}

const ctxMenu = document.getElementById('context-menu');
function showContextMenu(e) {
	e.preventDefault();
	closeAllMenus();
	ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 240) + 'px';
	ctxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 200) + 'px';
	ctxMenu.classList.remove('hidden');
}
document.addEventListener('click', (e) => {
	if (!e.target.closest('#context-menu')) ctxMenu?.classList.add('hidden');
});

function toggleStartMenu() {
	const menu = document.getElementById('start-menu');
	const btn  = document.getElementById('start-btn');
	const isOpen = !menu.classList.contains('hidden');
	closeAllMenus();
	if (!isOpen) {
		menu.classList.remove('hidden');
		btn.classList.add('active');
		document.getElementById('start-search-input')?.focus();
	}
}

document.addEventListener('click', (e) => {
	const ignore = ['start-menu','start-btn','power-menu'];
	if (!ignore.some(id => e.target.closest('#' + id))) {
		document.getElementById('start-menu')?.classList.add('hidden');
		document.getElementById('start-btn')?.classList.remove('active');
		document.getElementById('power-menu')?.classList.add('hidden');
	}
});

function filterStartApps(query) {
	document.querySelectorAll('.start-app').forEach(app => {
		app.style.display = (!query || app.textContent.toLowerCase().includes(query.toLowerCase())) ? '' : 'none';
	});
}

function togglePowerMenu() {
	document.getElementById('power-menu').classList.toggle('hidden');
}

function showInfo() {
	closeAllMenus();
	AppRegistry.open('settings');
}


// ===========================
// TRAY POPUPS
// ===========================
const trayPanels = { notif: 'notif-panel', vol: 'vol-panel', net: 'net-panel', bat: 'bat-panel' };

function toggleTrayPopup(type) {
	const panelId = trayPanels[type];
	if (!panelId) return;
	const panel = document.getElementById(panelId);
	const wasHidden = panel.classList.contains('hidden');
	Object.values(trayPanels).forEach(id => document.getElementById(id)?.classList.add('hidden'));
	closeAllMenus();
	if (wasHidden) panel.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
	const inside = Object.values(trayPanels).some(id => e.target.closest('#' + id));
	const onTray = e.target.closest('.tray-btn');
	if (!inside && !onTray) Object.values(trayPanels).forEach(id => document.getElementById(id)?.classList.add('hidden'));
});

function clearNotifications() {
	document.getElementById('notif-panel')?.querySelectorAll('.notif-item').forEach(n => n.remove());
	const badge = document.getElementById('notif-badge');
	if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
}

function updateVol(val) {
	volume = +val;
	const el = document.getElementById('vol-val');
	if (el) el.textContent = val;
}


// ===========================
// SEARCH PANEL
// ===========================
window._searchApps = [];

function openSearch() {
	closeAllMenus();
	const panel = document.getElementById('search-panel');
	panel?.classList.remove('hidden');
	const inp = document.getElementById('search-input');
	if (inp) { inp.value = ''; inp.focus(); }
	updateSearch('');
}

function updateSearch(q) {
	const results = document.getElementById('search-results');
	if (!results) return;
	results.innerHTML = '';
	(window._searchApps || []).filter(a => !q || a.label.toLowerCase().includes(q.toLowerCase()))
		.forEach(app => {
			const el = document.createElement('div');
			el.className = 'search-result-item';
			el.innerHTML = `<span style="font-size:22px">${app.icon}</span><span>${app.label}</span>`;
			el.addEventListener('click', () => { AppRegistry.open(app.id); closeAllMenus(); });
			results.appendChild(el);
		});
}

document.addEventListener('click', (e) => {
	if (!e.target.closest('#search-panel') && !e.target.closest('#search-bar'))
		document.getElementById('search-panel')?.classList.add('hidden');
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllMenus(); });


// ===========================
// SHUTDOWN
// ===========================
function shutdownAnimation() {
	const screen = document.getElementById('shutdown-screen');
	screen.classList.remove('hidden');
	setTimeout(() => {
		screen.innerHTML = `<div style="color:#fff;font-size:16px;font-family:Segoe UI,sans-serif;text-align:center;">
			<p style="font-size:52px">🖥️</p>
			<p>Der Computer wurde heruntergefahren.</p>
			<p style="margin-top:12px;opacity:.55;font-size:13px;">Seite neu laden um fortzufahren.</p>
		</div>`;
	}, 3000);
}


// ===========================
// SETTINGS REGISTRATION
// ===========================
document.addEventListener('DOMContentLoaded', () => {
	if (!window.alasql) {
		showLoginMessage('SQL-Engine konnte nicht geladen werden. Bitte Internetverbindung prüfen.');
		return;
	}
	initSqlDatabase();

	AppRegistry.register({
		id:      'settings',
		icon:    '⚙️',
		label:   'Einstellungen',
		width:   820,
		height:  580,
		desktop: true,
		pinned:  true,
		render:  renderSettings,
	});

	AppRegistry.register({
		id:      'personalverwaltung',
		icon:    '👥',
		label:   'Personal Verwaltung',
		width:   900,
		height:  580,
		desktop: true,
		pinned:  true,
		render:  renderPersonalVerwaltung,
	});

	AppRegistry.register({
		id:      'nutzergruppen',
		icon:    '🛡️',
		label:   'Nutzergruppen Management',
		width:   940,
		height:  600,
		desktop: true,
		pinned:  true,
		render:  renderNutzergruppenManagement,
	});

	applyWallpaper(currentWallpaper);
	applyAccent(currentAccent);
	applyDarkMode(darkMode);
	updateUserLabels();
	syncLoginUserSelect();
	setDesktopLocked(true);
	showLoginMessage('Standardzugang: A-1001 / 1234', false);
	document.getElementById('login-pin')?.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') attemptLogin();
	});
});


/* ============================
	 SETTINGS APP – RENDERER
============================ */
function renderSettings(container) {
	container.style.cssText = 'display:flex;height:100%;overflow:hidden;';

	const sidebar = document.createElement('div');
	sidebar.className = 'settings-sidebar';
	sidebar.innerHTML = `
		<div class="settings-user" id="settings-user-header">
			<div class="user-avatar" id="settings-avatar">👤</div>
			<div class="user-info">
				<strong id="settings-username-display">${username}</strong><br>
				<small id="settings-email-display">${userEmail}</small>
			</div>
		</div>
		<input class="settings-sidebar-search" type="text" placeholder="🔍 Einstellungen suchen..."
			oninput="filterSettingsNav(this)" />
	`;

	const navItems = [
		{ id: 'system',          icon: '🏠', label: 'System' },
		{ id: 'display',         icon: '🖥️', label: 'Anzeige' },
		{ id: 'personalization', icon: '🎨', label: 'Personalisierung' },
		{ id: 'sound',           icon: '🔊', label: 'Sound' },
		{ id: 'network',         icon: '📶', label: 'Netzwerk & Internet' },
		{ id: 'apps',            icon: '📦', label: 'Apps' },
		{ id: 'accounts',        icon: '👤', label: 'Konten' },
		{ id: 'datetime',        icon: '⏰', label: 'Zeit & Sprache' },
		{ id: 'gaming',          icon: '🎮', label: 'Gaming' },
		{ id: 'accessibility',   icon: '♿', label: 'Barrierefreiheit' },
		{ id: 'privacy',         icon: '🔒', label: 'Datenschutz' },
		{ id: 'update',          icon: '🔄', label: 'Update & Sicherheit' },
	];

	navItems.forEach((item, i) => {
		const el = document.createElement('div');
		el.className = 'settings-nav-item' + (i === 0 ? ' active' : '');
		el.dataset.section = item.id;
		el.textContent = `${item.icon} ${item.label}`;
		el.addEventListener('click', () => {
			sidebar.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
			el.classList.add('active');
			showSettingsSection(main, item.id);
		});
		sidebar.appendChild(el);
	});

	const main = document.createElement('div');
	main.className = 'settings-main';

	container.appendChild(sidebar);
	container.appendChild(main);
	showSettingsSection(main, 'system');

	window.filterSettingsNav = (inp) => {
		const q = inp.value.toLowerCase();
		sidebar.querySelectorAll('.settings-nav-item').forEach(n => {
			n.style.display = (!q || n.textContent.toLowerCase().includes(q)) ? '' : 'none';
		});
	};
}

function showSettingsSection(main, sectionId) {
	main.innerHTML = '';
	const builders = {
		system: buildSystemSection, display: buildDisplaySection,
		personalization: buildPersonalizationSection, sound: buildSoundSection,
		network: buildNetworkSection, apps: buildAppsSection,
		accounts: buildAccountsSection, datetime: buildDateTimeSection,
		gaming: buildGamingSection, accessibility: buildAccessibilitySection,
		privacy: buildPrivacySection, update: buildUpdateSection,
	};
	const builder = builders[sectionId];
	if (builder) builder(main);
}

// ---- HELPERS ----
function sCard(html) {
	const c = document.createElement('div');
	c.className = 'settings-card';
	c.innerHTML = html;
	return c;
}
function sRow(left, right = '') {
	return `<div class="settings-row">${left}<div class="s-right">${right}</div></div>`;
}
function sToggle(id, checked = false, onchange = '') {
	return `<label class="toggle"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="${onchange}"><span class="slider"></span></label>`;
}
function sSelect(id, options, val) {
	const opts = options.map(o => `<option value="${o.v}" ${o.v === val ? 'selected' : ''}>${o.l}</option>`).join('');
	return `<select class="s-select" id="${id}">${opts}</select>`;
}
function sSlider(id, min, max, val, oninput = '') {
	return `<input type="range" class="s-slider" id="${id}" min="${min}" max="${max}" value="${val}" oninput="${oninput}" />`;
}
function sTitle(text) {
	const t = document.createElement('h2');
	t.className = 'settings-section-title';
	t.textContent = text;
	return t;
}
function sSub(text) {
	const t = document.createElement('p');
	t.className = 'settings-section-sub';
	t.textContent = text;
	return t;
}
function sBtn(label, onclick = '', cls = 'settings-btn') {
	return `<button class="${cls}" onclick="${onclick}">${label}</button>`;
}

// =============================================
// SECTION BUILDERS
// =============================================

function buildSystemSection(el) {
	el.appendChild(sTitle('System'));
	el.appendChild(sSub('Geräteinformationen und Schnelleinstellungen'));
	const info = document.createElement('div');
	info.className = 'settings-info-card';
	info.innerHTML = `
		<div class="info-card-icon">🖥️</div>
		<div class="info-card-body">
			<div class="info-card-name">Desktop-PC</div>
			<div class="info-grid">
				<span class="info-key">Prozessor</span><span class="info-val">Intel Core i7-12700K @ 3,60 GHz</span>
				<span class="info-key">RAM</span><span class="info-val">16 GB DDR5</span>
				<span class="info-key">System</span><span class="info-val">Windows 11 Pro (64-Bit)</span>
				<span class="info-key">Version</span><span class="info-val">23H2 (Build 22631)</span>
				<span class="info-key">Gerätename</span><span class="info-val">DESKTOP-SF</span>
			</div>
		</div>`;
	el.appendChild(info);
	el.appendChild(sCard(sRow('<strong>🔔 Benachrichtigungen</strong><p>App-Benachrichtigungen und Fokus-Assist</p>', sToggle('sys-notif', notificationsOn, 'notificationsOn=this.checked'))));
	el.appendChild(sCard(sRow('<strong>🌙 Ruhezustand nach</strong><p>Bildschirm ausschalten wenn inaktiv</p>', sSelect('sys-sleep',[{v:'5',l:'5 Min'},{v:'10',l:'10 Min'},{v:'30',l:'30 Min'},{v:'never',l:'Nie'}],'10'))));
	el.appendChild(sCard(sRow('<strong>💾 Speicher-Sensor</strong><p>Temporäre Dateien automatisch löschen</p>', sToggle('sys-storage', true))));
	el.appendChild(sCard(sRow('<strong>📋 Zwischenablageverlauf</strong><p>Mehrere kopierte Elemente speichern</p>', sToggle('sys-clipboard', false))));
	el.appendChild(sCard(sRow('<strong>🔄 Autostart-Apps</strong><p>Apps beim Start automatisch starten</p>', sBtn('Verwalten',''))));
}

function buildDisplaySection(el) {
	el.appendChild(sTitle('Anzeige'));
	el.appendChild(sSub('Auflösung, Helligkeit, Skalierung und Nachtmodus'));
	el.appendChild(sCard(`
		<div class="settings-row">
			<div><strong>☀️ Helligkeit</strong><p>Bildschirmhelligkeit anpassen</p></div>
			<div style="display:flex;align-items:center;gap:10px;flex:0 0 220px">
				<span>🌑</span>
				${sSlider('disp-bright',0,100,brightness,"brightness=+this.value;document.getElementById('disp-bright-val').textContent=this.value+'%'")}
				<span id="disp-bright-val">${brightness}%</span>
			</div>
		</div>`));
	el.appendChild(sCard(`
		<div class="settings-row">
			<div><strong>🔵 Blaulichtfilter (Nachtmodus)</strong><p>Reduziert blaues Licht</p></div>
			${sToggle('disp-night',false,"document.body.classList.toggle('night-mode',this.checked)")}
		</div>
		<div class="settings-row" style="margin-top:10px">
			<span style="font-size:12px;color:var(--text-dim)">Aktivieren ab:</span>
			<input type="time" class="s-time" value="20:00" />
		</div>`));
	el.appendChild(sCard(sRow('<strong>📐 Skalierung</strong><p>Textgröße und App-Größe</p>', sSelect('disp-scale',[{v:'100',l:'100% (Empfohlen)'},{v:'125',l:'125%'},{v:'150',l:'150%'},{v:'175',l:'175%'}],'100'))));
	el.appendChild(sCard(sRow('<strong>🖥️ Bildschirmauflösung</strong>', sSelect('disp-res',[{v:'1920x1080',l:'1920 × 1080 (Empfohlen)'},{v:'2560x1440',l:'2560 × 1440 (QHD)'},{v:'3840x2160',l:'3840 × 2160 (4K)'},{v:'1280x720',l:'1280 × 720 (HD)'}],'1920x1080'))));
	el.appendChild(sCard(sRow('<strong>⚡ Bildwiederholrate</strong>', sSelect('disp-hz',[{v:'60',l:'60 Hz'},{v:'120',l:'120 Hz'},{v:'144',l:'144 Hz'},{v:'240',l:'240 Hz'}],'60'))));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>✨ Animationen</strong><p>Fenster- und UI-Animationen</p></div>${sToggle('disp-anim',animationsOn,"animationsOn=this.checked;document.body.classList.toggle('no-animations',!this.checked)")}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🪟 Transparenz</strong><p>Glasmorphismus-Effekte</p></div>${sToggle('disp-transp',transparency,"transparency=this.checked;document.body.classList.toggle('no-transparency',!this.checked)")}</div>`));
}

function buildPersonalizationSection(el) {
	el.appendChild(sTitle('Personalisierung'));
	el.appendChild(sSub('Hintergrund, Farben, Schriftart und Startmenü'));

	const wpCard = document.createElement('div');
	wpCard.className = 'settings-card';
	wpCard.innerHTML = '<strong>🖼️ Desktophintergrund</strong><p style="color:var(--text-dim);font-size:12px;margin-bottom:10px">Hintergrundfarbe auswählen</p>';
	const wpGrid = document.createElement('div');
	wpGrid.className = 'wallpaper-grid';
	WALLPAPERS.forEach((wp, i) => {
		const tile = document.createElement('div');
		tile.className = 'wp-tile' + (i === currentWallpaper ? ' active' : '');
		tile.style.background = wp.value;
		tile.title = wp.name;
		tile.innerHTML = `<span>${wp.name}</span>`;
		tile.addEventListener('click', () => {
			document.querySelectorAll('.wp-tile').forEach(t => t.classList.remove('active'));
			tile.classList.add('active');
			applyWallpaper(i);
		});
		wpGrid.appendChild(tile);
	});
	wpCard.appendChild(wpGrid);
	el.appendChild(wpCard);

	const acCard = document.createElement('div');
	acCard.className = 'settings-card';
	acCard.innerHTML = '<strong>🎨 Akzentfarbe</strong><p style="color:var(--text-dim);font-size:12px;margin-bottom:10px">Für Buttons und Hervorhebungen</p>';
	const acGrid = document.createElement('div');
	acGrid.className = 'accent-grid';
	ACCENT_COLORS.forEach(ac => {
		const swatch = document.createElement('div');
		swatch.className = 'accent-swatch' + (ac.value === currentAccent ? ' active' : '');
		swatch.style.background = ac.value;
		swatch.title = ac.name;
		swatch.addEventListener('click', () => {
			document.querySelectorAll('.accent-swatch').forEach(s => s.classList.remove('active'));
			swatch.classList.add('active');
			applyAccent(ac.value);
		});
		acGrid.appendChild(swatch);
	});
	acCard.appendChild(acGrid);
	el.appendChild(acCard);

	el.appendChild(sCard(sRow('<strong>🌗 Design</strong><p>Hell oder Dunkel</p>', sSelect('pers-theme',[{v:'dark',l:'Dunkel (Standard)'},{v:'light',l:'Hell'},{v:'auto',l:'Systemstandard'}],darkMode?'dark':'light'))));
	el.appendChild(sCard(`
		<div class="settings-row">
			<div><strong>🔤 Schriftgröße</strong><p>Systemweite Textgröße</p></div>
			<div style="display:flex;align-items:center;gap:10px">
				${sSlider('pers-fontsize',10,20,fontSize,"fontSize=+this.value;document.documentElement.style.fontSize=this.value+'px';document.getElementById('pers-fs-val').textContent=this.value+'px'")}
				<span id="pers-fs-val">${fontSize}px</span>
			</div>
		</div>`));
	el.appendChild(sCard(sRow('<strong>📌 Taskleisten-Position</strong>', sSelect('pers-taskbar',[{v:'bottom',l:'Unten (Standard)'},{v:'top',l:'Oben'},{v:'left',l:'Links'},{v:'right',l:'Rechts'}],'bottom'))));
	el.appendChild(sCard(sRow('<strong>🔢 Startmenü-Layout</strong>', sSelect('pers-startlayout',[{v:'default',l:'Standard'},{v:'morepins',l:'Mehr Pins'},{v:'morerec',l:'Mehr Empfehlungen'}],'default'))));
}

function buildSoundSection(el) {
	el.appendChild(sTitle('Sound'));
	el.appendChild(sSub('Lautstärke, Audiogeräte und Klangschema'));
	el.appendChild(sCard(`
		<strong>🔊 Systemlautstärke</strong>
		<div style="display:flex;align-items:center;gap:10px;margin-top:10px">
			<span>🔇</span>
			${sSlider('snd-vol',0,100,volume,"volume=+this.value;document.getElementById('snd-vol-val').textContent=this.value+'%'")}
			<span>🔊</span>
			<span id="snd-vol-val" style="min-width:36px">${volume}%</span>
		</div>`));
	el.appendChild(sCard(`<strong>🎵 Ausgabegerät</strong><div style="margin-top:8px">${sSelect('snd-out',[{v:'speakers',l:'🔊 Lautsprecher (Standard)'},{v:'headset',l:'🎧 Kopfhörer'},{v:'hdmi',l:'🖥️ HDMI-Ausgang'}],'speakers')}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🔔 Benachrichtigungstöne</strong></div>${sToggle('snd-notif',true)}</div>`));
	el.appendChild(sCard(sRow('<strong>🎹 Klangschema</strong>', sSelect('snd-scheme',[{v:'win',l:'Windows Standard'},{v:'none',l:'Kein Schema'},{v:'min',l:'Minimiert'}],'win'))));
	el.appendChild(sCard(sRow('<strong>🎚️ App-Lautstärke-Mixer</strong>', sBtn('Mixer öffnen',''))));
}

function buildNetworkSection(el) {
	el.appendChild(sTitle('Netzwerk & Internet'));
	el.appendChild(sSub('WLAN, VPN, Proxy und Verbindungsstatus'));
	const statusCard = document.createElement('div');
	statusCard.className = 'settings-info-card';
	statusCard.innerHTML = `
		<div class="info-card-icon">📶</div>
		<div class="info-card-body">
			<div class="info-card-name">Heimnetzwerk</div>
			<div class="info-grid">
				<span class="info-key">Status</span><span class="info-val" style="color:#4caf50">✅ Verbunden</span>
				<span class="info-key">IP-Adresse</span><span class="info-val">192.168.1.42</span>
				<span class="info-key">DNS</span><span class="info-val">1.1.1.1 (Cloudflare)</span>
				<span class="info-key">Sicherheit</span><span class="info-val">WPA3</span>
			</div>
		</div>`;
	el.appendChild(statusCard);
	el.appendChild(sCard(`<div class="settings-row"><div><strong>📶 WLAN</strong></div>${sToggle('net-wifi',true)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🔵 Bluetooth</strong></div>${sToggle('net-bt',false)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>✈️ Flugzeugmodus</strong></div>${sToggle('net-flight',false)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>📡 Mobiler Hotspot</strong></div>${sToggle('net-hotspot',false)}</div>`));
	el.appendChild(sCard(sRow('<strong>🔐 VPN</strong><p>Verschlüsselte Tunnelverbindung</p>',sBtn('VPN hinzufügen',''))));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🌍 Proxy</strong></div>${sToggle('net-proxy',false)}</div>`));

	const nCard = document.createElement('div');
	nCard.className = 'settings-card';
	nCard.innerHTML = `<strong>Verfügbare Netzwerke</strong>`;
	[{name:'Heimnetzwerk',signal:'████░',sec:'WPA3',connected:true},{name:'Nachbar_WLAN',signal:'███░░',sec:'WPA2',connected:false},{name:'AndroidAP_5G',signal:'██░░░',sec:'WPA2',connected:false}]
		.forEach(n => {
			const row = document.createElement('div');
			row.className = 'net-row' + (n.connected ? ' net-connected' : '');
			row.innerHTML = `<span>📶</span><div style="flex:1"><strong>${n.name}</strong>${n.connected?' <span class="net-badge">Verbunden</span>':''}<small style="display:block;color:var(--text-dim)">${n.signal} · ${n.sec}</small></div>${n.connected?'':sBtn('Verbinden','')}`;
			nCard.appendChild(row);
		});
	el.appendChild(nCard);
}

function buildAppsSection(el) {
	el.appendChild(sTitle('Apps'));
	el.appendChild(sSub('Installierte Anwendungen und Standardprogramme'));
	el.appendChild(sCard(sRow('<strong>🗂️ Installations-Speicherort</strong>', sSelect('apps-loc',[{v:'C:',l:'Laufwerk C:'},{v:'D:',l:'Laufwerk D:'}],'C:'))));
	el.appendChild(sCard(sRow('<strong>🔗 Standardprogramme</strong><p>Welche App öffnet welchen Dateityp?</p>',sBtn('Verwalten',''))));
	const appsCard = document.createElement('div');
	appsCard.className = 'settings-card';
	appsCard.innerHTML = `<strong>Installierte Apps</strong><input type="text" class="s-search-inline" placeholder="🔍 App suchen..." oninput="this.closest('.settings-card').querySelectorAll('.app-row').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(this.value.toLowerCase())?'':'none')" />`;
	[
		{icon:'⚙️',name:'Einstellungen',version:'11.0.0',size:'2.4 MB'},
		{icon:'🌐',name:'Microsoft Edge',version:'120.0',size:'210 MB'},
		{icon:'📝',name:'Notepad',version:'11.2310',size:'1.1 MB'},
		{icon:'📷',name:'Kamera',version:'2023.2305',size:'8.5 MB'},
		{icon:'🔢',name:'Rechner',version:'11.2311',size:'2.8 MB'},
		{icon:'📅',name:'Kalender',version:'23.9030',size:'15 MB'},
	].forEach(app => {
		const row = document.createElement('div');
		row.className = 'app-row';
		row.innerHTML = `<span style="font-size:22px">${app.icon}</span><div style="flex:1"><strong>${app.name}</strong><small style="display:block;color:var(--text-dim)">v${app.version} · ${app.size}</small></div><div style="display:flex;gap:6px"><button class="settings-btn-sm">Optionen</button><button class="settings-btn-sm danger">Deinstall.</button></div>`;
		appsCard.appendChild(row);
	});
	el.appendChild(appsCard);
}

function buildAccountsSection(el) {
	el.appendChild(sTitle('Konten'));
	el.appendChild(sSub('Benutzerprofil, Anmeldeoptionen'));
	const profCard = document.createElement('div');
	profCard.className = 'settings-info-card';
	profCard.innerHTML = `
		<div class="info-card-icon" style="font-size:52px">👤</div>
		<div class="info-card-body">
			<div class="info-card-name" id="acc-name-disp">${username}</div>
			<div class="info-grid">
				<span class="info-key">E-Mail</span><span class="info-val" id="acc-email-disp">${userEmail}</span>
				<span class="info-key">Kontotyp</span><span class="info-val">Lokales Konto</span>
			</div>
		</div>`;
	el.appendChild(profCard);
	const nameCard = document.createElement('div');
	nameCard.className = 'settings-card';
	nameCard.innerHTML = `<strong>✏️ Benutzernamen ändern</strong>
		<div style="display:flex;gap:10px;margin-top:10px;align-items:center">
			<input type="text" class="s-input" id="acc-new-name" value="${username}" style="flex:1" />
			<button class="settings-btn" onclick="const n=document.getElementById('acc-new-name').value.trim();if(!n)return;username=n;['acc-name-disp','settings-username-display'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=n});">Speichern</button>
		</div>`;
	el.appendChild(nameCard);
	const emailCard = document.createElement('div');
	emailCard.className = 'settings-card';
	emailCard.innerHTML = `<strong>📧 E-Mail-Adresse</strong>
		<div style="display:flex;gap:10px;margin-top:10px;align-items:center">
			<input type="email" class="s-input" id="acc-new-email" value="${userEmail}" style="flex:1" />
			<button class="settings-btn" onclick="const e=document.getElementById('acc-new-email').value.trim();if(!e)return;userEmail=e;['acc-email-disp','settings-email-display'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=e});">Speichern</button>
		</div>`;
	el.appendChild(emailCard);
	el.appendChild(sCard(sRow('<strong>🔐 PIN</strong><p>Windows Hello PIN einrichten</p>',sBtn('PIN einrichten',"alert('PIN-Einrichtung...')"))));
	el.appendChild(sCard(sRow('<strong>🔑 Kennwort</strong>',sBtn('Ändern',"alert('Kennwort-Dialog...')"))));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>👁️ Biometrie</strong><p>Gesichtserkennung, Fingerabdruck</p></div>${sToggle('acc-bio',false)}</div>`));
	el.appendChild(sCard(sRow('<strong>🔄 Anmeldung nach Ruhezustand</strong>',sSelect('acc-wakereq',[{v:'always',l:'Immer'},{v:'15min',l:'Nach 15 Min'},{v:'never',l:'Nie'}],'always'))));
}

function buildDateTimeSection(el) {
	el.appendChild(sTitle('Zeit & Sprache'));
	el.appendChild(sSub('Datum, Uhrzeit, Zeitzone und Regionsformat'));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🕐 Zeit automatisch einstellen</strong><p>Über Netzwerk-Zeitserver synchronisieren</p></div>${sToggle('dt-auto',true)}</div>`));
	el.appendChild(sCard(sRow('<strong>🌍 Zeitzone</strong>',sSelect('dt-tz',[{v:'UTC+1',l:'(UTC+01:00) Berlin, Wien'},{v:'UTC',l:'(UTC) London'},{v:'UTC+2',l:'(UTC+02:00) Athen (Sommer)'},{v:'UTC-5',l:'(UTC-05:00) New York'},{v:'UTC+9',l:'(UTC+09:00) Tokio'}],'UTC+1'))));
	el.appendChild(sCard(sRow('<strong>📅 Datumsformat</strong>',sSelect('dt-fmt',[{v:'dd.MM.yyyy',l:'DD.MM.YYYY (Deutsch)'},{v:'MM/dd/yyyy',l:'MM/DD/YYYY (Englisch)'},{v:'yyyy-MM-dd',l:'YYYY-MM-DD (ISO)'}],'dd.MM.yyyy'))));
	el.appendChild(sCard(sRow('<strong>🌐 Anzeigesprache</strong>',sSelect('dt-lang',[{v:'de',l:'Deutsch'},{v:'en',l:'English'},{v:'fr',l:'Français'},{v:'es',l:'Español'}],'de'))));
	el.appendChild(sCard(sRow('<strong>⌨️ Tastaturlayout</strong>',sSelect('dt-kbd',[{v:'de-DE',l:'Deutsch (QWERTZ)'},{v:'en-US',l:'Englisch (QWERTY)'},{v:'fr-FR',l:'Französisch (AZERTY)'}],'de-DE'))));
}

function buildGamingSection(el) {
	el.appendChild(sTitle('Gaming'));
	el.appendChild(sSub('Spielemodus, Xbox Game Bar und Aufnahme-Einstellungen'));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🎮 Spielemodus</strong><p>PC auf Spiele optimieren</p></div>${sToggle('game-mode',true)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>📊 Xbox Game Bar</strong><p>Overlay mit Win+G</p></div>${sToggle('game-bar',true)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🎬 Spielclips aufnehmen</strong></div>${sToggle('game-clips',false)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>📸 Screenshot-Ordner</strong></div><input type="text" class="s-input" value="C:\\Benutzer\\Screenshots" style="width:200px" /></div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🖱️ Maus-Rawmode</strong><p>Präzises Input für Gaming</p></div>${sToggle('game-raw',false)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🌡️ GPU-Temperatur-Überwachung</strong></div>${sToggle('game-gpu',true)}</div>`));
}

function buildAccessibilitySection(el) {
	el.appendChild(sTitle('Barrierefreiheit'));
	el.appendChild(sSub('Sehbehinderung, Motorik und kognitive Hilfen'));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🔍 Bildschirmlupe</strong></div>${sToggle('acc-mag',false)}</div><div class="settings-row" style="margin-top:8px"><span style="font-size:12px;color:var(--text-dim)">Zoom-Stufe</span>${sSlider('acc-zoom',100,400,100)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🌈 Hoher Kontrast</strong></div>${sToggle('acc-hc',false,"document.body.classList.toggle('high-contrast',this.checked)")}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>💬 Narrator (Sprachausgabe)</strong></div>${sToggle('acc-narrator',false)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>⌨️ Einrastfunktion</strong><p>Tastaturhilfen für Motorik</p></div>${sToggle('acc-sticky',false)}</div>`));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🖱️ Mauszeigergröße</strong></div>${sSlider('acc-cur',1,3,1)}</div>`));
}

function buildPrivacySection(el) {
	el.appendChild(sTitle('Datenschutz & Sicherheit'));
	el.appendChild(sSub('Berechtigungen, Diagnose und Sicherheitszentrum'));
	const secCard = document.createElement('div');
	secCard.className = 'settings-info-card';
	secCard.innerHTML = `
		<div class="info-card-icon" style="color:#4caf50">🛡️</div>
		<div class="info-card-body">
			<div class="info-card-name">Windows-Sicherheit</div>
			<div class="info-grid">
				<span class="info-key">Virenschutz</span><span class="info-val" style="color:#4caf50">✅ Aktiv</span>
				<span class="info-key">Firewall</span><span class="info-val" style="color:#4caf50">✅ Aktiv</span>
				<span class="info-key">Letzter Scan</span><span class="info-val">Heute, 08:30</span>
				<span class="info-key">Bedrohungen</span><span class="info-val" style="color:#4caf50">Keine</span>
			</div>
		</div>`;
	el.appendChild(secCard);
	[{id:'loc',icon:'📍',label:'Standort',desc:'Apps erlauben, auf Ihren Standort zuzugreifen'},
	 {id:'cam',icon:'📷',label:'Kamera',desc:'Apps erlauben, die Kamera zu verwenden'},
	 {id:'mic',icon:'🎙️',label:'Mikrofon',desc:'Apps erlauben, das Mikrofon zu verwenden'},
	 {id:'notif',icon:'🔔',label:'Benachrichtigungen',desc:'Apps erlauben, Benachrichtigungen zu senden'},
	 {id:'diag',icon:'📊',label:'Diagnosedaten',desc:'Daten zur Verbesserung von Windows senden'},
	 {id:'ads',icon:'🎯',label:'Personalisierte Werbung',desc:'Anzeigen auf Basis Ihrer Aktivitäten'},
	].forEach(p => el.appendChild(sCard(`<div class="settings-row"><div><strong>${p.icon} ${p.label}</strong><p>${p.desc}</p></div>${sToggle('priv-'+p.id,p.id==='notif')}</div>`)));
}

function buildUpdateSection(el) {
	el.appendChild(sTitle('Update & Sicherheit'));
	el.appendChild(sSub('Windows Update, Wiederherstellung und Sicherungsoptionen'));
	const updateCard = document.createElement('div');
	updateCard.className = 'settings-info-card';
	updateCard.id = 'update-status-card';
	updateCard.innerHTML = `
		<div class="info-card-icon">✅</div>
		<div class="info-card-body">
			<div class="info-card-name" id="update-status-text">Ihr Gerät ist auf dem neuesten Stand</div>
			<div class="info-grid">
				<span class="info-key">Letzte Prüfung</span><span class="info-val">Heute, 06:00 Uhr</span>
				<span class="info-key">Version</span><span class="info-val">Windows 11 23H2</span>
				<span class="info-key">Build</span><span class="info-val">22631.3007</span>
			</div>
		</div>`;
	el.appendChild(updateCard);
	const checkCard = document.createElement('div');
	checkCard.className = 'settings-card';
	checkCard.innerHTML = `<div class="settings-row"><div><strong>🔄 Nach Updates suchen</strong></div><button class="settings-btn" id="update-check-btn" onclick="simulateUpdateCheck()">Jetzt suchen</button></div>`;
	el.appendChild(checkCard);
	window.simulateUpdateCheck = () => {
		const btn = document.getElementById('update-check-btn');
		if (btn) { btn.textContent = '⏳ Suche...'; btn.disabled = true; }
		setTimeout(() => {
			const txt = document.getElementById('update-status-text');
			if (txt) txt.textContent = '✅ Keine neuen Updates gefunden';
			if (btn) { btn.textContent = 'Jetzt suchen'; btn.disabled = false; }
		}, 2500);
	};
	el.appendChild(sCard(sRow('<strong>⏰ Aktive Stunden</strong><p>Keine Updates zwischen 09:00 und 18:00</p>',sBtn('Ändern',"alert('Aktive Stunden...')"))));
	el.appendChild(sCard(sRow('<strong>🔁 Update-Kanal</strong>',sSelect('upd-channel',[{v:'stable',l:'Stabil (Empfohlen)'},{v:'beta',l:'Beta-Kanal'},{v:'dev',l:'Dev-Kanal'},{v:'none',l:'Manuell'}],'stable'))));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>💾 Datensicherung</strong><p>Automatische Sicherung aktivieren</p></div>${sToggle('upd-backup',true)}</div>`));
	el.appendChild(sCard(sRow('<strong>🔃 PC zurücksetzen</strong><p>Windows neu installieren</p>',sBtn('Zurücksetzen',"confirm('Wirklich zurücksetzen?')&&alert('Zurücksetzen gestartet...')",'settings-btn danger-btn'))));
	el.appendChild(sCard(`<div class="settings-row"><div><strong>🛡️ BitLocker-Verschlüsselung</strong></div>${sToggle('upd-bitlocker',false)}</div>`));
}


/* ============================
	 PERSONAL VERWALTUNG
============================ */
function renderPersonalVerwaltung(container) {
	container.classList.add('personnel-app-wrap');
	const canRead = hasRight('canRead');
	const canEdit = hasRight('canEdit');
	const canCreate = hasRight('canCreate');
	const canDelete = hasRight('canDelete');
	const canManageGroups = hasRight('canManageGroups');
	const groups = getAllGroups();

	if (!canRead) {
		container.innerHTML = '<div class="personnel-header"><h2>Personal Verwaltung</h2><p>Kein Leserechtes für diese Anwendung.</p></div>';
		return;
	}

	const groupOptions = groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
	container.innerHTML = `
		<div class="personnel-header">
			<h2>Personal Verwaltung</h2>
			<p>SQL-verwaltet: Personen lesen, bearbeiten, anlegen und löschen nach Berechtigungsprofil.</p>
		</div>
		<div class="personnel-form-grid">
			<div class="pv-preview-card">
				<img id="pv-preview" class="pv-preview pv-preview-lg" alt="Vorschau" />
				<div class="pv-preview-caption">Bildvorschau</div>
			</div>
			<input id="pv-firstname" class="s-input" type="text" placeholder="Vorname" />
			<input id="pv-lastname" class="s-input" type="text" placeholder="Nachname" />
			<input id="pv-staffid" class="s-input" type="text" placeholder="ID (z.B. A-2033)" />
			<input id="pv-password" class="s-input" type="password" maxlength="24" placeholder="Passwort" />
			<input id="pv-image" class="s-input" type="url" placeholder="Bild-URL" />
			<input id="pv-rank" class="s-input" type="text" placeholder="Rang / Dienstgrad" />
			<select id="pv-permission" class="s-select">${groupOptions}</select>
			<textarea id="pv-notes" class="s-input pv-notes" placeholder="Anmerkungen"></textarea>
			<label class="pv-check"><input id="pv-can-login" type="checkbox" checked /> Darf sich anmelden</label>
		</div>
		<div class="personnel-actions">
			<button id="pv-add" class="settings-btn">Mitarbeiter hinzufügen</button>
			<button id="pv-save" class="settings-btn">Änderungen speichern</button>
			<button id="pv-cancel" class="settings-btn-sm">Auswahl aufheben</button>
			<span id="pv-msg" class="pv-msg"></span>
		</div>
		<div class="personnel-table-wrap">
			<table class="personnel-table">
				<thead>
					<tr>
						<th>Bild</th>
						<th>Vorname</th>
						<th>Nachname</th>
						<th>ID</th>
						<th>Rang</th>
						<th>Berechtigung</th>
						<th>Anmerkungen</th>
						<th>Login</th>
						<th>Aktionen</th>
					</tr>
				</thead>
				<tbody id="pv-body"></tbody>
			</table>
		</div>
	`;

	const body = container.querySelector('#pv-body');
	const msg = container.querySelector('#pv-msg');
	const btnAdd = container.querySelector('#pv-add');
	const btnSave = container.querySelector('#pv-save');
	const btnCancel = container.querySelector('#pv-cancel');
	const permissionSelect = container.querySelector('#pv-permission');

	if (!canManageGroups) {
		permissionSelect.disabled = true;
		permissionSelect.title = 'Nur Superadmins dürfen Nutzergruppen ändern.';
	}
	btnAdd.disabled = !canCreate;
	btnSave.disabled = !canEdit;

	if (!canCreate) btnAdd.title = 'Keine Berechtigung zum Erstellen';
	if (!canEdit) btnSave.title = 'Keine Berechtigung zum Bearbeiten';

	function setMsg(text, ok = false) {
		msg.textContent = text;
		msg.style.color = ok ? '#88e188' : '#ff7a7a';
	}

	function clearForm() {
		editRecordId = null;
		['#pv-firstname','#pv-lastname','#pv-staffid','#pv-password','#pv-image','#pv-rank','#pv-notes'].forEach(sel => {
			const inp = container.querySelector(sel);
			if (inp) inp.value = '';
		});
		const chk = container.querySelector('#pv-can-login');
		if (chk) chk.checked = true;
		permissionSelect.value = groups.some(g => g.name === 'User') ? 'User' : (groups[0]?.name || '');
		const imgPreview = container.querySelector('#pv-preview');
		imgPreview.removeAttribute('src');
		imgPreview.style.display = 'none';
	}

	function renderRows() {
		body.innerHTML = '';
		getAllStaff().forEach(person => {
			const tr = document.createElement('tr');
			const safeNotes = person.notes ? person.notes.slice(0, 80) : '';
			const badgeClass = person.permission === 'Superadmin' ? 'perm-super' : (person.permission === 'Admin' ? 'perm-admin' : 'perm-user');
			const disabledRemove = canDelete ? '' : 'disabled title="Keine Löschberechtigung"';
			const disabledEdit = canEdit ? '' : 'disabled title="Keine Bearbeitungsberechtigung"';
			tr.innerHTML = `
				<td>${person.imageUrl ? `<img class="person-avatar person-avatar-rect" src="${person.imageUrl}" alt="${getDisplayName(person)}" />` : '<div class="person-avatar person-avatar-rect person-avatar-fallback">👤</div>'}</td>
				<td>${person.firstName}</td>
				<td>${person.lastName}</td>
				<td>${person.staffId}</td>
				<td>${person.rank || '-'}</td>
				<td><span class="perm-badge ${badgeClass}">${person.permission}</span></td>
				<td title="${person.notes || ''}">${safeNotes || '-'}</td>
				<td>${person.canLogin !== false ? 'Ja' : 'Nein'}</td>
				<td>
					<button class="settings-btn-sm" data-edit="${person.recordId}" ${disabledEdit}>Bearbeiten</button>
					<button class="settings-btn-sm danger" data-remove="${person.recordId}" ${disabledRemove}>Entfernen</button>
				</td>
			`;
			body.appendChild(tr);
		});
	}

	const imgInput = container.querySelector('#pv-image');
	const imgPreview = container.querySelector('#pv-preview');
	imgPreview.style.display = 'none';
	imgInput?.addEventListener('input', () => {
		const url = imgInput.value.trim();
		if (!url) {
			imgPreview.removeAttribute('src');
			imgPreview.style.display = 'none';
			return;
		}
		imgPreview.src = url;
		imgPreview.style.display = 'block';
	});

	btnAdd?.addEventListener('click', () => {
		if (!canCreate) {
			setMsg('Keine Berechtigung zum Erstellen.');
			return;
		}
		const firstName = container.querySelector('#pv-firstname')?.value?.trim() || '';
		const lastName = container.querySelector('#pv-lastname')?.value?.trim() || '';
		const staffId = container.querySelector('#pv-staffid')?.value?.trim() || '';
		const password = container.querySelector('#pv-password')?.value?.trim() || '';
		const imageUrl = container.querySelector('#pv-image')?.value?.trim() || '';
		const rank = container.querySelector('#pv-rank')?.value?.trim() || '';
		const permission = canManageGroups ? (container.querySelector('#pv-permission')?.value || 'User') : 'User';
		const notes = container.querySelector('#pv-notes')?.value?.trim() || '';
		const canLogin = !!container.querySelector('#pv-can-login')?.checked;

		if (!firstName || !lastName || !staffId || !password) {
			setMsg('Vorname, Nachname, ID und Passwort sind Pflichtfelder.');
			return;
		}
		if (sql('SELECT * FROM staff WHERE LOWER(staffId) = LOWER(?)', [staffId]).length) {
			setMsg('ID existiert bereits.');
			return;
		}

		sql('INSERT INTO staff VALUES (?,?,?,?,?,?,?,?,?,?)', [`rec-${Date.now()}`, firstName, lastName, staffId, password, imageUrl, rank, permission, notes, +!!canLogin]);
		persistSqlToStorage();
		syncLoginUserSelect();
		renderRows();
		setMsg('Mitarbeiter hinzugefügt.', true);
		clearForm();
	});

	btnSave?.addEventListener('click', () => {
		if (!canEdit) {
			setMsg('Keine Bearbeitungsberechtigung.');
			return;
		}
		if (!editRecordId) {
			setMsg('Bitte zuerst einen Eintrag über "Bearbeiten" wählen.');
			return;
		}

		const firstName = container.querySelector('#pv-firstname')?.value?.trim() || '';
		const lastName = container.querySelector('#pv-lastname')?.value?.trim() || '';
		const staffId = container.querySelector('#pv-staffid')?.value?.trim() || '';
		const password = container.querySelector('#pv-password')?.value?.trim() || '';
		const imageUrl = container.querySelector('#pv-image')?.value?.trim() || '';
		const rank = container.querySelector('#pv-rank')?.value?.trim() || '';
		const permission = container.querySelector('#pv-permission')?.value || 'User';
		const notes = container.querySelector('#pv-notes')?.value?.trim() || '';
		const canLogin = !!container.querySelector('#pv-can-login')?.checked;

		if (!firstName || !lastName || !staffId || !password) {
			setMsg('Vorname, Nachname, ID und Passwort sind Pflichtfelder.');
			return;
		}

		const duplicate = sql('SELECT * FROM staff WHERE LOWER(staffId)=LOWER(?) AND recordId <> ?', [staffId, editRecordId]);
		if (duplicate.length) {
			setMsg('Diese ID ist bereits vergeben.');
			return;
		}

		const current = sql('SELECT * FROM staff WHERE recordId = ?', [editRecordId])[0];
		const finalPermission = canManageGroups ? permission : current.permission;

		sql(
			'UPDATE staff SET firstName=?, lastName=?, staffId=?, password=?, imageUrl=?, rank=?, permission=?, notes=?, canLogin=? WHERE recordId=?',
			[firstName, lastName, staffId, password, imageUrl, rank, finalPermission, notes, +!!canLogin, editRecordId]
		);
		persistSqlToStorage();
		syncLoginUserSelect();
		renderRows();
		setMsg('Eintrag aktualisiert.', true);
		clearForm();
	});

	btnCancel?.addEventListener('click', () => {
		clearForm();
		setMsg('Auswahl aufgehoben.', true);
	});

	body.addEventListener('click', (e) => {
		const editBtn = e.target.closest('[data-edit]');
		if (editBtn) {
			if (!canEdit) {
				setMsg('Keine Bearbeitungsberechtigung.');
				return;
			}
			const id = editBtn.getAttribute('data-edit');
			const person = sql('SELECT * FROM staff WHERE recordId = ?', [id])[0];
			if (!person) return;
			editRecordId = id;
			container.querySelector('#pv-firstname').value = person.firstName;
			container.querySelector('#pv-lastname').value = person.lastName;
			container.querySelector('#pv-staffid').value = person.staffId;
			container.querySelector('#pv-password').value = person.password;
			container.querySelector('#pv-image').value = person.imageUrl || '';
			container.querySelector('#pv-rank').value = person.rank || '';
			container.querySelector('#pv-notes').value = person.notes || '';
			container.querySelector('#pv-can-login').checked = !!person.canLogin;
			container.querySelector('#pv-permission').value = person.permission;
			if (person.imageUrl) {
				imgPreview.src = person.imageUrl;
				imgPreview.style.display = 'block';
			} else {
				imgPreview.removeAttribute('src');
				imgPreview.style.display = 'none';
			}
			setMsg('Eintrag geladen. Änderungen speichern klicken.', true);
			return;
		}

		const btn = e.target.closest('[data-remove]');
		if (!btn) return;
		if (!canDelete) {
			setMsg('Keine Löschberechtigung.');
			return;
		}
		const id = btn.getAttribute('data-remove');
		sql('DELETE FROM staff WHERE recordId = ?', [id]);
		persistSqlToStorage();
		syncLoginUserSelect();
		renderRows();
		setMsg('Mitarbeiter entfernt.', true);
		ensureActiveSessionStillAllowed();
	});

	clearForm();
	renderRows();
}


/* ============================
	 NUTZERGRUPPEN MANAGEMENT
============================ */
function renderNutzergruppenManagement(container) {
	container.classList.add('personnel-app-wrap');
	const canRead = hasRight('canRead');
	const canManageGroups = hasRight('canManageGroups');

	if (!canRead) {
		container.innerHTML = '<div class="personnel-header"><h2>Nutzergruppen Management</h2><p>Kein Leserechtes für diese Anwendung.</p></div>';
		return;
	}

	container.innerHTML = `
		<div class="personnel-header">
			<h2>Nutzergruppen Management</h2>
			<p>Gruppenrechte (Read/Edit/Create/Delete/Groups) anpassen und neue Gruppen hinzufügen.</p>
		</div>
		<div class="personnel-actions">
			<input id="ng-name" class="s-input" type="text" placeholder="Neue Gruppe" style="max-width:220px" />
			<button id="ng-add" class="settings-btn">Gruppe hinzufügen</button>
			<span id="ng-msg" class="pv-msg"></span>
		</div>
		<div class="personnel-table-wrap">
			<table class="personnel-table">
				<thead>
					<tr>
						<th>Gruppe</th>
						<th>Read</th>
						<th>Edit</th>
						<th>Create</th>
						<th>Delete</th>
						<th>User-Gruppen ändern</th>
						<th>Aktion</th>
					</tr>
				</thead>
				<tbody id="ng-body"></tbody>
			</table>
		</div>
	`;

	const msg = container.querySelector('#ng-msg');
	const body = container.querySelector('#ng-body');
	const addBtn = container.querySelector('#ng-add');
	const addInput = container.querySelector('#ng-name');

	if (!canManageGroups) {
		addBtn.disabled = true;
		addInput.disabled = true;
		msg.textContent = 'Nur Superadmins dürfen Gruppenrechte ändern.';
		msg.style.color = '#ffca86';
	}

	function setMsg(text, ok = false) {
		msg.textContent = text;
		msg.style.color = ok ? '#88e188' : '#ff7a7a';
	}

	function cbox(name, val, groupName) {
		const dis = canManageGroups ? '' : 'disabled';
		return `<input type="checkbox" data-group="${groupName}" data-col="${name}" ${val ? 'checked' : ''} ${dis} />`;
	}

	function renderRows() {
		body.innerHTML = '';
		getAllGroups().forEach(g => {
			const tr = document.createElement('tr');
			tr.innerHTML = `
				<td>${g.name}</td>
				<td>${cbox('canRead', g.canRead, g.name)}</td>
				<td>${cbox('canEdit', g.canEdit, g.name)}</td>
				<td>${cbox('canCreate', g.canCreate, g.name)}</td>
				<td>${cbox('canDelete', g.canDelete, g.name)}</td>
				<td>${cbox('canManageGroups', g.canManageGroups, g.name)}</td>
				<td><button class="settings-btn-sm danger" data-remove-group="${g.name}" ${canManageGroups ? '' : 'disabled'}>Entfernen</button></td>
			`;
			body.appendChild(tr);
		});
	}

	addBtn.addEventListener('click', () => {
		if (!canManageGroups) return;
		const n = addInput.value.trim();
		if (!n) {
			setMsg('Gruppenname fehlt.');
			return;
		}
		if (sql('SELECT * FROM groups WHERE LOWER(name)=LOWER(?)', [n]).length) {
			setMsg('Gruppe existiert bereits.');
			return;
		}
		sql('INSERT INTO groups VALUES (?,?,?,?,?,?)', [n, 1, 0, 0, 0, 0]);
		persistSqlToStorage();
		renderRows();
		setMsg('Gruppe angelegt.', true);
		addInput.value = '';
	});

	body.addEventListener('change', (e) => {
		const box = e.target.closest('input[type="checkbox"][data-group][data-col]');
		if (!box || !canManageGroups) return;
		const group = box.getAttribute('data-group');
		const col = box.getAttribute('data-col');
		sql(`UPDATE groups SET ${col} = ? WHERE name = ?`, [+box.checked, group]);
		persistSqlToStorage();
		setMsg('Gruppenrechte aktualisiert.', true);
	});

	body.addEventListener('click', (e) => {
		const btn = e.target.closest('[data-remove-group]');
		if (!btn || !canManageGroups) return;
		const name = btn.getAttribute('data-remove-group');
		const assigned = sql('SELECT * FROM staff WHERE permission = ?', [name]).length;
		if (assigned) {
			setMsg('Gruppe ist Benutzern zugewiesen und kann nicht entfernt werden.');
			return;
		}
		sql('DELETE FROM groups WHERE name = ?', [name]);
		persistSqlToStorage();
		renderRows();
		setMsg('Gruppe entfernt.', true);
	});

	renderRows();
}
