# CLAUDE.md — AI eLearning Estimator

Persistent project context for Claude Code. Read this before making changes.

## What this is

An internal web tool that helps one user (Laurie) produce eLearning project
estimates fast — cutting ~5 hours of manual work down to ~1 hour. It is a single
form on one main screen. The user checks one or more category blocks, each
expands into a pre-filled checklist of subtasks, every cost recalculates live,
and one button exports the whole estimate to a Word document.

The authoritative spec is the High-Level Design (HLD). If anything here conflicts
with the HLD, the HLD wins — flag the conflict, don't silently pick one.
HLD documents in repo root: `DatabaseHLDD.html`, `SavedEstimatesHLDD.html`.

---

## Current implementation status (as of 2026-07-02)

**FULLY BUILT AND DEPLOYED** at https://cc-estimator.vercel.app/

Everything below is live and working:
- Category selector chips (Microvideo, Rise 360, Storyline 360) — multi-select
- Category blocks appear/hide on selection; collapsible cards
- All subtask rows: checkbox, editable name, **multi-person assignees block**
  (each person has its own dropdown + hours input; up to 4 per task),
  Type dropdown, live line cost
- Additional minutes input (0–20) per category header with live scaling
- ADA toggle (Rise/Storyline only) — amber button, +10% on category cost
- + Add subtask / − Remove last subtask (with undo stack per category)
- Live formulas: Fixed/Dynamic scaling per assignee, line cost summed across
  all assignees, per-member math breakdown in subtotals, ADA uplift, grand total
- TotalsBar: active members only (0h members hidden), per-category breakdown
  when >1 category selected, internal cost + client price + margin selector
- **Company Name** + Course Name fields at the top
- **Profit margin dropdown** (40% / 45% / 50%, default 50%) in TotalsBar
- **Fully responsive** — mobile (≤640px), tablet (≤900px), desktop
- Export Preview screen (Screen 2) with real task data rendered as Word preview
- Download .docx button — exports to `{CompanyName} - {CourseName} - Estimate.docx`

**Rise 360 & Storyline 360 — multi-module second state (live):**
- "Number of modules" input (1–15) per category header
- Module 1 = full subtask list (ALL tasks start checked — see initCat note below)
- Modules 2–N = second state template; tasks that are `included: false` in
  DEFAULT_TASKS start unchecked; all others start checked
- Cost = Module 1 + (N−1) × second-state-per-module cost; ADA on combined total
- Export/Word: Module 1 table + second state template table + per-module costs + overall total

**Microvideo — additional videos (live):**
- "+ Add Video" adds additional videos, each with its own editable time input
- "Additional Video Template" (collapsible second state) — user checks which
  tasks apply to all additional videos; Dynamic tasks scale per video time
- Per-video cost shown inline; overall Microvideo total when additional videos exist

---

## Stack & architecture

- **React** single-page app — UI, all calculations, and .docx export run entirely
  **client-side**.
- **Supabase** — Postgres database + Auth for the saved estimates feature.
  Browser talks directly to Supabase via `@supabase/supabase-js`. No backend server.
- **Word export** generated in the browser with `docx` v9 + `file-saver` v2.
- **GitHub**: https://github.com/JoshuaCodes-eLearning/CCEstimator
- **Vercel**: https://cc-estimator.vercel.app/ — auto-deploys on push to main.
- Do NOT use localStorage/sessionStorage — all state stays in React.
  The exported .docx and the Supabase DB are the only outputs.

---

## File structure

```
src/
  App.jsx               — root component; all state lives here; computes totals
  App.css               — (legacy placeholder; real styles in index.css)
  index.css             — full design system (CSS custom properties, all classes)
  config/
    config.js           — RATES, ADA_RATES, MARGIN_OPTIONS, DEFAULT_MARGIN_PCT,
                          DEFAULT_MINUTES, CAT_LABELS, DEFAULT_TASKS,
                          DEFAULT_SECOND_STATE_TASKS
  lib/
    supabase.js         — initialized Supabase client (reads VITE_SUPABASE_URL
                          and VITE_SUPABASE_ANON_KEY from env)
  utils/
    calc.js             — computeAssigneeHoursForTask(), computeHours(),
                          lineCost(), categorySubtotal(), fmt()
    exportDocx.js       — generateAndSaveDocx() — builds the Word document
  components/
    CategoryBlock.jsx   — one card per selected category; props-driven
    SubtaskRow.jsx      — one row; inner AssigneeRow component per person
    TotalsBar.jsx       — bottom bar; member hours + costs
    ActionBar.jsx       — NEW: 3-button bar below TotalsBar:
                          [Save Estimate] [View Estimates] [Export to Word]
    ExportPreview.jsx   — screen 2; renders estimate preview + download
    EstimatesModal.jsx  — NEW: full-screen modal overlay; spreadsheet-style
                          list of all saved estimates with sort/search/actions
```

---

## Team & rates (hard-coded in config.js — no settings screen)

| Member      | Role                       | Rate |
|-------------|----------------------------|------|
| Megan       | Development / coordination | $50  |
| Michelle    | Design / storyboarding     | $65  |
| Laurie      | Project management         | $75  |
| QA Resource | Quality assurance (hire)   | $50  |
| J.K.        | (additional resource)      | $30  |

Rates live in `RATES` in config.js only. There is no UI to edit them.

---

## Task data model (updated June 2026)

Each task uses an **assignees array** — multiple people can work the same subtask,
each with their own hours.

```js
{
  id:        'mv-4',
  name:      'Internal meetings, client kickoff and status meetings',
  type:      'Fixed',          // 'Fixed' | 'Dynamic'
  included:  true,             // false = starts unchecked in second state only
  assignees: [
    { person: 'Laurie',   hours: 2.5 },
    { person: 'Michelle', hours: 2   },
    { person: 'Megan',    hours: 3.5 },
  ],
}
```

`hours` in config → `baseHours` added at runtime in `initCat()`. Calculations
always use `assignee.baseHours ?? assignee.hours ?? 0`.

**Module 1 vs second state — included flag behavior (July 2026):**
- `initCat()` sets `included: true` unconditionally for ALL module 1 tasks,
  regardless of the `included` flag in `DEFAULT_TASKS`.
- `makeSecondState()` uses `included: t.included !== false` — so tasks marked
  `included: false` in config start unchecked in modules 2–N; everything else
  starts checked. This means the `included: false` flags in DEFAULT_TASKS exist
  solely to control second-state defaults, not module 1 defaults.

---

## Core concepts

- **Three categories, multi-select:** Microvideo (5 min default), Rise 360
  (15 min), Storyline 360 (15 min). Any combination; unchecked = excluded entirely.
- **Fixed vs Dynamic** (per-task Type dropdown): Fixed hours never change. Dynamic
  hours scale linearly with that category's additional minutes — applied independently
  to each assignee within the task.
- **Additional minutes** (0–20): one control per category header. Scales every
  Dynamic subtask's hours linearly: `scaled = base * (defMin + addedMin) / defMin`.
- **ADA toggle** per applicable category: flat +10% on category cost (not hours).
  Same 10% for Rise 360 and Storyline 360. Microvideo has no ADA option.
- **Unchecking a row** greys it out and excludes it from totals — nothing is deleted.
- **Unchecked-by-default tasks** (`included: false` in DEFAULT_TASKS — affects
  second state only, not module 1):
  - All categories: Sales meetings / SOW
  - Microvideo: Logo stinger, Up to 5 min VEO3/Vyond, Up to 5 custom AI images
  - Storyline 360: Logo Stinger, Up to 5 min VEO3/Vyond, Up to 5 min software
    simulations, Up to 5 custom images

---

## Formulas (run live)

```
Per-assignee hours:
  Fixed:    h = assignee.baseHours
  Dynamic:  h = assignee.baseHours × (defMin + addedMin) / defMin

line_cost          = Σ (h_i × rate(person_i))   for all assignees (checked tasks only)
category_internal  = Σ line_cost across checked tasks
if ADA:  category_internal *= 1.10              (flat 10%, Rise + Storyline only)
member_hours       = Σ each person's hours across ALL checked categories
internal_cost      = Σ category_internal
client_price       = internal_cost / (1 − marginPct/100)   default 50%
```

---

## Default subtask counts (June 2026)

- Microvideo: 16 tasks (mv-1 through mv-img; Sales SOW at bottom)
- Rise 360: 15 tasks (r-1 through r-15; Sales SOW at bottom)
- Storyline 360: 18 tasks (s-1 through s-16 + s-logo + s-narr; Sales SOW at bottom)

All stored in `DEFAULT_TASKS` in config.js. `DEFAULT_SECOND_STATE_TASKS` is
auto-generated from DEFAULT_TASKS via `makeSecondState()`.

---

## Key implementation decisions

- **Multi-person assignees**: `SubtaskRow` contains an inner `AssigneeRow`
  component (defined in the same file) that manages its own local hours input
  state. `onUpdateAssignees(newAssignees)` is the single callback — SubtaskRow
  computes the new array and calls up to App via CategoryBlock's `onUpdateTask`.
- **Hours input**: `type="text"` with local string state. Commits to App state on
  every valid keystroke (live line-cost update). Back-calculation on Dynamic tasks:
  `baseHours = enteredValue / scale` so computeHours() returns what the user typed.
- **initCat()** in App.jsx initializes module 1 tasks with `included: true`
  (unconditional) and second-state tasks via DEFAULT_SECOND_STATE_TASKS which
  respects the `included: false` flags from config.
- **memberHours in App.jsx** is `{ Megan: 0, Michelle: 0, Laurie: 0, 'QA Resource': 0 }`.
  Active-only filter (`h > 0`) means QA Resource only appears in TotalsBar when
  they have checked tasks.
- **computeAssigneeHoursForTask(assignee, task, catKey, addedMin)** in calc.js is
  the lowest-level function; `computeHours()` sums across all assignees; `lineCost()`
  sums cost across all assignees.
- **Grid columns**: subtask-cols and subtask-row use 5-column grid:
  `32px 1fr 270px 144px 106px` (checkbox | name | assignees | type | cost).
  Mobile: 3-column with assignees on row 2.
- **All buttons have type="button"** to prevent accidental form-submit behavior.
- **Microvideo vs Rise/Storyline branching**: App.jsx cost loop, CategoryBlock,
  ExportPreview, and exportDocx all branch on `catKey === 'microvideo'`.
  Use `'microvideo'` (NOT `'mv'`).
- **Export multi-assignee rows**: in both ExportPreview and exportDocx, tasks with
  multiple assignees render as multiple rows in the table — first row shows task
  name and type; continuation rows leave those cells blank.
- **doc-cell-continuation** CSS class marks blank task name cells in export preview.
- **CAT_LABELS lives in config.js** to avoid Vite Fast Refresh warnings.
- **fmt(n)** in calc.js formats all currency as $1,234.56.

---

## Database phase — Supabase (IN PROGRESS as of 2026-07-02)

### Overview
Laurie can save estimates to Supabase, browse them in a modal, and reload any
saved estimate back into the estimator exactly as it was. Auth is Supabase
email/password. **Auth is implemented LAST** — do not add an auth gate until
all DB functionality is tested and working.

### Supabase project
- URL: `https://nterokbwaflejbsrwjqr.supabase.co`
- Credentials in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) — never hardcode
- `estimates` table: created and empty, RLS enabled
- Auth user: `laurieb@cobblestoneconsulting.com` — confirmed, email verified
- Signup disabled after user was created (single-user app)
- Client module: `src/lib/supabase.js`

### New state variables to add to App.jsx
```js
currentEstimateId   // string | null — UUID of the loaded/saved estimate
```
That's the only new top-level state. Everything else is derived.

### Action bar (new component: ActionBar.jsx)
Sits in its own bar **below TotalsBar**, above nothing. Three equal-width buttons:

```
[ 💾 Save Estimate ]   [ 📋 View Estimates ]   [ ↓ Export to Word ]
```

- Save Estimate + View Estimates: one color (DB-related)
- Export to Word: different color (existing feature, unchanged)
- Export to Word still navigates to Export Preview exactly as today
- Only rendered when at least one category is selected (same condition as TotalsBar)

### Save Estimate — full logic
```
Click Save Estimate
        │
        ├─ currentEstimateId === null?
        │       │
        │  YES ─┴─► Insert new row → set currentEstimateId → flash "Saved ✓"
        │
        └─ currentEstimateId !== null?
                │
           YES ─┴─► Dialog: "Overwrite" or "Save as copy"
                        Overwrite  → UPDATE existing row (same ID)
                        Save copy  → INSERT new row, new ID → set currentEstimateId
```

- Button goes briefly inert after save (debounced — not spammable)
- Auto-name on first save: `"{CompanyName} — {CourseName}"`,
  or `"Untitled Estimate — {Month Day}"` if both name fields are blank
- "Save as copy" auto-names: `"{CourseName} — copy"`

### Unsaved changes warning
Only fires when `currentEstimateId === null` (estimate has never been saved).
If she opens View Estimates with unsaved work:
> "This estimate hasn't been saved. If you leave without saving, your changes
> will be lost." — [Save first] [Continue anyway]
If `currentEstimateId !== null`, no warning — she can browse freely.

### View Estimates modal (EstimatesModal.jsx)
Full-screen overlay — same pattern as Export Preview (dims background,
`← Back to estimator` top-left, preserves state on back).

**Always clickable** — shows "No estimates saved yet" empty state if DB is empty.

**Spreadsheet-style list — one row per estimate:**

| Company ✎ | Course ✎ | Categories | Client $ | Margin | Date | Closed | Actions |
|---|---|---|---|---|---|---|---|
| Cobblestone | Compliance 2026 | Rise | $18,480 | 50% | Jun 18 | ☐ | [Open] [Delete] |

- **Company ✎ / Course ✎**: click to edit inline → auto-saves to DB on blur/Enter
  → also updates App state companyName/courseName if this estimate is currently loaded
- **Closed checkbox**: instant DB toggle, no save button needed
- **Open button** OR **double-click row**: loads full state, closes modal
- **Delete**: two-step — confirm dialog → delete row

**Search**: single bar, searches company + course name simultaneously (case-insensitive)

**Sort dropdown** (default = Most Recent):
- Most Recent (updated_at DESC)
- Most Profitable (client_price DESC)
- Margin % (margin_pct DESC)
- Alphabetical (company_name ASC)

### Loading an estimate
On Open / double-click:
1. Read `state_json` from the row
2. Restore full App state: `catStates`, `selected`, `companyName`, `courseName`,
   `marginPct`, `liveHours`
3. Set `currentEstimateId` to the row's `id`
4. Close modal, return to estimator

Loading is lossless — every task, hour, check state, ADA toggle, module count,
additional video, and second-state task comes back exactly as saved.

### `estimates` table schema
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto, never shown in UI |
| user_id | uuid FK → auth.users | RLS anchor |
| company_name | text | editable inline |
| course_name | text | editable inline |
| categories | text[] | `['rise360', 'microvideo']` |
| internal_cost | numeric(10,2) | snapshot |
| client_price | numeric(10,2) | snapshot; drives sort |
| margin_pct | smallint | 40 / 45 / 50 |
| ada_enabled | jsonb | `{ "rise360": true }` |
| module_counts | jsonb | `{ "rise360": 3 }` |
| additional_mins | jsonb | `{ "rise360": 5 }` |
| additional_videos | jsonb | microvideo only |
| is_closed | boolean | default false |
| state_json | jsonb | full App state for reload |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto via trigger |

### Build order — one piece at a time, confirm before moving on
1. **ActionBar component** — 3-button bar below TotalsBar, Export to Word wired,
   Save + View stubbed (no DB calls yet). Confirm layout + styling.
2. **Save Estimate** — wire Save button to Supabase INSERT/UPDATE logic,
   `currentEstimateId` state, auto-naming, overwrite dialog. Test saving.
3. **View Estimates modal** — fetch list, render rows, search, sort. No load yet.
   Confirm layout + data display.
4. **Load estimate** — Open button + double-click restores full state. Test round-trip.
5. **Inline rename** — company/course edit in modal → DB update → state sync.
6. **Closed toggle + Delete** — wire remaining row actions.
7. **Auth gate** — login screen, session management, wired to Laurie's account.
   Added LAST after all DB functionality confirmed working.

---

## Known assumption to verify

Rise 360 "Lessons Learned" in the June 18 Updates document reads
`"Laurie 3.25, Megan 1.25, Laurie 1.25"` — third person coded as **Michelle 1.25**
(assumed typo; all other split tasks include all three people). Comment in config.js
flags this. Confirm with Laurie before treating as final.

---

## Open items (do NOT resolve unilaterally)

1. **Which subtasks default to Dynamic** — linear scaling is the placeholder; Laurie
   to confirm with Michelle. Scaling logic isolated in `computeAssigneeHoursForTask()`
   in calc.js.
2. **HLD §6.7 worked example discrepancy** — numbers predate current task list.
   Not a blocker; Laurie to verify totals with real usage.
3. **Rise 360 Lessons Learned third person** — see "Known assumption" above.

---

## Out of scope (permanent)

Accounting/CRM/proposal integrations · multi-user accounts/permissions · invoicing/
payments · editable settings screen · PDF export · sharing estimates with clients.

---

## Embedding

```html
<iframe src="https://cc-estimator.vercel.app/" width="100%" height="900px"
  style="border:none;" title="AI eLearning Estimator"></iframe>
```

---

## Working agreements for Claude Code

- Keep rates, ADA percentages, margin, and default task data in config.js only.
- Keep scaling rule isolated in calc.js — it's an open item.
- All state lives in App.jsx; components are props-driven.
- Commit + push to main after any meaningful change (Vercel auto-deploys).
- When something is genuinely ambiguous vs. the HLD, ask rather than guess.
- **DB phase**: build one piece at a time per the build order above.
  Get explicit confirmation before moving to the next step.
- **No auth gate until step 7** — test all DB functionality without login.
- Supabase credentials come from `.env` only — never hardcode keys.
- `currentEstimateId` is the only new top-level state in App.jsx for the DB phase.
