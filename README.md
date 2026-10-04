# Nully · לוח בקרה (Hebrew RTL project dashboard)

Next.js 15 (App Router) + Supabase (Postgres) + Vercel. Tracks the improvement workflow for the unpublished Shopify store
`nully-shop.com` (draft theme **Nully Horizon RTL**, id `154899021876`): waves/timeline, kanban with Claude Code prompts, decisions,
findings (F1–F18), issues, draft-vs-previous snapshot diff and an activity log.

## Pages
`/` overview · `/timeline` waves + progress · `/board` kanban (copy Claude Code prompt) · `/decisions` decisions + required inputs ·
`/findings` F1–F18 · `/issues` notes · `/changes` snapshot diff · `/activity` who changed what.

## Auth
Everything is behind a shared-password login (`DASHBOARD_PASSWORD`, signed httpOnly cookie, `SESSION_SECRET`).
The bot endpoints use a bearer token (`BOT_TOKEN`).

## Data model (Supabase schema `nully`, not exposed via REST)
`tasks, decisions, inputs, issues, findings, snapshots, activity_log` (+ `app_secrets`). See `supabase/schema.sql`.
The app reaches the DB only through `SECURITY DEFINER` RPCs (`nd_select / nd_upsert / nd_delete`) that verify `DASH_DB_TOKEN`
(sha256 stored in `nully.app_secrets`), so the public anon key alone cannot read or write anything.

Seed: `python3 scripts/parse_sources.py` (parses `/workspace/analysis/*.md` into `data/seed/*.json`), then `node scripts/seed.mjs`.

## Bot API — `POST /api/bot-update`
Header `Authorization: Bearer $BOT_TOKEN`, JSON body `{ "actor": "bot:<name>", "action": "...", ... }`.

| action | fields |
|---|---|
| `task_update` | `id`, any of `status` (open/in_progress/blocked/done), `progress`, `notes`, `assignee`, `title`, `effort`, `details`; `force:true` to override blockers |
| `task_create` | `id`, `title`, `wave`, optional `source, impact, effort, details, prompt, depends_on, finding_ids` |
| `decision_update` | `id`, any of `evidence, recommended, options, question, note` |
| `decision_choose` | `id`, `option`, `note`, **`on_behalf_of_eyal: true`** (only to record a decision Eyal made elsewhere) |
| `decision_reset` | `id` |
| `input_update` | `id` (A1–A16, E1), `status` (needed/provided), `note` |
| `issue_add` / `issue_update` / `issue_delete` | `title, body, kind` / `id, status, ...` / `id` |
| `finding_update` | `id`, any of `status` (open/fixed/wontfix/out_of_scope), `status_note, note, severity, title, evidence_site, evidence_reference, recommendation` |
| `finding_create` | `id`, `title`, optional `severity, category, evidence_site, evidence_reference, recommendation, task_ids` |
| `push_snapshot` | `snapshot` (as produced by `scripts/shopify-snapshot.mjs`), optional `force` |
| `log` | `summary`, optional `entity_type, entity_id, details` |
| `bulk` | `actions: [ ... ]` |

Every call is written to `activity_log` with the actor name. Choosing a decision / marking an input provided / finishing a task
automatically releases tasks whose blockers are all resolved (and re-blocks them if it is reopened).

## Snapshots (READ ONLY on Shopify)
```bash
export SHOPIFY_CLIENT_SECRET=...   # never committed / printed
node scripts/shopify-snapshot.mjs --label "after T1.1" --push   # needs DASHBOARD_URL + BOT_TOKEN for --push
```
Only GraphQL queries are sent (the script aborts on any `mutation`). It captures home/product/cart templates (section order, settings,
blocks), header/footer groups, `settings_data`, the product (title, status, SEO, variants, prices, one-time-price metafield, selling plans),
policies, menus, locales and a checksum manifest of all theme files. `/changes` diffs any two snapshots.

## Audit trail
`DASHBOARD_URL=... BOT_TOKEN=... node scripts/export-data.mjs --commit` writes `data/*.json` + `data/snapshots/*.json` and commits them,
so git history records every status/decision change.

## Env vars (Vercel)
`SUPABASE_URL, SUPABASE_ANON_KEY, DASH_DB_TOKEN, DASHBOARD_PASSWORD, SESSION_SECRET, BOT_TOKEN`. The Shopify secret is **not** deployed;
snapshots run from the box and are pushed through the API.
