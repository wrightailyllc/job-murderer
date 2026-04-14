# Job Murderer

Job application tracker for Jeffery Wright. Dark-themed Electron app with follow-up reminders, checklist tracking, and cron job integration.

## Setup

```bash
cd job-murderer
npm install
npm start
```

## Features

- Dashboard with status counts and follow-up alerts
- Job cards with checkboxes (resume, cover letter, email, writing sample, follow-up, response)
- Follow-up reminders (3-7 days after application, with urgent alerts)
- Search and filter by status
- Settings for BCC email and follow-up timing
- Cron job integration via `scripts/cron-sync.js`
- Keyboard shortcuts: Cmd+N to add job, Esc to close modal

## Architecture

| File | Purpose |
|------|---------|
| `main.js` | Electron main process + IPC handlers |
| `preload.js` | Context bridge to the renderer |
| `index.html` | Dashboard UI |
| `lib/jobs-db.js` | **Shared DB helpers** — schema, loadDB/saveDB, upsertJob, setStatus, markApplied, markResponse, markRejected, listReady, listNeedingFollowUp, summary. Used by both the Electron main process and the cron-sync CLI so both surfaces agree on the schema and status transitions. |
| `scripts/cron-sync.js` | **CLI bridge** for the twice-daily scheduled tasks. All writes from the cron jobs go through this. |
| `data/jobs.json` | Single source of truth for job state |
| `data/config.json` | BCC email, follow-up timing, notification toggle |

## Cron Job Integration

The twice-daily scheduled tasks (`job-search-morning` at 8am and `job-search-evening` at 6pm) call `scripts/cron-sync.js` to read and write `data/jobs.json`. The scheduled tasks MUST use the CLI rather than hand-editing the JSON file so status transitions and deduplication stay consistent.

### Supported commands

```bash
# Dashboard snapshot (total, by-status counts, ready list, follow-ups due)
node scripts/cron-sync.js summary

# List all ready-to-apply jobs (status: "ready")
node scripts/cron-sync.js list-ready

# List jobs needing a follow-up today or overdue
node scripts/cron-sync.js list-followups

# Add a new job or merge into an existing one (dedup by URL / company+title)
node scripts/cron-sync.js upsert '{"company":"ACME","title":"Attorney","url":"https://...","salary":"$120K","location":"Remote","employerDetails":"...","notes":"..."}'

# Add multiple new jobs in one call
node scripts/cron-sync.js upsert-batch '[{...},{...}]'

# Change a job's status (ready | draft | applied | responded | rejected | offer | archived)
node scripts/cron-sync.js set-status <id> <status>

# Mark a job applied (sets emailSent, resumeSubmitted, coverLetterSubmitted, dateApplied, followUpDue)
node scripts/cron-sync.js mark-applied <id> [--date 2026-04-10]

# Mark a response received (status -> responded)
node scripts/cron-sync.js mark-response <id> "Recruiter reply scheduled intro call 4/15"

# Mark rejected
node scripts/cron-sync.js mark-rejected <id> "Not moving forward at this time"

# Show everything that changed since a given timestamp (used by cron for run summaries)
node scripts/cron-sync.js diff-since 2026-04-10T12:00:00.000Z
```

### What the cron jobs do every run

1. **At the start of every run**, call `summary` to snapshot current state.
2. **Search for new jobs**, then call `upsert` or `upsert-batch` for each qualifying HIGH/MEDIUM fit. Duplicates are automatically merged — existing status/dates/submission flags are preserved so a job Jeff already applied to is never reverted to "ready".
3. **Check Gmail** for applications Jeff sent since the last run (BCC wrightai.lyllc@gmail.com) and call `mark-applied` with the correct date.
4. **Check Gmail** for recruiter replies and call `mark-response` or `mark-rejected`.
5. **Call `diff-since`** with the previous run's end timestamp to produce the "what changed" block for the run summary email — this is where new ready-to-apply jobs are surfaced at the top.
6. **Call `list-ready` and `list-followups`** to produce the daily action list.

## Database

All data is stored in `data/jobs.json`. Back up this file to preserve your application history.

## BCC Email Tracking

BCC wrightai.lyllc@gmail.com on all application and follow-up emails. The cron jobs monitor this inbox and call `mark-applied` / `mark-response` to auto-update job statuses.

## Status values

| Status | Meaning |
|--------|---------|
| `ready` | New job found, materials not yet built or submitted |
| `draft` | Materials in progress |
| `applied` | Submitted |
| `responded` | Response received (interview, follow-up, etc.) |
| `rejected` | Employer said no |
| `offer` | Offer received |
| `archived` | Hidden from dashboard |
