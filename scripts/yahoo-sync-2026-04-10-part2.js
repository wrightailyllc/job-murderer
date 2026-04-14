#!/usr/bin/env node
// Yahoo Mail sync part 2 — 2026-04-10 late-night scrape.
// Covers: (a) LinkedIn-delivered rejections found via Yahoo Mail,
//         (b) new job entries surfaced from Yahoo confirmations,
//         (c) LinkedIn Easy Apply confirmations from the 2026-04-10 night batch,
//         (d) response/interview updates (micro1).
// Source: Yahoo Mail scrape via Chrome automation, see claude conversation
// 2026-04-10 ~23:50 EDT. Date window: 2026-03-01 and later only.

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

function markReject(id, note) {
  const r = db.markRejected(data, id, note);
  if (r) log.push(`[rejected] ${id} — ${r.company} — ${r.title}`);
  else log.push(`[WARN] ${id} not found`);
}

function newApplied(id, company, title, dateApplied, extra = {}) {
  const job = {
    id,
    company,
    title,
    status: 'applied',
    salary: extra.salary || '',
    location: extra.location || 'Unknown (LinkedIn/Yahoo)',
    source: extra.source || 'LinkedIn Easy Apply (Yahoo confirmation)',
    url: extra.url || '',
    dateAdded: iso(dateApplied),
    dateApplied: iso(dateApplied),
    lastModified: new Date().toISOString(),
    followUpDue: plus5(dateApplied),
    resumeSubmitted: true,
    coverLetterSubmitted: false,
    emailSent: false,
    writingSample: false,
    followUpSent: false,
    responseReceived: false,
    employerDetails: extra.employerDetails || '',
    notes: extra.notes || '',
    responseNotes: ''
  };
  const r = db.upsertJob(data, job);
  log.push(`[${r.action}] ${id} — ${company} — ${title}`);
}

// ============================================================
// (A) Rejections — LinkedIn "not moving forward" emails.
// ============================================================
markReject('wshb001',
  'LinkedIn rejection 2026-04-10: "Your application to Associate Attorney at Wood, Smith, Henning & Berman LLP — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('hsnk001',
  'LinkedIn rejection 2026-04-10: "Your application to Associate Attorney at Hightower, Stratton, Novigrod, Costello, Uzzi & Kantor — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('mbas001',
  'LinkedIn rejection 2026-04-09: "Your application to Litigation Associate – Consumer Protection / TCPA (Remote) at MB Attorney Search LLC — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('pare001',
  'LinkedIn rejection 2026-04-08: "Your application to Senior Legal Expert – AI Research Project at Pareto.AI — we will NOT be moving forward with your application." Source: Yahoo Mail.');
markReject('apts001',
  'LinkedIn rejection 2026-04-08: "Your application to eDiscovery Project Manager at APT Search — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('cons001',
  'LinkedIn rejection 2026-04-05: "Your application to Personal Injury Litigation Attorney at Consilio LLC — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('kill001',
  'LinkedIn rejection 2026-04-05: "Your application to Lawyer at The Killino Firm, P.C. — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('blev001',
  'LinkedIn rejection 2026-04-05: "Your application to Document Review Attorney (Remote, Short-Term) at Block & Leviton LLP — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('levi001',
  'LinkedIn rejection 2026-04-02: "Your application to Derivative Litigation Associate Attorney at Levi & Korsinsky, LLP — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('cybc001',
  'CyberCoders status update 2026-04-03: "Litigation Associate - REMOTE - Los Angeles, CA — We encourage you to continue exploring other roles." Treated as rejection. Source: Yahoo Mail.');
markReject('cybc002',
  'CyberCoders status update 2026-03-30: "Insurance Defense Litigator - Elevate your Career - APPLY NOW! - Orlando, FL — We encourage you to continue exploring other roles." Treated as rejection. Source: Yahoo Mail.');
markReject('orma001',
  'LinkedIn rejection 2026-03-30: "Your application to Associate at Orman Williams LLP — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('tgil001',
  'LinkedIn rejection 2026-03-30: "Your application to Legal Counsel at TGI Life Sciences — we will not be moving forward with your application." Source: Yahoo Mail.');
markReject('robh001',
  'LinkedIn rejection 2026-03-27: "Your application to Pre-Litigation Attorney at Robert Half — we will not be moving forward with your application." Source: Yahoo Mail.');

// ============================================================
// (B) Existing-entry annotations — add confirmation/identification notes.
// ============================================================

// piny001 — "Undisclosed (NY employer)" Personal Injury Associate Attorney
// now identified as Sullivan & Brill, LLP from Apr 10 LinkedIn rejection.
const piny = data.jobs.find(j => j.id === 'piny001');
if (piny) {
  piny.company = 'Sullivan & Brill, LLP';
  piny.location = piny.location || 'New York, NY';
  piny.notes = (piny.notes ? piny.notes + ' | ' : '') +
    'Employer identified as Sullivan & Brill, LLP via LinkedIn rejection 2026-04-10 11:55 AM.';
  piny.lastModified = new Date().toISOString();
  log.push('[updated-company] piny001 — Sullivan & Brill, LLP identified');
  // And apply the rejection
  markReject('piny001',
    'LinkedIn rejection 2026-04-10: "Your application to Personal Injury Associate Attorney at Sullivan & Brill, LLP — we will not be moving forward with your application." Source: Yahoo Mail.');
}

// wils001 — add Mar 30 confirmation note (application received).
const wils = data.jobs.find(j => j.id === 'wils001');
if (wils) {
  const note = 'Wilson Elser confirmation 2026-03-30 (talentacquisition@wilsonelser.com): "We have received your application. We will contact you by email if your application moves forward." Source: Yahoo Mail.';
  wils.notes = (wils.notes ? wils.notes + ' | ' : '') + note;
  wils.lastModified = new Date().toISOString();
  log.push('[note-added] wils001 — Wilson Elser confirmation');
}

// evee001 — Eve confirmation Mar 28.
const eve = data.jobs.find(j => j.id === 'evee001');
if (eve) {
  const note = 'Eve confirmation 2026-03-28 (no-reply@hire.lever.co): "Thank you for your application to Eve — Our team will review your application." Source: Yahoo Mail.';
  eve.notes = (eve.notes ? eve.notes + ' | ' : '') + note;
  eve.lastModified = new Date().toISOString();
  log.push('[note-added] evee001 — Eve confirmation');
}

// agil001 — Agiloft confirmation Apr 9.
const agi = data.jobs.find(j => j.id === 'agil001');
if (agi) {
  const note = 'Agiloft confirmation 2026-04-09 (no-reply@hire.lever.co): "We have received your application for Legal Knowledge Engineer. Our recruiting team will review." Source: Yahoo Mail.';
  agi.notes = (agi.notes ? agi.notes + ' | ' : '') + note;
  agi.lastModified = new Date().toISOString();
  log.push('[note-added] agil001 — Agiloft confirmation');
}

// ilaw001 — LawAI Research Scholar Apr 9 confirmation.
const ilaw = data.jobs.find(j => j.id === 'ilaw001');
if (ilaw) {
  const note = 'LawAI confirmation 2026-04-09: "Application Received: Research Scholar at LawAI — we received your application and will be in touch. Contact programs@law-ai.org." Source: Yahoo Mail.';
  ilaw.notes = (ilaw.notes ? ilaw.notes + ' | ' : '') + note;
  ilaw.lastModified = new Date().toISOString();
  log.push('[note-added] ilaw001 — LawAI confirmation');
}

// ============================================================
// (C) New entries — Yahoo confirmations with no jobs.json match.
// ============================================================

// Harvey — Mar 26 applied.
newApplied('harv001', 'Harvey', 'Attorney (role TBC)', '2026-03-26', {
  source: 'Harvey Hiring Team (Yahoo confirmation via Ashby)',
  location: 'Unknown (Ashby posting)',
  notes: 'Harvey confirmation email 2026-03-26 (no-reply@ashbyhq.com): "Thank You for Applying to Harvey — If your background aligns with what we\'re looking for, our recruiting team will be in touch with next steps." Title not specified in confirmation. Source: Yahoo Mail.'
});

// Willkie Farr & Gallagher LLP — Mar 31 applied (iCIMS).
newApplied('wilk001', 'Willkie Farr & Gallagher LLP', 'Attorney (role TBC)', '2026-03-31', {
  source: 'Willkie Farr iCIMS (Yahoo confirmation)',
  location: 'Unknown (iCIMS posting)',
  notes: 'Willkie Farr confirmation 2026-03-31 (willkie+autoreply@talent.icims.com): "Your Application to Willkie Farr & Gallagher LLP — We appreciate your interest in joining our team. We are currently reviewing applications." Title not specified. Source: Yahoo Mail.'
});

// GC AI Recruiting — Solutions Attorney — Mar 31 applied.
newApplied('gcai001', 'GC AI', 'Solutions Attorney', '2026-03-31', {
  source: 'GC AI Recruiting (Yahoo confirmation via Gem)',
  location: 'Unknown',
  notes: 'GC AI confirmation 2026-03-31 (no-reply@gem.com): "Thanks for applying to GC AI — We received your application for the Solutions Attorney role." Source: Yahoo Mail.'
});

// Darrow — Legal Intelligence Quality Counsel — Mar 28.
newApplied('darr001', 'Darrow', 'Legal Intelligence Quality Counsel', '2026-03-28', {
  source: 'Darrow (Yahoo confirmation)',
  location: 'Tel Aviv, Israel',
  notes: 'Darrow confirmation 2026-03-28: "Thanks for applying for Legal Intelligence Quality Counsel position in Tel Aviv. We\'re excited to review your application." Source: Yahoo Mail. Note: Tel Aviv location — verify remote eligibility.'
});

// Darrow — Legal Intelligence Analyst / Consumer Protection — Mar 27.
newApplied('darr002', 'Darrow', 'Legal Intelligence Analyst / Consumer Protection', '2026-03-27', {
  source: 'Darrow (Yahoo confirmation)',
  location: 'Tel Aviv, Israel',
  notes: 'Darrow confirmation 2026-03-27: "Thanks for applying for Legal Intelligence Analyst / Consumer Protection position in Tel Aviv. We\'re excited to review your application." Source: Yahoo Mail. Note: Tel Aviv location — verify remote eligibility.'
});

// Playlist/Mindbody — Senior Product Counsel — Mar 27 applied, Apr 6 rejected.
newApplied('plst001', 'Playlist (Mindbody)', 'Senior Product Counsel', '2026-03-27', {
  source: 'Mindbody/Playlist (Yahoo confirmation)',
  location: 'Unknown',
  notes: 'Playlist confirmation 2026-03-27 (no-reply@mindbodyonline.com): "Thank you for applying to Playlist — we have received your application for Senior Product Counsel." Same role as "Senior Product Counsel at Mindbody" rejected via LinkedIn 2026-04-04 and via Playlist direct 2026-04-06. Source: Yahoo Mail.'
});
// Now mark rejected.
markReject('plst001',
  'Playlist/Mindbody rejection 2026-04-06: "Thank you for applying to Playlist — move forward with other candidates at this point in the process." Also received LinkedIn rejection 2026-04-04 for same role. Source: Yahoo Mail.');

// Jobot Litigation Attorney | Personal Injury — 3rd Jobot role.
// Recruited by Jeni 2026-03-25, requested details 2026-03-27, waitlisted 2026-04-02, rejected 2026-04-03.
newApplied('jobo003', 'Jobot', 'Litigation Attorney | Personal Injury', '2026-03-24', {
  source: 'LinkedIn Easy Apply → Jobot (Yahoo correspondence)',
  location: 'Unknown',
  notes: 'Jobot Litigation Attorney | Personal Injury. Recruiter Jeni (Virtual Recruiting Assistant) called 2026-03-25: "Thank you for applying to the Litigation Attorney role." Follow-up 2026-03-27 requesting details (total experience, 2 jury trials as first chair, FL Bar standing, zip, work auth, salary, notice period, interview availability). Waitlisted 2026-04-02: "Your Litigation Attorney | Personal Injury Application is now Waitlisted." LinkedIn rejection 2026-04-03. Source: Yahoo Mail.'
});
// Set response received (had recruiter contact), then rejected final.
const jobo3 = data.jobs.find(j => j.id === 'jobo003');
if (jobo3) {
  jobo3.responseReceived = true;
  jobo3.responseNotes = 'Jobot recruiter Jeni reached out 2026-03-25 then 2026-03-27 requesting detailed candidate info. Did not respond. Waitlisted 2026-04-02, rejected 2026-04-03.';
}
markReject('jobo003',
  'Jobot rejection 2026-04-03 via LinkedIn. Previously waitlisted 2026-04-02. Initial recruiter outreach from Jeni 2026-03-25. Source: Yahoo Mail.');

// ============================================================
// (D) LinkedIn Easy Apply batch — 2026-04-10 night-time batch (11:45–11:53 PM EDT).
// These are new-to-jobs.json companies. Duplicates of existing entries are skipped.
// ============================================================
const apr10Batch = [
  ['latl001', 'Lateral Link',                               'Attorney (role TBC via Lateral Link)'],
  ['pemb001', 'Pemberton Personal Injury Law Firm',         'Attorney (role TBC)'],
  ['leed001', 'Leeds Professional Resources',               'Attorney (role TBC)'],
  ['lawf001', 'LawFirms (LinkedIn recruiter listing)',      'Attorney (role TBC)'],
  ['earl001', 'Earley Law Group Injury Lawyers',            'Attorney (role TBC)'],
  ['prev001', 'Prevail Recruiting',                         'Attorney (role TBC)'],
  ['bark001', 'Barker Patterson Nichols, LLP',              'Attorney (role TBC)'],
  ['carl001', 'The Carlson Law Firm',                       'Attorney (role TBC)'],
  ['fiel001', 'Fielding Law Group',                         'Attorney (role TBC)'],
  ['lwfu001', 'LawFusion.AI',                               'Attorney (role TBC)']
];
for (const [id, company, title] of apr10Batch) {
  newApplied(id, company, title, '2026-04-10', {
    notes: `LinkedIn Easy Apply confirmation 2026-04-10 ~23:45–23:53 EDT: "Jeffery, your application was sent to ${company}". Title not specified in Easy Apply confirmation. Source: Yahoo Mail.`
  });
}

// ============================================================
// (E) Interview / response updates.
// ============================================================

// micro1 — AI Attorney interview invite series. Add as new + responded.
newApplied('mic1001', 'micro1', 'Attorney (AI-matching)', '2026-03-28', {
  source: 'micro1 (Yahoo correspondence)',
  location: 'Remote (AI talent marketplace)',
  notes: 'micro1 AI-driven attorney matching platform. Multiple interview invitations received: 2026-03-28 "Your Attorney Application is Moving Forward - Complete Your Interview", 2026-03-29 "micro1 interview invite", 2026-03-31 "AI interview with micro1", 2026-04-02 "AI interview with micro1", 2026-04-05 "start micro1 interview". Platform uses 30-minute AI interview to match candidates. Source: Yahoo Mail.'
});
const mic = data.jobs.find(j => j.id === 'mic1001');
if (mic) {
  mic.status = 'responded';
  mic.responseReceived = true;
  mic.responseNotes = 'micro1 invited Jeff to complete AI interview 2026-03-28 through 2026-04-05 (multiple reminders). Next step: complete the 30-minute AI interview to unlock matching.';
  mic.lastModified = new Date().toISOString();
  log.push('[status->responded] mic1001 — micro1 Attorney');
}

// Divakshi Dhaliwal — LinkedIn recruiter with $84-$120/hr attorney opportunity, Apr 7.
newApplied('ddha001', 'Divakshi Dhaliwal (LinkedIn recruiter)', 'Remote Attorney Opportunity ($84-$120/hr)', '2026-04-07', {
  source: 'Divakshi Dhaliwal (LinkedIn / Yahoo)',
  location: 'Remote',
  notes: 'Divakshi Dhaliwal 2026-04-07: "Attorneys | Remote Opportunity | $84-$120/hr — Complete a short interview to discuss your fit." Recruiter outreach; no confirmed underlying employer yet. Source: Yahoo Mail.'
});
const dd = data.jobs.find(j => j.id === 'ddha001');
if (dd) {
  dd.status = 'responded';
  dd.responseReceived = true;
  dd.emailSent = false;
  dd.responseNotes = 'Divakshi Dhaliwal (LinkedIn recruiter) reached out 2026-04-07 offering remote attorney opportunity at $84-$120/hr, requested short interview. Source: Yahoo Mail.';
  dd.lastModified = new Date().toISOString();
  log.push('[status->responded] ddha001 — Divakshi Dhaliwal recruiter');
}

// ============================================================
// Save & report.
// ============================================================
db.saveDB(data);

console.log('[yahoo-sync 2026-04-10 part2] actions:');
for (const line of log) console.log('  ' + line);
console.log(`[yahoo-sync 2026-04-10 part2] total jobs: ${data.jobs.length}`);

// Summary by status
const byStatus = {};
for (const j of data.jobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1;
console.log('[yahoo-sync 2026-04-10 part2] status breakdown:', JSON.stringify(byStatus));
