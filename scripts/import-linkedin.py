#!/usr/bin/env python3
"""Import LinkedIn's official data export into Job Murderer.

This is the safe, complete alternative to scraping: LinkedIn lets you download
your own data (Settings & Privacy -> Data Privacy -> "Get a copy of your data"),
which includes a "Job Applications.csv". This importer reads that CSV and adds
each application as a job — deduped against what's already tracked, with the real
application date so age badges and applied-date sort are accurate.

Standalone (no jm CLI dependency): reads/writes jobs.json directly with the same
fuzzy dedup the app uses. Dry-run by default; pass --commit to write.

Usage:
  scripts/import-linkedin.py "~/Downloads/Job Applications.csv"
  scripts/import-linkedin.py "path/to/Job Applications.csv" --commit
  scripts/import-linkedin.py <csv> --data ~/JobMurderer/data/jobs.json --commit
"""
import argparse, csv, datetime as dt, json, os, random, re, string, sys
from pathlib import Path

DEFAULT_DATA = Path(os.environ.get("JOB_MURDERER_DATA_DIR", Path.home() / "JobMurderer" / "data")) / "jobs.json"

_STOP = {"llp","llc","inc","pc","pa","pllc","ltd","corp","corporation","co","the","group","law",
         "firm","attorney","attorneys","associates","associate","institute","solutions","services",
         "consulting","search","staffing","recruitment","global","remote","senior","sr","jr","junior",
         "and","of","for","a","an"}
def toks(s):
    return frozenset(t for t in re.sub(r"[^a-z0-9 ]", " ", (s or "").lower()).split() if t and t not in _STOP)

def fuzzy_same(a_co, a_ti, b_co, b_ti):
    ca, cb = toks(a_co), toks(b_co)
    if not ca or not cb or not (ca <= cb or cb <= ca):
        return False
    ta, tb = toks(a_ti), toks(b_ti)
    if not ta and not tb:
        return True
    if not ta or not tb:
        return False
    return ta <= tb or tb <= ta

def now_iso():
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")

def make_id():
    return "jm-" + "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(10))

def blank_job(**over):
    j = {"id": make_id(), "company": "", "title": "", "status": "ready", "salary": "", "location": "",
         "source": "linkedin-export", "url": "", "postingDate": "", "foundDate": "", "dateAdded": now_iso(),
         "dateApplied": "", "lastModified": now_iso(), "followUpDue": "", "resumeSubmitted": False,
         "coverLetterSubmitted": False, "emailSent": False, "writingSample": False, "followUpSent": False,
         "responseReceived": False, "employerDetails": "", "notes": "", "responseNotes": ""}
    j.update({k: v for k, v in over.items() if v is not None})
    return j

# Column-name detection — LinkedIn's export header wording has varied over time.
def pick(header, *cands):
    low = {h.lower().strip(): h for h in header}
    for c in cands:
        for k, orig in low.items():
            if c in k:
                return orig
    return None

def parse_date(s):
    s = (s or "").strip()
    if not s:
        return ""
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%b %d, %Y", "%d %b %Y"):
        try:
            return dt.datetime.strptime(s, fmt).strftime("%Y-%m-%d") + "T12:00:00.000Z"
        except ValueError:
            continue
    return ""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", help="Path to LinkedIn 'Job Applications.csv'")
    ap.add_argument("--data", default=str(DEFAULT_DATA))
    ap.add_argument("--commit", action="store_true")
    a = ap.parse_args()

    csv_path = Path(os.path.expanduser(a.csv))
    data_path = Path(os.path.expanduser(a.data))
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}", file=sys.stderr); return 1
    if not data_path.exists():
        print(f"jobs.json not found: {data_path}", file=sys.stderr); return 1

    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        print("CSV is empty."); return 0
    header = rows[0].keys()
    c_co = pick(header, "company")
    c_ti = pick(header, "job title", "title", "position")
    c_dt = pick(header, "application date", "applied", "date")
    c_url = pick(header, "job url", "url", "link")
    if not c_co:
        print(f"Could not find a Company column. Headers: {list(header)}", file=sys.stderr); return 2

    d = json.loads(data_path.read_text())
    existing = d["jobs"]
    added, skipped_dup, skipped_seen = 0, 0, 0
    seen = set()
    new_jobs = []
    for r in rows:
        co = (r.get(c_co) or "").strip()
        ti = (r.get(c_ti) or "").strip() if c_ti else ""
        if not co:
            continue
        key = (frozenset(toks(co)), frozenset(toks(ti)))
        if key in seen:
            skipped_seen += 1; continue
        seen.add(key)
        if any(fuzzy_same(e.get("company",""), e.get("title",""), co, ti) for e in existing):
            skipped_dup += 1; continue
        applied = parse_date(r.get(c_dt)) if c_dt else ""
        j = blank_job(company=co, title=ti, status="applied", source="linkedin-export",
                      url=(r.get(c_url) or "").strip() if c_url else "",
                      dateApplied=applied, foundDate=applied, responseReceived=False)
        j["notes"] = f"Imported from LinkedIn data export {dt.date.today()}"
        new_jobs.append(j)
        added += 1

    print(f"rows: {len(rows)} | already tracked (skipped): {skipped_dup} | in-file dups: {skipped_seen}")
    print(f"NEW to add: {added}")
    for j in new_jobs[:15]:
        print(f"  + {j['company']} — {j['title']}  ({j['dateApplied'][:10] or 'no date'})")
    if added > 15:
        print(f"  … and {added-15} more")
    if a.commit:
        d["jobs"].extend(new_jobs)
        tmp = data_path.with_suffix(".json.tmp"); tmp.write_text(json.dumps(d, indent=2)); tmp.rename(data_path)
        print(f"COMMITTED — jobs now: {len(d['jobs'])}")
    else:
        print("(dry run — pass --commit to write)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
