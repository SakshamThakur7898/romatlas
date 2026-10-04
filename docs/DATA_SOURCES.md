# Data sources and import pipeline

ROMAtlas stores **metadata and links**, never ROM files. Each importer fetches one upstream source,
normalizes it, detects changes and writes `UpdateEvent`s. Every record points back to its source.

| Job | Source | Provides |
|---|---|---|
| `google-devices` | Google Play supported devices CSV (UTF-16LE) | brand, marketing name, codename, model numbers, aliases |
| `rom-projects` | `apps/api/data/rom-projects.json` + GitHub API | ~90 custom ROM projects: links, logo, description, activity-derived status with its basis |
| `lineage-wiki` | `LineageOS/lineage_wiki` repo (`_data/devices/*.yml`) | official LineageOS support, newest version per device, chipset, release date, install/download links |

## Run
```bash
npm run sync -w apps/api -- all            # google-devices, then lineage-wiki
npm run sync -w apps/api -- lineage-wiki --force
```
Requires `git` on PATH and internet access. Each run is logged in the `syncjobs` collection
(`GET /api/admin/sync/history`); `POST /api/admin/sync` (ADMIN) triggers it from the API.

## Rules the importers follow
- Unchanged source (content hash / git commit) => run is `SKIPPED`; records are re-stamped as freshly checked.
- Slugs are allocated once for new devices and never change, so URLs stay stable.
- A support record the wiki no longer lists becomes `OUTDATED` (never deleted) and emits an event.
- The first import creates no update events (to avoid flooding the feed).
- **Lifecycle**: `DISCONTINUED` if the wiki says so; otherwise *derived* from how far the device's newest
  LineageOS version is behind the wiki's latest (`ACTIVE_WITHIN_MAJOR_VERSIONS`, default 2). The basis is
  written into each record's `notes`. Devices with no version stay `UNKNOWN`.
- Downloads use a User-Agent, 60s timeout and exponential-backoff retries; the wiki is cloned once (shallow).

## Adding a source
Write a pure parser in `src/parsers/` (with tests), an importer in `src/jobs/importers/`, and register it in
`src/services/sync.service.ts`. Prefer official APIs/feeds; respect each site's terms and robots policy.

## ROM projects (`rom-projects`)
Indexes project metadata only. A project existing says nothing about which devices it supports, so device
builds are never guessed; they need a per-project importer (like `lineage-wiki`).
- Seed list: `apps/api/data/rom-projects.json` (edit it, then re-run the job). GitHub organizations come from a
  third-party list and are verified against the GitHub API (404 is recorded, not hidden).
- Status is DERIVED: `ACTIVE` if the account pushed code within 365 days, else `INACTIVE`; the basis is stored
  in `statusNote` and shown on the ROM page. No evidence stays `UNKNOWN`.
- Without `GITHUB_TOKEN` it enriches 25 projects per run (oldest check first), so ~4 runs cover the whole list.
  Set a token (no scopes needed) to do everything in one run.
- `npm run sync -w apps/api -- rom-projects`
