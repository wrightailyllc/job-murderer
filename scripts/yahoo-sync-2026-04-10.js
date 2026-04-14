#!/usr/bin/env node
// One-off sync 2026-04-10: applies the 6 definite updates derived from
// the Yahoo Mail handoff summary (Mar 1 – Apr 10, 2026 window).
//
//   1. coin001  → mark-rejected   (Coinbase 3/31)
//   2. jobg001  → append responseNotes (Jobgether 3/27 under screening)
//   3. cybc005  → new: CyberCoders Litigation Attorney (applied 4/8)
//   4. cybc006  → new: CyberCoders Employment Attorney (applied 4/8, dup submission)
//   5. kell001  → new: Keller Postman Litigation Support Attorney (applied ≤3/27)
//   6. vhill001 → new: Veronica Hills / Altamonte Springs Associate Attorney
//                 (applied ~3/27, status responded — "Sounds good, talk to you then")

const path = require('path');
const db = require(path.resolve(__dirname, '..', 'lib', 'jobs-db.js'));

const data = db.loadDB();
const log = [];

function iso(dateStr) { return new Date(dateStr + 'T12:00:00.000Z').toISOString(); }
function plus5(dateStr) {
  const d = new Date(dateStr + 'T12:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + 5);
  return d.toISOString().slice(0, 10);
}

// 1. Coinbase — rejected 3/31
const coinRejectNote =
  'Coinbase Recruiting (no-reply@appreview.gem.com) 2026-03-31: "we\'ve decided not to move forward with your candidacy... we currently have other candidates with experience that align more closely with our needs." Source: Yahoo Mail.';
const coin = db.markRejected(data, 'coin001', coinRejectNote);
if (coin) log.push(`[rejected] coin001 — ${coin.company} — ${coin.title}`);
else log.push('[WARN] coin001 not found');

// 2. Jobgether — under screening 3/27 (keep status applied, append responseNotes + notes)
const jobg = data.jobs.find(j => j.id === 'jobg001');
if (jobg) {
  const note = 'Jobgether confirmation 2026-03-27: "We\'re reviewing applications and will select top matching candidates for preliminary screening interviews. If you\'re among them, we\'ll contact you." Source: Yahoo Mail.';
  jobg.responseNotes = jobg.responseNotes
    ? `${jobg.responseNotes}\n${note}`
    : note;
  jobg.notes = jobg.notes
    ? `${jobg.notes} | Under-screening confirmation received 2026-03-27.`
    : 'Under-screening confirmation received 2026-03-27.';
  jobg.lastModified = new Date().toISOString();
  log.push(`[updated-notes] jobg001 — ${jobg.company} — ${jobg.title}`);
} else {
  log.push('[WARN] jobg001 not found');
}

// 3. CyberCoders — Litigation Attorney (new, applied 4/8)
const cybc005 = {
  id: 'cybc005',
  company: 'CyberCoders',
  title: 'Litigation Attorney',
  status: 'applied',
  salary: '',
  location: 'Unknown (CyberCoders posting)',
  source: 'CyberCoders (Yahoo confirmation)',
  url: '',
  dateAdded: iso('2026-04-08'),
  dateApplied: iso('2026-04-08'),
  lastModified: new Date().toISOString(),
  followUpDue: plus5('2026-04-08'),
  resumeSubmitted: true,
  coverLetterSubmitted: false,
  emailSent: false,
  writingSample: false,
  followUpSent: false,
  responseReceived: false,
  employerDetails: 'CyberCoders staffing. Confirmation email: noreply@cybercoders.com.',
  notes: 'Confirmation email 2026-04-08: "Thank you for applying for the Litigation Attorney position! You can keep track of all your applications and their status in your candidate dashboard." Distinct from cybc001 (Litigation Associate - REMOTE).',
  responseNotes: ''
};
const r1 = db.upsertJob(data, cybc005);
log.push(`[${r1.action}] cybc005 — CyberCoders Litigation Attorney`);

// 4. CyberCoders — Employment Attorney (new, applied 4/8, dup submission)
const cybc006 = {
  id: 'cybc006',
  company: 'CyberCoders',
  title: 'Employment Attorney',
  status: 'applied',
  salary: '',
  location: 'Unknown (CyberCoders posting)',
  source: 'CyberCoders (Yahoo confirmation)',
  url: '',
  dateAdded: iso('2026-04-08'),
  dateApplied: iso('2026-04-08'),
  lastModified: new Date().toISOString(),
  followUpDue: plus5('2026-04-08'),
  resumeSubmitted: true,
  coverLetterSubmitted: false,
  emailSent: false,
  writingSample: false,
  followUpSent: false,
  responseReceived: false,
  employerDetails: 'CyberCoders staffing. Confirmation emails: noreply@cybercoders.com.',
  notes: 'Confirmation email 2026-04-08: "Thank you for applying for the Employment Attorney position!" Two confirmation emails received for this role (likely duplicate submission).',
  responseNotes: ''
};
const r2 = db.upsertJob(data, cybc006);
log.push(`[${r2.action}] cybc006 — CyberCoders Employment Attorney`);

// 5. Keller Postman — Litigation Support Attorney (new, confirmation 3/27)
const kell001 = {
  id: 'kell001',
  company: 'Keller Postman',
  title: 'Litigation Support Attorney',
  status: 'applied',
  salary: '',
  location: 'Unknown (Greenhouse posting)',
  source: 'Greenhouse (Yahoo confirmation)',
  url: '',
  dateAdded: iso('2026-03-27'),
  dateApplied: iso('2026-03-27'),
  lastModified: new Date().toISOString(),
  followUpDue: '',
  resumeSubmitted: true,
  coverLetterSubmitted: false,
  emailSent: false,
  writingSample: false,
  followUpSent: false,
  responseReceived: false,
  employerDetails: 'Keller Postman. Application tracked via us.greenhouse-mail.io.',
  notes: 'Confirmation email 2026-03-27 (no-reply@us.greenhouse-mail.io): "Your application has been received and will be reviewed. If your application seems like a good fit, we will contact you soon." Source: Yahoo Mail.',
  responseNotes: ''
};
const r3 = db.upsertJob(data, kell001);
log.push(`[${r3.action}] kell001 — Keller Postman Litigation Support Attorney`);

// 6. Veronica Hills / Altamonte Springs — Associate Attorney (new, responded 3/30)
const vhill001 = {
  id: 'vhill001',
  company: 'Veronica Hills Law (Altamonte Springs)',
  title: 'Associate Attorney',
  status: 'responded',
  salary: '',
  location: 'Altamonte Springs, FL',
  source: 'Direct email (Yahoo)',
  url: '',
  dateAdded: iso('2026-03-27'),
  dateApplied: iso('2026-03-27'),
  lastModified: new Date().toISOString(),
  followUpDue: '',
  resumeSubmitted: true,
  coverLetterSubmitted: false,
  emailSent: true,
  writingSample: false,
  followUpSent: false,
  responseReceived: true,
  employerDetails: 'Veronica Hills — Associate Attorney role, Altamonte Springs FL. Direct correspondence in Yahoo Mail.',
  notes: 'POSITIVE RESPONSE. Email 2026-03-30: "Accepted — Sounds good, talk to you then." Meeting/call scheduled. Flag for follow-through.',
  responseNotes: 'Veronica Hills accepted meeting 2026-03-30: "Sounds good, talk to you then." Source: Yahoo Mail.'
};
const r4 = db.upsertJob(data, vhill001);
log.push(`[${r4.action}] vhill001 — Veronica Hills Altamonte Springs Associate Attorney`);

db.saveDB(data);

console.log('[yahoo-sync 2026-04-10] actions:');
for (const line of log) console.log('  ' + line);
console.log(`[yahoo-sync 2026-04-10] total jobs: ${data.jobs.length}`);
