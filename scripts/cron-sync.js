#!/usr/bin/env node
// job-murderer/scripts/cron-sync.js
//
// Command-line bridge between the twice-daily job-search cron tasks
// and the Job Murderer backend (data/jobs.json).
//
// Usage from bash (cron tasks):
//
//   node "<job-murderer>/scripts/cron-sync.js" summary
//   node "<job-murderer>/scripts/cron-sync.js" list-ready
//   node "<job-murderer>/scripts/cron-sync.js" list-followups
//   node "<job-murderer>/scripts/cron-sync.js" upsert '<json>'
//   node "<job-murderer>/scripts/cron-sync.js" upsert-batch '<json-array>'
//   node "<job-murderer>/scripts/cron-sync.js" set-status <id> <status>
//   node "<job-murderer>/scripts/cron-sync.js" mark-applied <id> [--date YYYY-MM-DD]
//   node "<job-murderer>/scripts/cron-sync.js" mark-response <id> "<notes>"
//   node "<job-murderer>/scripts/cron-sync.js" mark-rejected <id> "<notes>"
//   node "<job-murderer>/scripts/cron-sync.js" diff-since <ISO-timestamp>
//
// All commands print JSON to stdout and a short human summary to stderr.

const path = require('path');
const db = require(path.resolve(__dirname, '..', 'lib', 'jobs-db.js'));

function out(obj) {
  process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
}
function log(msg) {
  process.stderr.write(`[cron-sync] ${msg}\n`);
}
function fail(msg, code = 1) {
  log(`ERROR: ${msg}`);
  process.exit(code);
}

const [, , cmd, ...args] = process.argv;
if (!cmd) {
  fail('No command. Try: summary | list-ready | list-followups | upsert | upsert-batch | set-status | mark-applied | mark-response | mark-rejected | diff-since');
}

const data = db.loadDB();

switch (cmd) {
  case 'summary': {
    out(db.summary(data));
    log(`Total jobs: ${data.jobs.length}`);
    break;
  }

  case 'list-ready': {
    const ready = db.listReady(data);
    out({ count: ready.length, jobs: ready });
    log(`Ready-to-apply: ${ready.length}`);
    break;
  }

  case 'list-followups': {
    const due = db.listNeedingFollowUp(data);
    out({ count: due.length, jobs: due });
    log(`Follow-ups due: ${due.length}`);
    break;
  }

  case 'upsert': {
    if (!args[0]) fail('upsert requires a JSON argument');
    let incoming;
    try { incoming = JSON.parse(args[0]); } catch (e) { fail(`Bad JSON: ${e.message}`); }
    const result = db.upsertJob(data, incoming);
    db.saveDB(data);
    out(result);
    log(`${result.action}: ${result.job.company} — ${result.job.title}`);
    break;
  }

  case 'upsert-batch': {
    if (!args[0]) fail('upsert-batch requires a JSON array argument');
    let batch;
    try { batch = JSON.parse(args[0]); } catch (e) { fail(`Bad JSON: ${e.message}`); }
    if (!Array.isArray(batch)) fail('upsert-batch expects a JSON array');
    const results = batch.map(job => db.upsertJob(data, job));
    db.saveDB(data);
    const added = results.filter(r => r.action === 'added').length;
    const updated = results.filter(r => r.action === 'updated').length;
    out({ added, updated, results });
    log(`Added: ${added}, Updated: ${updated}`);
    break;
  }

  case 'set-status': {
    const [id, status] = args;
    if (!id || !status) fail('set-status requires <id> <status>');
    const job = db.setStatus(data, id, status);
    if (!job) fail(`No job with id=${id}`);
    db.saveDB(data);
    out(job);
    log(`Status for ${id} → ${status}`);
    break;
  }

  case 'mark-applied': {
    const id = args[0];
    if (!id) fail('mark-applied requires <id>');
    const dateFlagIdx = args.indexOf('--date');
    const dateApplied = dateFlagIdx >= 0 ? args[dateFlagIdx + 1] : new Date().toISOString();
    const job = db.markApplied(data, id, { dateApplied });
    if (!job) fail(`No job with id=${id}`);
    db.saveDB(data);
    out(job);
    log(`Marked applied: ${id} (${dateApplied})`);
    break;
  }

  case 'mark-response': {
    const [id, ...noteParts] = args;
    if (!id) fail('mark-response requires <id> "<notes>"');
    const job = db.markResponse(data, id, noteParts.join(' '));
    if (!job) fail(`No job with id=${id}`);
    db.saveDB(data);
    out(job);
    log(`Marked response: ${id}`);
    break;
  }

  case 'mark-rejected': {
    const [id, ...noteParts] = args;
    if (!id) fail('mark-rejected requires <id> "<notes>"');
    const job = db.markRejected(data, id, noteParts.join(' '));
    if (!job) fail(`No job with id=${id}`);
    db.saveDB(data);
    out(job);
    log(`Marked rejected: ${id}`);
    break;
  }

  case 'diff-since': {
    const since = args[0];
    if (!since) fail('diff-since requires an ISO timestamp');
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) fail(`Bad timestamp: ${since}`);
    const changed = data.jobs.filter(j => new Date(j.lastModified || j.dateAdded) > sinceDate);
    const readyNew = changed.filter(j => j.status === 'ready');
    const appliedNew = changed.filter(j => j.status === 'applied');
    out({
      since,
      total: changed.length,
      newlyReady: readyNew,
      newlyApplied: appliedNew,
      all: changed
    });
    log(`Since ${since}: ${changed.length} changed (${readyNew.length} newly ready, ${appliedNew.length} newly applied)`);
    break;
  }

  default:
    fail(`Unknown command: ${cmd}`);
}
