#!/usr/bin/env node
// One-off bulk import 2026-04-10: pulls jobs from LinkedIn tracker PDFs
// (pages 1-9) and Gmail sent/inbox PDFs supplied by the user.
// Uses lib/jobs-db.js upsertJob so dedup (URL or company+title) matches
// the same behavior as scripts/cron-sync.js upsert-batch.

const path = require('path');
const db = require(path.resolve(__dirname, '..', 'lib', 'jobs-db.js'));

// 2026-04-10 is the reference "today" per the PDF capture timestamps.
const REF = new Date('2026-04-10T12:00:00.000Z');
function daysAgo(n) {
  const d = new Date(REF);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}
function followUpPlus5(iso) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + 5);
  return d.toISOString().slice(0, 10);
}
// LinkedIn relative-date buckets seen in the PDFs.
const D = {
  d2: daysAgo(2),
  d3: daysAgo(3),
  d4: daysAgo(4),
  w1: daysAgo(7),
  w2: daysAgo(14),
  w3: daysAgo(21),
  mo1: daysAgo(30),
  mo3: daysAgo(90),
  mo4: daysAgo(120),
  mo5: daysAgo(150),
  mo11: daysAgo(330)
};

// Only set followUpDue for jobs applied within the last ~10 days so we
// don't flood listNeedingFollowUp with historical entries.
function mk({ id, company, title, loc, url = '', salary = '', dateKey, source = 'LinkedIn', notes = '', status = 'applied', details = '' }) {
  const dateApplied = D[dateKey];
  const recent = ['d2', 'd3', 'd4', 'w1'].includes(dateKey);
  return {
    id,
    company,
    title,
    status,
    salary,
    location: loc,
    source,
    url,
    dateAdded: dateApplied,
    dateApplied,
    lastModified: dateApplied,
    followUpDue: recent ? followUpPlus5(dateApplied) : '',
    resumeSubmitted: true,
    coverLetterSubmitted: false,
    emailSent: false,
    writingSample: false,
    followUpSent: false,
    responseReceived: false,
    employerDetails: details || `${company}. Imported from LinkedIn Job Tracker 2026-04-10.`,
    notes,
    responseNotes: ''
  };
}

const batch = [
  // ── LinkedIn Job Tracker page 1 ──────────────────────────────────────
  mk({ id: 'flex001', company: 'FLEX by Fenwick', title: 'Technology Transactions Attorney', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'lawt001', company: 'The Lawt', title: 'Litigation Associate', loc: 'San Jose, CA (Hybrid)', dateKey: 'd3', notes: 'No longer accepting applications.' }),
  mk({ id: 'beac001', company: 'Beacon Hill', title: 'Product Liability Litigation Associate Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'd3', notes: 'No longer accepting applications.' }),
  mk({ id: 'tgil001', company: 'TGI Life Sciences', title: 'Legal Counsel', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'gers001', company: 'Gerson & Schwartz Accident & Injury Lawyers', title: 'Litigation Associate', loc: 'Miami-Dade County, FL (On-site)', dateKey: 'd2' }),
  mk({ id: 'bogi001', company: 'Bogin, Munns & Munns', title: 'Personal Injury Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'd2', notes: 'LinkedIn reports: Resume downloaded by employer.' }),
  mk({ id: 'apts001', company: 'APT Search', title: 'eDiscovery Project Manager', loc: 'North Carolina, United States (Hybrid)', salary: '$120,000 - $140,000 + yearly profit share', dateKey: 'd2' }),
  mk({ id: 'walr001', company: 'We Are Legal Revolution', title: 'Personal Injury Attorney', loc: 'Orlando, FL (Hybrid)', salary: 'Up to $250k base + Case Bonus', dateKey: 'd3', notes: 'No longer accepting applications.' }),
  mk({ id: 'carn001', company: 'Carnaby Fox', title: 'Attorney', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'lile001', company: 'Liles Search Group LLC', title: 'Litigation Associate Attorney, Remote/Hybrid, Law Firm - Great Hours', loc: 'United States (Remote)', dateKey: 'd3' }),

  // ── LinkedIn Job Tracker page 2 ──────────────────────────────────────
  mk({ id: 'appl001', company: 'AppleOne Employment Services', title: 'Associate Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'd3' }),
  mk({ id: 'wshb001', company: 'Wood, Smith, Henning & Berman LLP', title: 'Associate Attorney', loc: 'Orlando, FL (Hybrid)', dateKey: 'd3' }),
  mk({ id: 'amss001', company: 'AMS Staffing Inc.', title: 'Litigation Attorney- 3572569', loc: 'Orlando, FL (On-site)', dateKey: 'd3' }),
  mk({ id: 'piny001', company: 'Undisclosed (NY employer via LinkedIn)', title: 'Personal Injury Associate Attorney', loc: 'New York, NY (Remote)', dateKey: 'd3', notes: 'Employer name not shown on LinkedIn posting.' }),
  mk({ id: 'dtlp001', company: 'Demand the Limits Personal Injury Attorneys', title: 'Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'd3', notes: 'LinkedIn reports: Application viewed.' }),
  mk({ id: 'hsnk001', company: 'Hightower, Stratton, Novigrod & Kantor', title: 'Associate Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'd3' }),
  mk({ id: 'verr001', company: 'Verrus', title: 'Commercial Litigation Attorney', loc: 'United States (Remote)', dateKey: 'w1' }),
  mk({ id: 'alch001', company: 'Alexander Chapman', title: 'Head of Legal', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'prml001', company: 'Primeline Solutions LLC', title: 'Insurance & Financial Services Litigation Associate Attorney', loc: 'United States (Remote)', dateKey: 'w1', notes: 'No longer accepting applications.' }),
  mk({ id: 'scmr001', company: 'Success Matcher Recruitment', title: 'Litigation Associate', loc: 'United States (Remote)', dateKey: 'w1', notes: 'No longer accepting applications.' }),

  // ── LinkedIn Job Tracker page 3 ──────────────────────────────────────
  mk({ id: 'mbas001', company: 'MB Attorney Search LLC', title: 'Litigation Associate – Consumer Protection / TCPA (Remote)', loc: 'United States (Remote)', dateKey: 'd4', notes: 'LinkedIn reports: Application viewed.' }),
  mk({ id: 'lyra001', company: 'Lyra Health', title: 'Commercial Counsel, Contracts', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'hsaf001', company: 'Hall, Schieffelin & Smith, P.A.', title: 'Attorney', loc: 'Winter Park, FL (On-site)', dateKey: 'w1', notes: 'LinkedIn reports: Resume downloaded by employer. No longer accepting applications.' }),
  mk({ id: 'wils001', company: 'Wilson Elser', title: 'Complex Litigation Associate Attorney', loc: 'Orlando, FL (Hybrid)', dateKey: 'w1' }),
  mk({ id: 'cybc001', company: 'CyberCoders', title: 'Litigation Associate - REMOTE', loc: 'San Francisco, CA (Remote)', dateKey: 'w1' }),
  mk({ id: 'pare001', company: 'Pareto.AI', title: 'Senior Legal Expert – AI Research Project', loc: 'United States (Remote)', dateKey: 'w2', notes: 'LinkedIn reports: Application viewed. No longer accepting applications.' }),
  mk({ id: 'anid001', company: 'Anidjar & Levine P.A.', title: 'Litigation Paralegal - Top Law Firm', loc: 'Orlando, FL (On-site)', dateKey: 'w1', notes: 'No longer accepting applications.' }),
  mk({ id: 'inno001', company: 'Innovative Driven', title: 'Litigation Associate (Remote)', loc: 'United States (Remote)', dateKey: 'w1', notes: 'No longer accepting applications.' }),
  mk({ id: 'alch002', company: 'Alexander Chapman', title: 'Associate General Counsel', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'cons001', company: 'Consilio LLC', title: 'Personal Injury Litigation Attorney', loc: 'United States (Remote)', dateKey: 'w1', notes: 'No longer accepting applications.' }),

  // ── LinkedIn Job Tracker page 4 ──────────────────────────────────────
  mk({ id: 'levi001', company: 'Levi & Korsinsky, LLP', title: 'Derivative Litigation Associate Attorney', loc: 'United States (Remote)', dateKey: 'w1', notes: 'No longer accepting applications.' }),
  mk({ id: 'lgio001', company: 'Legal.io', title: 'Litigation Counsel, Discovery', loc: 'United States (Remote)', dateKey: 'w1' }),
  mk({ id: 'asce001', company: 'Ascendion', title: 'Personal Injury Attorney', loc: 'Florida, United States (Remote)', dateKey: 'w2', notes: 'LinkedIn reports: Application viewed. No longer accepting applications.' }),
  mk({ id: 'with001', company: 'WithumSmith+Brown', title: 'Assistant General Counsel', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'kill001', company: 'The Killino Firm, P.C.', title: 'Lawyer', loc: 'United States (Remote)', dateKey: 'w1' }),
  mk({ id: 'mong001', company: 'Monge & Associates Injury and Accident Attorneys', title: 'Personal Injury Attorney', loc: 'United States (Remote)', dateKey: 'w1' }),
  mk({ id: 'blev001', company: 'Block & Leviton LLP', title: 'Document Review Attorney (Remote, Short-Term)', loc: 'Boston, MA (Remote)', dateKey: 'w1' }),
  mk({ id: 'jobo001', company: 'Jobot', title: 'Associate Attorney - 1st Party (1-4 year)', loc: 'Orlando, FL (On-site)', dateKey: 'w3' }),
  mk({ id: 'brdg001', company: 'Bridgeline Solutions', title: 'Privacy Counsel - Contract - Major Pharma Company', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),

  // ── LinkedIn Job Tracker page 5 ──────────────────────────────────────
  mk({ id: 'avan001', company: 'Avantia Law', title: 'US Qualified Consultant Lawyer - NDA specialist (Remote)', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'inno002', company: 'Innovative Driven', title: 'Part-Time Litigation Associate (Remote)', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'cobb001', company: 'Cobb & Johns', title: 'Mid-Level Litigation Associate', loc: 'United States (Remote)', dateKey: 'w1' }),
  mk({ id: 'lhhs001', company: 'LHH', title: 'Litigation Associate', loc: 'United States (Remote)', dateKey: 'w1' }),
  mk({ id: 'cybc002', company: 'CyberCoders', title: 'Insurance Defense Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'w1' }),
  mk({ id: 'jobg001', company: 'Jobgether', title: 'Legal Solutions Director', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'ptxt001', company: 'Patentext', title: 'Patent Agent', loc: 'United States (Remote)', dateKey: 'w2', notes: 'LinkedIn reports: Application viewed. No longer accepting applications.' }),
  mk({ id: 'book001', company: 'Bookoff McAndrews, PLLC', title: 'Patent Attorney - Life Sciences', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'orma001', company: 'Orman Williams LLP', title: 'Associate', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'coin001', company: 'Coinbase, Inc', title: 'Senior Counsel, Commercial Legal', loc: 'United States (Remote)', dateKey: 'w2' }),

  // ── LinkedIn Job Tracker page 6 ──────────────────────────────────────
  mk({ id: 'cros001', company: 'Crosby', title: 'Remote In-House Counsel', loc: 'United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'lgio002', company: 'Legal.io', title: 'Product Counsel - Content & Platform Regulation', loc: 'United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'mlaf001', company: 'Major, Lindsey & Africa', title: 'Interim Contracts Counsel', loc: 'United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'adat001', company: 'Ad Atlantic', title: 'Regulatory Counsel', loc: 'United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'bolt001', company: 'bolt', title: 'Legal Counsel', loc: 'United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'terr001', company: 'Terrascend Corp. - Gage Cannabis', title: 'Counsel, Commercial Transactions and Litigation', loc: 'United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'elev001', company: 'Elevate Legal Talent', title: 'Product Attorney', loc: 'United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'ltks001', company: 'LTK', title: 'Associate Counsel, Product & Regulatory', loc: 'United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'docd001', company: 'DocDraft', title: 'Part-time attorney', loc: 'United States (Remote)', dateKey: 'w2', notes: 'LinkedIn reports: Application viewed.' }),
  mk({ id: 'cros002', company: 'Crosby', title: 'Remote Commercial Counsel', loc: 'United States (Remote)', dateKey: 'w2' }),

  // ── LinkedIn Job Tracker page 7 ──────────────────────────────────────
  mk({ id: 'lars001', company: 'Larson Maddox', title: 'Remote Litigation Associate Attorney', loc: 'United States (Remote)', dateKey: 'w2', notes: 'No longer accepting applications.' }),
  mk({ id: 'robh001', company: 'Robert Half', title: 'Pre-Litigation Attorney', loc: 'California, United States (Remote)', dateKey: 'w2' }),
  mk({ id: 'aker001', company: 'Akerman LLP', title: 'Litigation Associate Attorney', loc: 'Greater Orlando (Hybrid)', dateKey: 'w2' }),
  mk({ id: 'neja001', company: 'NeJame Law, P.A.', title: 'Civil Litigation Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'w2' }),
  mk({ id: 'moog001', company: 'Moody & Graf, P.A.', title: 'Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'mo1', notes: 'No longer accepting applications.' }),
  mk({ id: 'wide001', company: 'Widerman Malek, PL', title: 'Civil Litigation Associate Attorney', loc: 'Celebration, FL (On-site)', dateKey: 'mo3', notes: 'LinkedIn reports: Resume downloaded by employer. No longer accepting applications.' }),
  mk({ id: 'appl002', company: 'AppleOne Employment Services', title: 'Attorney', loc: 'Maitland, FL (On-site)', dateKey: 'mo1', notes: 'No longer accepting applications.' }),
  mk({ id: 'jobo002', company: 'Jobot', title: 'Complex Commercial Litigation Associate', loc: 'Orlando, FL (On-site)', dateKey: 'mo1', notes: 'No longer accepting applications.' }),
  mk({ id: 'ctla001', company: 'Undisclosed (Fort Myers employer via LinkedIn)', title: 'Civil Trial Litigation Associate Attorney', loc: 'Fort Myers, FL (On-site)', dateKey: 'mo1', notes: 'LinkedIn reports: Application viewed. Employer name not shown on LinkedIn posting.' }),

  // ── LinkedIn Job Tracker page 8 ──────────────────────────────────────
  mk({ id: 'chub001', company: 'Chubb Law Accident & Injury Attorneys', title: 'Litigation Attorney / Trial Lawyer', loc: 'Lake Mary, FL (Hybrid)', dateKey: 'mo4', notes: 'LinkedIn reports: Application viewed. No longer accepting applications.' }),
  mk({ id: 'bowm001', company: 'Bowman and Brooke', title: 'Litigation Associate/Counsel', loc: 'Lake Mary, FL', dateKey: 'mo4', notes: 'LinkedIn reports: Application viewed. No longer accepting applications.' }),
  mk({ id: 'cybc003', company: 'CyberCoders', title: 'REMOTE Attorney - 1st Party Property/Personal Injury', loc: 'Atlanta, GA (Remote)', dateKey: 'mo3', notes: 'No longer accepting applications.' }),
  mk({ id: 'onot001', company: 'OneNotary', title: 'Online Notary Public | Florida', loc: 'Florida, United States (Remote)', dateKey: 'mo4', notes: 'LinkedIn reports: Application viewed. No longer accepting applications.' }),
  mk({ id: 'kwcd001', company: 'Key West Criminal Defense', title: 'Associate Attorney', loc: 'Orlando, FL (On-site)', dateKey: 'mo3', notes: 'No longer accepting applications.' }),
  mk({ id: 'occs001', company: 'On Call Counsel', title: 'Remote Litigation Attorney (ID# 4282)', loc: 'Charlotte, NC (Remote)', dateKey: 'mo3', notes: 'No longer accepting applications.' }),
  mk({ id: 'kava001', company: 'Kavaliro', title: 'Sr. Litigation Associate', loc: 'Orlando, FL (On-site)', dateKey: 'mo4', notes: 'LinkedIn reports: Application viewed. No longer accepting applications.' }),
  mk({ id: 'horo001', company: 'Horowitz Law', title: 'Legal Assistant / Paralegal', loc: 'Florida, United States (Remote)', dateKey: 'mo4', notes: 'No longer accepting applications.' }),
  mk({ id: 'dtlp002', company: 'Demand the Limits Personal Injury Attorneys', title: 'Attorney (prior posting)', loc: 'Orlando, FL (On-site)', dateKey: 'mo4', notes: 'Earlier 4mo-ago application at the same firm — separate posting from dtlp001. No longer accepting applications.' }),

  // ── LinkedIn Job Tracker page 9 ──────────────────────────────────────
  mk({ id: 'cybc004', company: 'CyberCoders', title: 'Attorney--Civil Litigation', loc: 'Orlando, FL (On-site)', dateKey: 'mo5', notes: 'No longer accepting applications.' }),
  mk({ id: 'kauf001', company: 'Kaufman Dolowich LLP', title: 'Legal Assistant', loc: 'Orlando, FL (Hybrid)', dateKey: 'mo11', notes: 'No longer accepting applications.' }),
  mk({ id: 'myou001', company: 'Michael Youssef Attorney at Law', title: 'Legal Intern', loc: 'United States (Remote)', dateKey: 'mo11', notes: 'LinkedIn reports: Application viewed. No longer accepting applications.' }),
  mk({ id: 'rope001', company: 'Roper, Townsend & Sutphen, P.A.', title: 'Experienced Civil Litigation/Personal Injury Paralegal', loc: 'Orlando, FL (On-site)', dateKey: 'mo11', notes: 'LinkedIn reports: Resume downloaded by employer. No longer accepting applications.' }),
  mk({ id: 'momg001', company: 'Morgan & Morgan, P.A.', title: 'Litigation Paralegal', loc: 'Orlando, FL', dateKey: 'mo11', notes: 'Earlier Morgan & Morgan paralegal posting — distinct from morg001 (Federal Brief Writer Attorney). No longer accepting applications.' }),
  mk({ id: 'gpac001', company: 'gpac', title: 'Associate Attorney - Civil Litigation', loc: 'Orlando, FL (On-site)', dateKey: 'mo11', notes: 'No longer accepting applications.' }),

  // ── Gmail-derived entries ────────────────────────────────────────────
  // Agiloft *Associate General Counsel* (distinct from agil001 which is Legal Knowledge Engineer).
  mk({
    id: 'agil002',
    company: 'Agiloft',
    title: 'Associate General Counsel',
    loc: 'United States (Remote)',
    source: 'manual',
    dateKey: 'w1',
    notes: 'Confirmation email received in Gmail inbox: "Thank you for your interest in Agiloft! We wanted to let you know we received your application for Associate General Counsel." Distinct role from agil001 (Legal Knowledge Engineer).',
    details: 'Agiloft. Confirmation email received. Separate role from the Legal Knowledge Engineer posting tracked in agil001.'
  }),
  // EvenUp — Product Operations Associate — applied (confirmation received).
  mk({
    id: 'evup001',
    company: 'EvenUp',
    title: 'Product Operations Associate',
    loc: 'United States (Remote)',
    source: 'manual',
    dateKey: 'w2',
    notes: 'Confirmation email received from EvenUp Talent Team: "Thanks for applying to EvenUp! ... we received your application for the Product Operations Associate role." Contact: Jenny El-Kadi (jenny.elkadi@evenuplaw.com) — "Got this over to our team!" Legal-tech AI company.',
    details: 'EvenUp (evenuplaw.com). Legal-tech AI. Initial contact Jenny El-Kadi <jenny.elkadi@evenuplaw.com>. Confirmation received from Talent Team.'
  }),
  // Eve — AI Outcomes Manager — applied (confirmation received).
  mk({
    id: 'evee001',
    company: 'Eve',
    title: 'AI Outcomes Manager',
    loc: 'United States (Remote)',
    source: 'manual',
    dateKey: 'w1',
    notes: 'Confirmation email received: "Thank you for your interest in Eve! ... we received your application for AI Outcomes Manager."',
    details: 'Eve (eve.legal — legal-tech AI platform). Confirmation email received.'
  }),
  // Bouk Law PLLC — interview scheduled, response received.
  {
    id: 'bouk001',
    company: 'Bouk Law PLLC',
    title: 'Attorney (role TBC)',
    status: 'responded',
    salary: '',
    location: 'Gulf Breeze, FL',
    source: 'manual',
    url: '',
    dateAdded: D.w1,
    dateApplied: D.w1,
    lastModified: D.d2,
    followUpDue: '',
    resumeSubmitted: true,
    coverLetterSubmitted: false,
    emailSent: true,
    writingSample: false,
    followUpSent: true,
    responseReceived: true,
    employerDetails: 'W. Troy Bouk, Attorney at Law. Bouk Law PLLC, PO Box 1601, Gulf Breeze, FL 32562. (850) 407-3738. troy@bouklaw.com.',
    notes: 'Interview/call scheduled. Gmail thread: Jeff asked about 2pm CST Monday conflict and moved to 3pm CST; Troy replied "3pm works. See you then." Role/title to be confirmed on call.',
    responseNotes: 'Troy Bouk confirmed 3pm CST Monday call. (Gmail thread: Update - 7 messages).'
  },
  // Bixby Law PLLC — meeting scheduled, response received.
  {
    id: 'bixb001',
    company: 'Bixby Law PLLC',
    title: 'Attorney (role TBC)',
    status: 'responded',
    salary: '',
    location: 'Florida',
    source: 'manual',
    url: '',
    dateAdded: D.w1,
    dateApplied: D.w1,
    lastModified: D.d2,
    followUpDue: '',
    resumeSubmitted: true,
    coverLetterSubmitted: false,
    emailSent: true,
    writingSample: false,
    followUpSent: true,
    responseReceived: true,
    employerDetails: 'Michael C. Bixby, Founder & Managing Attorney, Bixby Law PLLC. (850) 332-6945 main / (850) 857-8804 direct. Michael@bixbylaw.com.',
    notes: 'Follow-up thread 4/8/2026: Jeff offered Google/Outlook calendar invite, Michael replied "Outlook invite is good." Meeting scheduled. Role/title to be confirmed on call.',
    responseNotes: 'Michael Bixby accepted Outlook meeting invite (Gmail thread: Follow Up - 4 messages, 4/8/2026).'
  }
];

console.log(`[bulk-import] preparing ${batch.length} records`);

const data = db.loadDB();
const before = data.jobs.length;
const results = batch.map(j => db.upsertJob(data, j));
db.saveDB(data);
const after = data.jobs.length;
const added = results.filter(r => r.action === 'added').length;
const updated = results.filter(r => r.action === 'updated').length;

console.log(`[bulk-import] jobs.json: ${before} → ${after}`);
console.log(`[bulk-import] added=${added} updated=${updated}`);
if (updated > 0) {
  console.log('[bulk-import] UPDATED entries:');
  results.filter(r => r.action === 'updated').forEach(r => {
    console.log(`  - ${r.job.id}: ${r.job.company} — ${r.job.title}`);
  });
}
