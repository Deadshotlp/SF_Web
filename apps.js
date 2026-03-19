/* ============================
   APP FRAMEWORK – apps.js
   Modulares Anwendungs-Registry
============================ */

/**
 * AppRegistry
 * -----------
 * Zentrale Verwaltung aller registrierten Anwendungen.
 * Neue Apps können mit AppRegistry.register({...}) hinzugefügt werden.
 *
 * App-Definition:
 * {
 *   id:        string          // eindeutige ID, z.B. 'notepad'
 *   icon:      string          // Emoji oder HTML
 *   label:     string          // Anzeigename
 *   width:     number          // Standard-Fensterbreite in px
 *   height:    number          // Standard-Fensterhöhe in px
 *   pinned:    boolean         // Im Startmenü anzeigen?
 *   desktop:   boolean         // Desktop-Icon?
 *   render:    function(win)   // Wird mit dem Fenster-Content-div aufgerufen
 *   onOpen:    function()      // Optional: Callback beim Öffnen
 *   onClose:   function()      // Optional: Callback beim Schließen
 *   menuBar:   string[]        // Optional: Menüleisten-Einträge
 *   statusBar: string          // Optional: Initiale Statusleistentext
 * }
 */
const AppRegistry = (() => {
  const _apps = {};

  return {
    register(def) {
      if (!def.id) throw new Error('App muss eine ID haben.');
      _apps[def.id] = def;
      // Desktop-Icon erzeugen falls gewünscht
      if (def.desktop) _createDesktopIcon(def);
      // Startmenü-Eintrag erzeugen
      if (def.pinned !== false) _createStartMenuEntry(def);
      // Suchliste aktualisieren
      _updateSearchList(def);
    },

    get(id) { return _apps[id]; },
    getAll() { return Object.values(_apps); },

    open(id) {
      const app = _apps[id];
      if (!app) return console.warn(`App '${id}' nicht registriert.`);
      WindowManager.open(id, app);
    },
  };

  function _createDesktopIcon(app) {
    const desktop = document.getElementById('desktop');
    if (!desktop || document.getElementById('desk-icon-' + app.id)) return;
    const el = document.createElement('div');
    el.className = 'desktop-icon';
    el.id = 'desk-icon-' + app.id;
    el.draggable = true;
    el.innerHTML = `<div class="icon-img">${app.icon}</div><span>${app.label}</span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); selectIcon(el); });
    el.addEventListener('dblclick', (e) => { e.stopPropagation(); AppRegistry.open(app.id); });
    // Drag
    el.addEventListener('dragstart', (e) => {
      window._iconDrag = { el, startX: e.clientX, startY: e.clientY, origLeft: el.offsetLeft, origTop: el.offsetTop };
      e.dataTransfer.effectAllowed = 'move';
    });
    desktop.appendChild(el);
  }

  function _createStartMenuEntry(app) {
    const grid = document.getElementById('start-apps-grid');
    if (!grid || document.getElementById('sm-' + app.id)) return;
    const el = document.createElement('div');
    el.className = 'start-app';
    el.id = 'sm-' + app.id;
    el.innerHTML = `${app.icon}<br><small>${app.label}</small>`;
    el.addEventListener('dblclick', () => { AppRegistry.open(app.id); closeAllMenus(); });
    el.addEventListener('click',    () => { AppRegistry.open(app.id); closeAllMenus(); });
    grid.appendChild(el);
  }

  function _updateSearchList(app) {
    if (!window._searchApps) window._searchApps = [];
    window._searchApps.push({ icon: app.icon, label: app.label, id: app.id });
  }
})();


/* ============================
   WINDOW MANAGER
============================ */
const WindowManager = (() => {
  let zCounter = 200;
  const meta = {};  // { winId: { minimized, maximized, prevRect } }

  return {
    open(id, app) {
      const winId = 'win-' + id;
      let win = document.getElementById(winId);

      if (!win) {
        win = _buildWindow(winId, app);
        document.body.appendChild(win);
      }

      if (!meta[winId]) meta[winId] = { minimized: false, maximized: false };
      win.classList.remove('hidden', 'minimized');
      meta[winId].minimized = false;

      _focus(winId);
      _addTaskbarEntry(winId, app);

      if (app.onOpen) app.onOpen(win);
    },

    close(winId) {
      const win = document.getElementById(winId);
      if (!win) return;
      const id = winId.replace('win-', '');
      const app = AppRegistry.get(id);
      if (app?.onClose) app.onClose(win);
      win.classList.add('hidden');
      _removeTaskbarEntry(winId);
      delete meta[winId];
    },

    minimize(winId) {
      const win = document.getElementById(winId);
      if (!win) return;
      win.classList.add('minimized');
      if (meta[winId]) meta[winId].minimized = true;
      _markTaskbar(winId, false);
    },

    maximize(winId) {
      const win = document.getElementById(winId);
      if (!win) return;
      if (!meta[winId]) meta[winId] = {};
      const m = meta[winId];
      if (m.maximized) {
        const r = m.prevRect;
        if (r) { win.style.top = r.top; win.style.left = r.left; win.style.width = r.width; win.style.height = r.height; }
        win.classList.remove('maximized');
        m.maximized = false;
      } else {
        m.prevRect = { top: win.style.top, left: win.style.left, width: win.style.width, height: win.style.height };
        win.classList.add('maximized');
        m.maximized = true;
      }
    },

    toggleFromTaskbar(winId) {
      const win = document.getElementById(winId);
      if (!win) return;
      if (win.classList.contains('minimized')) {
        win.classList.remove('minimized');
        if (meta[winId]) meta[winId].minimized = false;
        _focus(winId);
      } else if (win.classList.contains('hidden')) {
        const id = winId.replace('win-', '');
        AppRegistry.open(id);
      } else if (win.classList.contains('focused')) {
        this.minimize(winId);
      } else {
        _focus(winId);
      }
    },

    isMeta(winId) { return meta[winId]; },
    getMeta(winId) { return meta[winId]; },
  };

  function _focus(winId) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
    const win = document.getElementById(winId);
    if (!win) return;
    win.style.zIndex = ++zCounter;
    win.classList.add('focused');
    _markTaskbar(winId, true);
  }

  function _buildWindow(winId, app) {
    const offsetX = 80 + (Math.random() * 80 | 0);
    const offsetY = 60 + (Math.random() * 60 | 0);
    const w = app.width  || 700;
    const h = app.height || 480;

    const win = document.createElement('div');
    win.className = 'window hidden';
    win.id = winId;
    win.style.cssText = `width:${w}px;height:${h}px;top:${offsetY}px;left:${offsetX}px;`;

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    titleBar.innerHTML = `
      <div class="title-bar-left">
        <span class="win-icon">${app.icon}</span>
        <span class="win-title">${app.label}</span>
      </div>
      <div class="title-bar-buttons">
        <button class="tb-btn minimize" title="Minimieren">─</button>
        <button class="tb-btn maximize" title="Maximieren">□</button>
        <button class="tb-btn close"    title="Schließen">✕</button>
      </div>`;
    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.title-bar-buttons')) return;
      DragManager.start(e, winId);
    });
    titleBar.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.title-bar-buttons')) WindowManager.maximize(winId);
    });
    titleBar.querySelector('.minimize').addEventListener('click', () => WindowManager.minimize(winId));
    titleBar.querySelector('.maximize').addEventListener('click', () => WindowManager.maximize(winId));
    titleBar.querySelector('.close').addEventListener('click',    () => WindowManager.close(winId));

    win.appendChild(titleBar);

    // Optional menu bar
    if (app.menuBar?.length) {
      const mb = document.createElement('div');
      mb.className = 'menu-bar';
      mb.innerHTML = app.menuBar.map(e => `<span class="menu-entry">${e}</span>`).join('');
      win.appendChild(mb);
    }

    // Content area
    const content = document.createElement('div');
    content.className = 'win-content';
    if (app.render) app.render(content, winId);
    win.appendChild(content);

    // Optional status bar
    if (app.statusBar !== undefined) {
      const sb = document.createElement('div');
      sb.className = 'status-bar';
      sb.id = 'sb-' + winId;
      sb.textContent = app.statusBar;
      win.appendChild(sb);
    }

    // Resize handle
    const rh = document.createElement('div');
    rh.className = 'resize-handle';
    rh.addEventListener('mousedown', (e) => ResizeManager.start(e, winId));
    win.appendChild(rh);

    // Focus on click
    win.addEventListener('mousedown', () => _focus(winId));

    return win;
  }

  function _addTaskbarEntry(winId, app) {
    const container = document.getElementById('running-apps');
    if (document.getElementById('tb-' + winId)) { _markTaskbar(winId, true); return; }
    const btn = document.createElement('button');
    btn.className = 'taskbar-app-btn running active-win';
    btn.id = 'tb-' + winId;
    btn.title = app.label;
    btn.innerHTML = `${app.icon} <span style="max-width:80px;overflow:hidden;text-overflow:ellipsis">${app.label}</span>`;
    btn.addEventListener('click', () => WindowManager.toggleFromTaskbar(winId));
    container.appendChild(btn);
  }

  function _removeTaskbarEntry(winId) {
    document.getElementById('tb-' + winId)?.remove();
  }

  function _markTaskbar(winId, active) {
    document.getElementById('tb-' + winId)?.classList.toggle('active-win', active);
  }
})();


/* ============================
   DRAG & RESIZE MANAGER
============================ */
const DragManager = (() => {
  let state = null;
  document.addEventListener('mousemove', (e) => {
    if (!state) return;
    const win = document.getElementById(state.winId);
    if (!win) return;
    win.style.left = (state.origLeft + e.clientX - state.startX) + 'px';
    win.style.top  = Math.max(0, state.origTop  + e.clientY - state.startY) + 'px';
  });
  document.addEventListener('mouseup', () => { state = null; });
  return {
    start(e, winId) {
      const win = document.getElementById(winId);
      if (!win || WindowManager.getMeta(winId)?.maximized) return;
      state = { winId, startX: e.clientX, startY: e.clientY,
        origLeft: parseInt(win.style.left) || win.getBoundingClientRect().left,
        origTop:  parseInt(win.style.top)  || win.getBoundingClientRect().top };
      e.preventDefault();
    }
  };
})();

const ResizeManager = (() => {
  let state = null;
  document.addEventListener('mousemove', (e) => {
    if (!state) return;
    const win = document.getElementById(state.winId);
    if (!win) return;
    win.style.width  = Math.max(320, state.origW + e.clientX - state.startX) + 'px';
    win.style.height = Math.max(220, state.origH + e.clientY - state.startY) + 'px';
  });
  document.addEventListener('mouseup', () => { state = null; });
  return {
    start(e, winId) {
      const win = document.getElementById(winId);
      if (!win) return;
      state = { winId, startX: e.clientX, startY: e.clientY, origW: win.offsetWidth, origH: win.offsetHeight };
      e.preventDefault(); e.stopPropagation();
    }
  };
})();


/* ============================
   DESKTOP ICON DRAG
============================ */
document.addEventListener('DOMContentLoaded', () => {
  const desktop = document.getElementById('desktop');
  desktop.addEventListener('dragover', (e) => e.preventDefault());
  desktop.addEventListener('drop', (e) => {
    const d = window._iconDrag;
    if (!d) return;
    e.preventDefault();
    d.el.style.left     = Math.max(0, d.origLeft + e.clientX - d.startX) + 'px';
    d.el.style.top      = Math.max(0, d.origTop  + e.clientY - d.startY) + 'px';
    d.el.style.position = 'absolute';
    window._iconDrag = null;
  });
});


/* ============================
   DESKTOP ICON UTILS
============================ */
function selectIcon(el) {
  document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
}
function deselectAll() {
  document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
  closeAllMenus();
}


/* ============================
   GLOBAL OPEN SHORTCUT
   (Rückwärtskompatibel)
============================ */
function openWindow(id) { AppRegistry.open(id); }
