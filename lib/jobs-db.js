// job-murderer/lib/jobs-db.js
// Shared DB helpers used by both the Electron main process and the
// cron-sync CLI. Keeps the schema and status transitions in one place
// so the twice-daily scheduled tasks can safely read/write jobs.json
// without drifting from the app's expectations.

const path = require('path');
const fs = require('fs');
const os = require('os');

// Data lives in a Syncthing-synced folder so the Mac Studio agent can
// read and write the same jobs.json. Override with JOB_MURDERER_DATA_DIR
// to point at a different location.
const DATA_DIR = process.env.JOB_MURDERER_DATA_DIR || path.join(os.homedir(), 'JobMurderer', 'data');
const DB_PATH = path.join(DATA_DIR, 'jobs.json');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');

const VALID_STATUSES = [
  'ready',      // new job found, materials not yet built/submitted
  'draft',      // materials in progress
  'applied',    // submitted
  'responded',  // response received (interview, follow-up, etc.)
  'rejected',
  'offer',
  'archived'
];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function nowISO() {
  return new Date().toISOString();
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function loadDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) {
    const initial = { jobs: [], lastUpdated: nowISO(), version: 1 };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(data) {
  ensureDataDir();
  data.lastUpdated = nowISO();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  return data;
}

function loadConfig() {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaults = {
      bccEmail: "",
      followUpDaysMin: 3,
      followUpDaysMax: 7,
      followUpStaleAfter: 14,
      notificationsEnabled: true
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(config) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function makeId(prefix = 'job') {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function blankJob(overrides = {}) {
  return {
    id: overrides.id || makeId(),
    company: '',
    title: '',
    status: 'ready',
    salary: '',
    location: '',
    source: 'cron-job',
    url: '',
    postingDate: '',
    foundDate: '',
    dateAdded: nowISO(),
    dateApplied: '',
    lastModified: nowISO(),
    followUpDue: '',
    resumeSubmitted: false,
    coverLetterSubmitted: false,
    emailSent: false,
    writingSample: false,
    followUpSent: false,
    responseReceived: false,
    employerDetails: '',
    notes: '',
    responseNotes: '',
    ...overrides
  };
}

// Deduplicate by URL (strongest) then by company+title.
function findExisting(db, job) {
  return db.jobs.find(j =>
    (job.url && j.url && j.url === job.url) ||
    (j.company && j.title && job.company && job.title &&
      j.company.toLowerCase() === job.company.toLowerCase() &&
      j.title.toLowerCase() === job.title.toLowerCase())
  );
}

// Upsert: add new job if not a duplicate; if duplicate, merge in any
// non-empty fields from the incoming record but preserve existing
// status/dates/submission flags unless explicitly forced.
function upsertJob(db, incoming, { force = false } = {}) {
  const existing = findExisting(db, incoming);
  if (!existing) {
    const job = blankJob({ ...incoming });
    if (!VALID_STATUSES.includes(job.status)) job.status = 'ready';
    db.jobs.push(job);
    return { action: 'added', job };
  }

  const merged = { ...existing };
  const protectedKeys = force
    ? []
    : ['id', 'status', 'dateAdded', 'dateApplied', 'followUpDue',
       'resumeSubmitted', 'coverLetterSubmitted', 'emailSent',
       'writingSample', 'followUpSent', 'responseReceived', 'responseNotes'];

  for (const [k, v] of Object.entries(incoming)) {
    if (protectedKeys.includes(k)) continue;
    if (v === undefined || v === null || v === '') continue;
    merged[k] = v;
  }
  merged.lastModified = nowISO();
  Object.assign(existing, merged);
  return { action: 'updated', job: existing };
}

function setStatus(db, id, status, extra = {}) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Valid: ${VALID_STATUSES.join(', ')}`);
  }
  const job = db.jobs.find(j => j.id === id);
  if (!job) return null;
  job.status = status;
  job.lastModified = nowISO();
  Object.assign(job, extra);
  return job;
}

function markApplied(db, id, { dateApplied = nowISO(), followUpDays = 5 } = {}) {
  const job = db.jobs.find(j => j.id === id);
  if (!job) return null;
  job.status = 'applied';
  job.dateApplied = dateApplied;
  job.emailSent = true;
  job.resumeSubmitted = true;
  job.coverLetterSubmitted = true;
  const due = new Date(dateApplied);
  due.setDate(due.getDate() + followUpDays);
  job.followUpDue = due.toISOString().slice(0, 10);
  job.lastModified = nowISO();
  return job;
}

function markResponse(db, id, notes = '') {
  const job = db.jobs.find(j => j.id === id);
  if (!job) return null;
  job.responseReceived = true;
  job.status = 'responded';
  if (notes) job.responseNotes = notes;
  job.lastModified = nowISO();
  return job;
}

function markRejected(db, id, notes = '') {
  const job = db.jobs.find(j => j.id === id);
  if (!job) return null;
  job.status = 'rejected';
  job.responseReceived = true;
  if (notes) job.responseNotes = notes;
  job.lastModified = nowISO();
  return job;
}

function listReady(db) {
  return db.jobs.filter(j => j.status === 'ready');
}

function listApplied(db) {
  return db.jobs.filter(j => j.status === 'applied');
}

function listNeedingFollowUp(db, { today = todayISODate() } = {}) {
  return db.jobs.filter(j =>
    j.status === 'applied' &&
    !j.followUpSent &&
    j.followUpDue &&
    j.followUpDue <= today
  );
}

function summary(db) {
  const byStatus = {};
  for (const j of db.jobs) {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
  }
  return {
    total: db.jobs.length,
    byStatus,
    ready: listReady(db).map(j => ({ id: j.id, company: j.company, title: j.title, salary: j.salary, location: j.location, url: j.url })),
    needingFollowUp: listNeedingFollowUp(db).map(j => ({ id: j.id, company: j.company, title: j.title, followUpDue: j.followUpDue })),
    lastUpdated: db.lastUpdated
  };
}

module.exports = {
  DB_PATH,
  CONFIG_PATH,
  VALID_STATUSES,
  loadDB,
  saveDB,
  loadConfig,
  saveConfig,
  blankJob,
  makeId,
  findExisting,
  upsertJob,
  setStatus,
  markApplied,
  markResponse,
  markRejected,
  listReady,
  listApplied,
  listNeedingFollowUp,
  summary
};
