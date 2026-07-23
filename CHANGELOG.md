# Changelog

All notable changes to Job Murderer. Personal data, credentials, and machine-specific
operational details are intentionally omitted (see the local CLAUDE.md).

## 2026-07-23

### Added
- **In-app scanner-detections banner**: the email autopilot's detections (rejections, interviews,
  offers) now surface as a dismissable banner in the app — not just via iMessage. Each entry is
  color-coded by type, flags "pending approval", links to the job, and refreshes as detections sync
  in. "Mark all read" clears it. Reads the `data/notifications.json` queue the scanner already writes.

## 2026-07-19

### Added
- **All Jobs sortable list** with six sort keys — created, found, lead-posting, applied,
  follow-up, and age (days-since) — plus a direction toggle and live count. Nav split into
  Dashboard + All Jobs. (#1)
- **Date chips + age badge** on every job card. Chips show Posted/Found/Applied/Follow-up/Created
  (with overdue/due-soon highlighting); the age badge shows contextual staleness, color-coded
  fresh/aging/stale with configurable thresholds. (#1, #4)
- **Editable date fields**: Lead Posting Date and Found Date on the job form; `postingDate`/`foundDate`
  added to the schema. (#1)
- **In-app email viewing**: response emails are saved and attached to jobs; a per-job "Source Emails"
  section opens the full text in a modal (path-restricted IPC). (#1)
- **Follow-up staleness window**: follow-ups are due only within `[followUpDaysMin, followUpStaleAfter]`
  (new setting, default 14 days) — old silent applications drop off the Follow-Up tab and surface via
  the age badge instead. Logic centralized in `isFollowUpDue()`. (#2)
- **Configurable age-badge thresholds** (`ageFreshDays`, `ageStaleDays`) in Settings. (#4)
- **LinkedIn data-export importer** (`scripts/import-linkedin.py`): imports LinkedIn's official
  "Job Applications" CSV export — standalone, fuzzy-deduped, real application dates, `--since` filter,
  dry-run by default. The safe, TOS-compliant alternative to scraping. (#4)

### Fixed
- Fuzzy dedup no longer misses companies whose name is entirely stopwords (e.g. "SR Staffing"):
  falls back to raw tokens when stopword-stripping empties the set.
- Follow-up reminders were unbounded — a months-old silent application still nagged as "due".

### Changed
- Data path moved to `~/JobMurderer/data/` (env-overridable) so it can be shared across machines;
  the app watches the DB file and auto-refreshes on external writes.

### Notes
- Job data and any exports are gitignored — never committed to this public repo.
- A background email autopilot keeps the tracker current; it runs in a safe mode where new applications
  are auto-added but status changes to existing jobs are queued for explicit approval.
