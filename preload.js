const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Database
  getAll: () => ipcRenderer.invoke('db:getAll'),
  addJob: (job) => ipcRenderer.invoke('db:addJob', job),
  updateJob: (id, updates) => ipcRenderer.invoke('db:updateJob', id, updates),
  deleteJob: (id) => ipcRenderer.invoke('db:deleteJob', id),
  importJobs: (jobs) => ipcRenderer.invoke('db:importJobs', jobs),
  getReminders: () => ipcRenderer.invoke('db:getReminders'),
  getDBPath: () => ipcRenderer.invoke('db:getPath'),
  summary: () => ipcRenderer.invoke('db:summary'),

  // Status transitions (used by cron jobs and the UI)
  setStatus: (id, status, extra) => ipcRenderer.invoke('db:setStatus', id, status, extra),
  markApplied: (id, opts) => ipcRenderer.invoke('db:markApplied', id, opts),
  markResponse: (id, notes) => ipcRenderer.invoke('db:markResponse', id, notes),
  markRejected: (id, notes) => ipcRenderer.invoke('db:markRejected', id, notes),

  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config) => ipcRenderer.invoke('config:save', config),

  // Notifications
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),

  // External writes (e.g. Clara on Studio syncing jobs.json via Syncthing).
  // Fires whenever the DB file changes on disk from something other than the app itself.
  onDbChanged: (callback) => {
    ipcRenderer.removeAllListeners('db:changed');
    ipcRenderer.on('db:changed', () => callback());
  },
});
