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
});
