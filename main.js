const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Shared DB helpers (also used by scripts/cron-sync.js)
const db = require('./lib/jobs-db');

const DB_PATH = db.DB_PATH;
const CONFIG_PATH = db.CONFIG_PATH;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Job Murderer',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
  watchDB();
}

// Watch the synced jobs.json so the UI refreshes when Clara (or any
// external agent) writes to it via the Syncthing folder. Self-writes
// go through saveDB() which stamps `suppressUntilMtime` to skip the
// echo. Debounced to coalesce Syncthing's write+rename bursts.
let dbWatcher = null;
let dbChangeTimer = null;
let lastKnownMtime = 0;

function watchDB() {
  try {
    lastKnownMtime = fs.statSync(DB_PATH).mtimeMs;
  } catch { lastKnownMtime = 0; }
  if (dbWatcher) dbWatcher.close();
  dbWatcher = fs.watch(DB_PATH, () => {
    clearTimeout(dbChangeTimer);
    dbChangeTimer = setTimeout(() => {
      let mtime;
      try { mtime = fs.statSync(DB_PATH).mtimeMs; } catch { return; }
      if (mtime === lastKnownMtime) return;
      lastKnownMtime = mtime;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('db:changed');
      }
    }, 300);
  });
}

function saveDB(data) {
  db.saveDB(data);
  try { lastKnownMtime = fs.statSync(DB_PATH).mtimeMs; } catch {}
  return data;
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ============================================================
// IPC HANDLERS
// ============================================================

// Get all jobs
ipcMain.handle('db:getAll', () => db.loadDB());

// Add a job (manual add from UI)
ipcMain.handle('db:addJob', (_, job) => {
  const data = db.loadDB();
  const blank = db.blankJob(job);
  data.jobs.push(blank);
  saveDB(data);
  return blank;
});

// Update a job
ipcMain.handle('db:updateJob', (_, id, updates) => {
  const data = db.loadDB();
  const idx = data.jobs.findIndex(j => j.id === id);
  if (idx === -1) return null;
  Object.assign(data.jobs[idx], updates, { lastModified: new Date().toISOString() });
  saveDB(data);
  return data.jobs[idx];
});

// Delete a job
ipcMain.handle('db:deleteJob', (_, id) => {
  const data = db.loadDB();
  data.jobs = data.jobs.filter(j => j.id !== id);
  saveDB(data);
  return true;
});

// Set status (used for ready/applied/responded/rejected transitions)
ipcMain.handle('db:setStatus', (_, id, status, extra = {}) => {
  const data = db.loadDB();
  const job = db.setStatus(data, id, status, extra);
  if (job) saveDB(data);
  return job;
});

// Mark a job applied (UI one-click transition)
ipcMain.handle('db:markApplied', (_, id, opts = {}) => {
  const data = db.loadDB();
  const job = db.markApplied(data, id, opts);
  if (job) saveDB(data);
  return job;
});

// Mark a response received
ipcMain.handle('db:markResponse', (_, id, notes) => {
  const data = db.loadDB();
  const job = db.markResponse(data, id, notes);
  if (job) saveDB(data);
  return job;
});

// Mark rejected
ipcMain.handle('db:markRejected', (_, id, notes) => {
  const data = db.loadDB();
  const job = db.markRejected(data, id, notes);
  if (job) saveDB(data);
  return job;
});

// Get config
ipcMain.handle('config:get', () => db.loadConfig());

// Save config
ipcMain.handle('config:save', (_, config) => { db.saveConfig(config); return true; });

// Import jobs from cron job output (JSON array) — shared upsert logic.
ipcMain.handle('db:importJobs', (_, newJobs) => {
  const data = db.loadDB();
  let added = 0, updated = 0;
  for (const job of newJobs) {
    const r = db.upsertJob(data, job);
    if (r.action === 'added') added++;
    else if (r.action === 'updated') updated++;
  }
  saveDB(data);
  return { added, updated, total: data.jobs.length };
});

// Export database path for cron jobs
ipcMain.handle('db:getPath', () => DB_PATH);

// Summary for dashboard (counts, ready list, follow-ups due)
ipcMain.handle('db:summary', () => db.summary(db.loadDB()));

// Check for follow-up reminders (preserves prior behavior)
ipcMain.handle('db:getReminders', () => {
  const data = db.loadDB();
  const config = db.loadConfig();
  const now = new Date();
  const reminders = [];

  for (const job of data.jobs) {
    if (job.status === 'applied' && job.dateApplied && !job.followUpSent) {
      const applied = new Date(job.dateApplied);
      const daysSince = Math.floor((now - applied) / (1000 * 60 * 60 * 24));
      if (daysSince >= config.followUpDaysMin && daysSince <= config.followUpDaysMax + 3) {
        reminders.push({
          ...job,
          daysSinceApplied: daysSince,
          urgent: daysSince >= config.followUpDaysMax
        });
      }
    }
  }
  return reminders;
});

// Show notification
ipcMain.handle('notify', (_, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// Read a saved source email (plain text) from the synced data/emails/ dir.
// Restricted to that directory — only a basename is honored.
const EMAILS_DIR = path.join(path.dirname(DB_PATH), 'emails');
ipcMain.handle('email:read', (_, file) => {
  if (!file) return null;
  const safe = path.basename(String(file));
  const full = path.join(EMAILS_DIR, safe);
  if (path.dirname(full) !== EMAILS_DIR) return null;
  try {
    return fs.readFileSync(full, 'utf8');
  } catch {
    return null;
  }
});
