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
HLD document in repo root: `SavedEstimatesHLDD.html`. (`DatabaseHLDD.html`
was removed 2026-07-03 — outdated, superseded by the DB phase now being
fully built. `DatabasePhase2Guide.html` is the current user-facing
reference for that phase, not an HLD.)

---

## Current implementation status (as of 2026-07-07)

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
- **Company Name** + **Client Name** + Course Name fields at the top (Client
  Name is the person, distinct from Company — the business)
- **"Do you have PPTs and Webinars..." (Yes/No)** and **"What eLearning have
  you seen that you have liked?" (free text)** — two discovery-question fields
  under Company/Client/Course, captured with the estimate but not printed on
  the client-facing export (see July 2026 section below)
- **Second "View Estimates" button** in the persistent header, always visible
  even before any category is selected — the original button lives in
  TotalsBar, which doesn't render until a category is checked. Both call the
  same `handleViewEstimatesClick()`, so both get the identical unsaved-changes
  guard for free.
- **Profit margin dropdown** (40% / 45% / 50%, default 50%) in TotalsBar
- **Fully responsive** — mobile (≤640px), tablet (≤900px), desktop
- Export Preview screen (Screen 2) with real task data rendered as Word preview
- Download .docx button — exports to `{CompanyName} - {CourseName} - Estimate.docx`
  — now also prints Client Name and Date (the estimate's `created_at`, or
  today if never saved)

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

**WellSaid flat expense line (live, added July 2026):**
- A `WellSaid` task (`type: 'Expense'`) sits at the bottom of all three
  categories' task lists (module 1 and the second-state template) — no hours,
  no assignees, flat `$50` (`flatCost` in config.js), unchecked by default.
- Counted **once per category**, regardless of module/video count, whether
  checked in module 1, the second-state template, or both — see
  `expenseCostForCategory()` in calc.js, the single source of truth for this,
  used identically by App.jsx's totals loop, CategoryBlock's own subtotal
  display, and both export paths.
- Added **after** the ADA 10% multiplier — it's a flat pass-through, not
  inflated by ADA. Flows normally through the margin calc into client price
  like any other cost.
- Old estimates saved before this feature don't have a WellSaid row in their
  stored `state_json` — `handleLoadEstimate()` backfills it in (unchecked) via
  `backfillWellsaid()`, scoped narrowly to this one task id so it can't
  reintroduce any other default task Laurie removed from an old estimate.

**Won/Lost tracking (live, added July 2026):**
- Independent boolean pill in EstimatesModal, next to (not replacing) the
  existing Open/Closed pill — same optimistic-update/rollback pattern as
  `toggleClosed`, new `toggleWon()`. Two states only (Won / Lost), no
  "pending" — defaults to "Lost"/unmarked until explicitly flipped.
- New "Won Only / Lost Only / Won & Lost" filter dropdown next to
  search/sort — an actual subset filter, not just a sort, since the ask was
  to "view the estimates by won or lost."
- New "Month" filter dropdown (built from distinct `created_at` months
  present in the fetched estimates) — this is the "searchable by month" Date
  requirement; there's no new Date form field, `created_at` is reused as-is.

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
                          lineCost(), categorySubtotal(), fmt(),
                          expenseCostForCategory() (WellSaid, added July 2026)
    exportDocx.js       — generateAndSaveDocx() — builds the Word document
  components/
    CategoryBlock.jsx   — one card per selected category; props-driven
    SubtaskRow.jsx      — one row; inner AssigneeRow component per person
    TotalsBar.jsx       — bottom bar; member hours + costs; ALSO renders the
                          3 action buttons (Save Estimate / View Estimates /
                          Export to Word) inline via `.totals-actions` — see
                          note below, ActionBar.jsx is NOT used for this.
    ActionBar.jsx       — UNUSED / dead code. Originally planned as a separate
                          bar below TotalsBar, but the 3 buttons were built
                          directly into TotalsBar.jsx instead (Step 1). Not
                          imported anywhere. Safe to delete or repurpose later.
    ExportPreview.jsx   — screen 2; renders estimate preview + download
    EstimatesModal.jsx  — full-screen "My Estimates" modal: fetches, searches,
                          sorts, paginates, inline-renames, status-toggles,
                          opens, and hard-deletes saved estimates. Fully wired
                          to Supabase — see Database phase section below.
    ConfirmDialog.jsx   — generic reusable Yes/No(/third-option) modal dialog;
                          used by both the Save Estimate flow (App.jsx) and
                          the Open/Delete confirms in EstimatesModal.jsx.
    AppHeader.jsx       — shared header (title + screen label + Sign Out /
                          Change Password when authenticated); replaces what
                          used to be 3x duplicated inline <header> markup
                          across App.jsx/EstimatesModal.jsx/ExportPreview.jsx.
    LoginScreen.jsx     — sign-in form + forgot-password (no email input by
                          design — single-account app, see Step 7 below).
    ResetPasswordScreen.jsx — shown when the emailed reset link lands back
                          on the app (Supabase PASSWORD_RECOVERY event).
    ChangePasswordModal.jsx — logged-in password change; re-verifies the
                          current password before allowing a new one.
  utils/ (continued)
    estimatePayload.js  — resolveName() (blank → "Unnamed"), estimateDisplayName()
                          (`"{Company}'s Estimate"`), buildEstimateRow() (App
                          state → estimates-table row shape for insert/update)
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
  type:      'Fixed',          // 'Fixed' | 'Dynamic' | 'Expense'
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

**`type: 'Expense'` (added July 2026, used only by WellSaid):** a flat-dollar
task with `assignees: []` and a `flatCost` field instead of hours. `computeHours()`
returns 0 and `lineCost()` returns `flatCost` for these — short-circuited before
the normal assignee-based branches in calc.js. `SubtaskRow.jsx` hides the
assignees block and Type dropdown for this type (neither makes sense for a
flat expense).

**Module 1 vs second state — included flag behavior (July 2026):**
- `initCat()` sets `included: true` unconditionally for ALL module 1 tasks,
  regardless of the `included` flag in `DEFAULT_TASKS` — **except** tasks with
  `forceUnchecked: true` (added July 2026, used only by WellSaid), which stay
  unchecked in module 1 too. This is a narrow, explicit opt-out — every other
  task's module-1-always-checked behavior is unchanged.
- `makeSecondState()` uses `included: t.included !== false` — so tasks marked
  `included: false` in config start unchecked in modules 2–N; everything else
  starts checked. This means the `included: false` flags in DEFAULT_TASKS exist
  solely to control second-state defaults, not module 1 defaults (WellSaid is
  the one exception, via `forceUnchecked`, not `included`).

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
if WellSaid checked (module 1 OR second state, once only): category_internal += 50
                                                 (added AFTER the ADA multiplier — flat pass-through)
member_hours       = Σ each person's hours across ALL checked categories
internal_cost      = Σ category_internal
client_price       = internal_cost / (1 − marginPct/100)   default 50%
```

---

## Default subtask counts (June 2026; +1 WellSaid per category as of July 2026)

- Microvideo: 17 tasks (mv-1 through mv-img + mv-wellsaid; Sales SOW then WellSaid at bottom)
- Rise 360: 16 tasks (r-1 through r-15 + r-wellsaid; Sales SOW then WellSaid at bottom)
- Storyline 360: 19 tasks (s-1 through s-16 + s-logo + s-narr + s-wellsaid; Sales SOW then WellSaid at bottom)

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
  (unconditional, except `forceUnchecked: true` tasks — see WellSaid above)
  and second-state tasks via DEFAULT_SECOND_STATE_TASKS which respects the
  `included: false` flags from config.
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

## Database phase — Supabase (Steps 1–7 ALL DONE as of 2026-07-03)

### Overview
Laurie can save estimates to Supabase, browse/search/sort/paginate them in a
modal, rename/close/delete them inline, and reopen any saved estimate back
into the estimator exactly as it was. The entire app is now gated behind
Supabase email/password auth — nothing renders, not even the calculator,
until signed in. RLS is fully tightened: the anon key has zero access to the
`estimates` table (verified live, not just assumed — see RLS section below).
A companion user-facing reference doc lives at `DATABASE_PHASE2_GUIDE.md` —
point Laurie there for "how do I..." questions instead of re-explaining.

### Supabase project
- URL: `https://nterokbwaflejbsrwjqr.supabase.co`
- Credentials in `.env` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) — never hardcode
- `estimates` table: created, has real data now, RLS enabled
- Auth user: `laurieb@cobblestoneconsulting.com` — confirmed, email verified
- Signup disabled after user was created (single-user app)
- Client module: `src/lib/supabase.js`

### State added to App.jsx for this phase
```js
currentEstimateId   // string | null — id of the loaded/saved estimate
saveDialog          // null | { type: 'new' } | { type: 'overwrite', existingName }
isSaving, justSaved // anti-spam: button disabled + "Saved ✓" flash after write
saveToast           // { message, isError } — bottom-center toast, auto-clears
```
Everything else (`selectedKeys`, `internalCost`, etc.) is derived, unchanged.

### Save Estimate — actual implemented flow
This deviates from the original SavedEstimatesHLDD.html §4 on purpose, per
Laurie's explicit direction: **every** save shows a confirm dialog, including
the very first save (the HLD originally said brand-new saves skip the dialog
and save instantly — that's superseded now).

```
Click Save Estimate → button disables immediately (can't double-fire)
  │
  ├─ currentEstimateId === null (never saved)
  │     → dialog: `Save "{Company}'s Estimate" to your estimates?` → Yes/Cancel
  │           Yes → INSERT → setCurrentEstimateId(new id) → toast + "Saved ✓"
  │
  └─ currentEstimateId !== null (previously saved / loaded)
        → queries the DB FRESH by that id every time (never trusts cache)
              ├─ row found  → dialog: `"{name}" already has a saved version.
              │                Overwrite it, or save this as a new related
              │                estimate?` → Cancel / Save As New / Overwrite
              │     Overwrite   → UPDATE same row (is_closed NOT touched)
              │     Save As New → INSERT new row → currentEstimateId = new id
              └─ row not found (deleted elsewhere) → silently falls back to
                 the brand-new flow above, no separate warning shown
```
- Blank Company/Course resolve to `"Unnamed"` before hitting the DB
  (`resolveName()` in `estimatePayload.js`). Display name everywhere is
  `"{Company}'s Estimate"` (`estimateDisplayName()`), NOT the old
  `"{Company} — {Course}"` format from the HLD mockup.
- After a successful write: button shows "Saved ✓" and stays disabled for
  ~1.8s (`justSaved` + `setTimeout`), so rapid re-clicks can't create dupes.
- `buildEstimateRow()` in `estimatePayload.js` is the single source of truth
  for App-state → DB-row shape. `additional_videos` MUST default to `[]`
  (never `null`) — the column is `NOT NULL` with a `'[]'::jsonb` default;
  sending `null` fails the constraint the moment a non-Microvideo estimate saves.
- **No browser-level beforeunload/tab-close warning exists.** Explicitly
  decided against — Laurie doesn't want any autosave-adjacent behavior; if
  the tab or browser closes before Save Estimate is clicked, that work is
  genuinely lost. Deliberate call, not an oversight.

### Unsaved-changes guard (in-app navigation only — different from the above)
This is a separate, deliberately-scoped-smaller feature than a beforeunload
warning: it only fires on *in-app* navigation (View Estimates button, Open on
a different estimate), not on tab close/refresh.

- `savedSnapshotRef` (a `useRef`, not state) holds a JSON-serialized snapshot
  of `{ catStates, selected, companyName, clientName, courseName, marginPct,
  liveHours, hasPptsWebinars, elearningLiked }` (Client Name + the two
  discovery questions added July 2026) taken at the moment an estimate is
  loaded or successfully saved.
  `hasUnsavedChanges()`: if `currentEstimateId === null`, dirty iff a category
  is selected (the only way to even reach these buttons); otherwise dirty iff
  `JSON.stringify(current state)` differs from the ref. This is a cheap
  in-memory comparison, NOT a DB round-trip — computed only at the moment of
  clicking, not on every render/keystroke.
- **Clicking View Estimates while dirty** → `navGuard` dialog: *"You're
  currently working on '{name}'. Save it before browsing, or continue without
  saving?"* → Cancel / Continue Without Saving / Save & Continue. Save &
  Continue calls `insertNewEstimate()`/`overwriteEstimate()` directly with NO
  second confirmation dialog (this warning IS the confirmation).
- **Clicking Open on a different estimate while dirty** → EstimatesModal shows
  a richer variant instead of the plain "Open X?" dialog: *"You're currently
  working on '{current}'. Opening '{target}' will replace it — save your
  current work, or discard it?"* → Cancel / Discard & Open / Save & Open.
  Requires `hasUnsavedChanges`/`currentEstimateName` props passed down from
  App.jsx, plus `onSaveAndOpen`/`onDiscardAndOpen` callbacks.
- **Not dirty** (opened/saved an estimate, changed nothing) → both of the
  above skip straight through with no warning at all — this is the exact
  case Laurie asked about ("what if she opens the estimate and doesn't change
  anything") and it's handled correctly by the snapshot comparison.
- If "Save & ___" itself fails (network error), nothing is discarded and no
  navigation happens — stays exactly where it was, shows an error toast.

### View Estimates modal (EstimatesModal.jsx) — actual implemented behavior
Full-screen overlay, same pattern as Export Preview. Fetches the whole
`estimates` table on open; search/sort/pagination are all client-side over
that already-fetched array (fine at this table size; revisit if it ever grows
into the thousands).

- **Pagination**: 5 rows per page (deliberately small — Laurie does ~50
  estimates/year, no need for more). Previous/Next buttons appear once there
  are 6+ matching rows; page resets to 1 whenever search or sort changes.
- **Search**: case-insensitive substring match against `company_name` OR
  `course_name`, client-side `.filter()`.
- **Sort** (client-side `.sort()`): Most Recent (`updated_at` desc, default) /
  Most Profitable (`client_price` desc) / Margin % (`margin_pct` desc) /
  Alphabetical (`company_name` asc).
- **Inline rename**: double-click Company or Course text → input appears →
  commits on blur or Enter (Escape cancels) → `UPDATE` on that single column
  only → also calls back to App.jsx to live-update `companyName`/`courseName`
  if that row is the one currently loaded (`currentEstimateId` match).
  Race-safety: `editingRef` + `commitPromiseRef` in EstimatesModal.jsx make
  `commitEdit()` reentrant-safe and awaitable, because clicking Open/Delete
  while a rename input is focused fires the input's `blur` (which starts the
  async write) immediately before the button's own `click` in the same tick.
  `flushPendingEditFor(row)` is called by both Open and Delete so they always
  act on the just-committed value, never a stale one.
- **Status toggle**: the Open/Closed pill is a button; click = instant
  `UPDATE is_closed` (optimistic, rolls back on error). No separate save step.
- **Delete**: confirm dialog → **hard delete** (`DELETE FROM estimates`), not
  soft-delete — matches Laurie's explicit call, not the old soft-delete plan
  from an earlier planning session. If the deleted row was the one currently
  loaded, `currentEstimateId` resets to null in App.jsx too.
- **Open**: confirm dialog (`Open "{name}'s Estimate"? This replaces what's
  currently on screen.`) → Yes → `onLoad(row)` restores full state. **Button
  only** — deliberately NOT wired to double-click-the-row (that gesture is
  taken by inline rename on the Company/Course cells; wiring both would
  conflict). This is an intentional deviation from the original HLD's
  "double-click row to open" — flag if Laurie still wants that behavior added
  on the non-name cells.
- **Categories column**: double-click to expand/collapse truncated text
  (per-row `expandedCats` Set state); also has a native `title` tooltip as a
  hover fallback.
- Hover affordances are deliberately per-element, not whole-row: a 2px dotted
  underline appears only on Company/Course/Categories on hover (the genuinely
  interactive cells). Client $/Margin/Saved Date get no hover effect — they
  aren't clickable, and an earlier whole-row-highlight was removed because it
  implied otherwise.

### Loading an estimate (`handleLoadEstimate` in App.jsx)
```
1. state = row.state_json ?? {}
2. catStates ← backfillWellsaid(state.catStates ?? catStates) — adds a missing
   WellSaid task (unchecked) for estimates saved before July 2026
3. setSelected(state.selected ?? selected)
4. companyName/clientName/courseName ← row.company_name / row.client_name / row.course_name  ⚠ NOT state_json
5. marginPct ← state.marginPct, liveHours ← state.liveHours
6. hasPptsWebinars/elearningLiked ← state.hasPptsWebinars / state.elearningLiked
7. loadedCreatedAt ← row.created_at (used by export's Date line)
8. setCurrentEstimateId(row.id); setScreen('estimator')
```
**Bug fixed 2026-07-03**: Company/Course must be read from the row's
top-level columns, not `state_json.companyName`/`courseName`. Inline rename
in the modal only ever updates the top-level columns — `state_json` is a
frozen snapshot from whenever that estimate was last explicitly Saved, so
reading names from it made Open show stale names after a rename. Loading
self-heals the next time that estimate is Saved/Overwritten, since
`buildEstimateRow()` rebuilds `state_json` fresh from current App state.

### `estimates` table schema (as actually deployed — verified via
`information_schema.columns`, not just the original design doc)
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid PK | NO | `gen_random_uuid()` | never shown in UI |
| user_id | uuid FK → auth.users | NO | none | nullable pre-auth, restored to NOT NULL once auth shipped; populated from `session.user.id` on every insert |
| company_name | text | NO | `''` | app always resolves blank → `'Unnamed'` before insert |
| client_name | text | NO | `''` | added July 2026; the person, not the business — blank stays `''`, NOT resolved to `'Unnamed'` (that's a company/course-only convention) |
| course_name | text | NO | `''` | same |
| categories | text[] | NO | `'{}'` | e.g. `['rise360','microvideo']` |
| internal_cost | numeric | NO | `0` | snapshot |
| client_price | numeric | NO | `0` | snapshot; drives Most Profitable sort |
| margin_pct | smallint | NO | `50` | 40 / 45 / 50 |
| ada_enabled | jsonb | NO | `'{}'` | e.g. `{ "rise360": true }` |
| module_counts | jsonb | NO | `'{}'` | e.g. `{ "rise360": 3 }` |
| additional_mins | jsonb | NO | `'{}'` | e.g. `{ "rise360": 5 }` |
| additional_videos | jsonb | NO | `'[]'` | **must send `[]` not `null`** for non-Microvideo saves |
| is_closed | boolean | NO | `false` | |
| is_won | boolean | NO | `false` | added July 2026; independent of `is_closed` — two separate axes, not a sub-state |
| state_json | jsonb | NO | `'{}'` | full App state snapshot for reload — also carries `clientName`, `hasPptsWebinars`, `elearningLiked` (July 2026; not their own columns, see below) |
| created_at | timestamptz | NO | `now()` | |
| updated_at | timestamptz | NO | `now()` | bumped by DB trigger on UPDATE |

**July 2026 schema addition** — `client_name` and `is_won` were added via:
```sql
alter table public.estimates
  add column if not exists client_name text not null default '',
  add column if not exists is_won boolean not null default false;
```
No RLS changes needed — the existing `owner: insert`/`owner: update` policies
already cover new columns. The two new discovery-question fields
(`hasPptsWebinars`, `elearningLiked`) deliberately did **not** get their own
columns — they're internal qualifying notes (like the existing static
"Questions to ask customer" panel), not client-facing or filterable, so they
just ride along inside `state_json`. Revisit if Laurie ever wants to
search/sort by them.

`client_name` goes through `resolveName()` in `buildEstimateRow()` exactly
like `company_name`/`course_name` — blank resolves to `"Unnamed"` on save, so
a blank client name reads the same way in the export and in View Estimates
after saving. (Originally left un-resolved on purpose; reversed per explicit
request so all three name fields behave identically.) `EstimatesModal.jsx`
shows a **Client Name** column right after Company (own inline-rename cell,
same double-click-to-edit pattern as Company/Course) — `handleEstimateRenamed`
in App.jsx syncs it back to live state the same way it does for Company/Course.

### RLS — final tightened state (shipped 2026-07-03, verified live)
The 4 temporary `"anon {select,insert,update,delete} (temp, pre-auth)"`
policies are gone. Current policies on `estimates`:
- `owner: select`, `owner: insert`, `owner: delete` (pre-existing, `to public`,
  `using/with_check (auth.uid() = user_id)`)
- `owner: update` (added during Step 7 — the original setup never had one;
  discovered when a `create policy` collided with an existing same-named
  policy of unknown definition, so it's now `drop policy if exists` +
  recreate, idempotent) — same `auth.uid() = user_id` shape.
- `user_id` is `NOT NULL` again, populated from `session.user.id` in
  `insertNewEstimate()`.

**Verified live against the real table, not just assumed:** anon key gets an
empty result from `SELECT`, a `42501` rejection on `INSERT`, and 0-rows-
affected on `UPDATE`/`DELETE` against an actual Laurie-owned row (tested by
ID, not a fake one — a fake ID would "succeed" at 0-rows-affected regardless
of RLS, which isn't a real test). Anon has zero access, confirmed.

### Operational risks (Supabase free tier — flag to Laurie, don't silently fix)
- **No automated backups on Free tier.** No daily backups, no point-in-time
  recovery. The hard-delete confirm dialog is the only safety net that
  exists today — if she confirms a delete she didn't mean, it's gone for
  good. Mitigation options if this becomes a real concern: upgrade to
  Supabase Pro (~$25/mo, adds daily backups + optional PITR), or a periodic
  script that dumps the table to JSON as a manual backup.
- **Free-tier projects auto-pause after ~1 week of no API activity.** Data
  isn't lost, but the project must be manually resumed from the Supabase
  dashboard before the app works again. Real risk for a low-traffic internal
  tool that might go quiet for a week.
- **Storage is a non-issue at this scale.** Measured a realistic worst-case
  full estimate row (all 3 categories, 3 modules, ADA, extra videos) at
  ~16.4 KB. 500MB Free-tier storage ÷ that ≈ 31,000 rows ≈ 600+ years of
  runway at ~50 estimates/year. Free tier is not the constraint here — the
  backup/auto-pause gaps above are the only real Free-tier risks.

### Step 7 — Auth gate (DONE, shipped 2026-07-03)
Full-app gate — nothing renders, not even the calculator, until signed in.
New files: `LoginScreen.jsx`, `ResetPasswordScreen.jsx`,
`ChangePasswordModal.jsx`, `AppHeader.jsx` (shared header w/ Sign Out +
Change Password, replaces 3x-duplicated inline header markup).

- **Session persistence**: went with Supabase's default (`localStorage`,
  persistent across closes/refreshes) — this is a different concern from the
  standing no-localStorage rule for *estimate draft state*, which is about
  not auto-saving in-progress work, not about auth tokens.
- **`onAuthStateChange`** drives everything: `session` state (`undefined` =
  still checking, `null` = signed out, object = signed in) plus a special
  `isRecovery` flag set by the `PASSWORD_RECOVERY` event, checked *before*
  the session check so the reset-password link always lands on "set new
  password," never straight into the app.
- **Forgot password**: no email input — single-account app, so any email
  typed wouldn't change where the link goes anyway. Hardcoded
  `LAURIE_EMAIL` constant in `LoginScreen.jsx`, UI just confirms "sent to
  Laurie's email."
- **Change Password requires re-entering the current password** — Supabase's
  `updateUser()` doesn't check this itself (an active session is sufficient
  for it), so `ChangePasswordModal` calls `signInWithPassword` with the
  entered current password first as a verification step, only calling
  `updateUser` if that succeeds. Guards against an already-unlocked/open
  session being used to lock the real owner out.
- **Sign Out** (`supabase.auth.signOut()`) is global-scope by default — signs
  out of every device/session for that account, not just the current tab.
- **Signup is confirmed disabled server-side**, not just assumed from a
  dashboard toggle — a real signup attempt via the anon key returns
  `422 signup_disabled`, no account created. Only one login exists.
- **Iframe embedding caveat** (unchanged, still relevant if this is ever
  embedded elsewhere): browser storage partitioning (Safari ITP today,
  Chrome/Firefox increasingly) means a session may not carry over between a
  direct visit and an iframe embed. Not fixable at the app level — accepted
  tradeoff for this single-user tool.
- Companion user-facing doc: `DATABASE_PHASE2_GUIDE.md` — point Laurie there
  for usage questions instead of re-deriving answers from this file.

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
- **DB phase**: Steps 1–7 are ALL done (Save Estimate, View Estimates modal,
  full-app auth gate, RLS tightened and verified live). See
  `DATABASE_PHASE2_GUIDE.md` for the user-facing "what does this do" version.
- If the app ever needs a new DB feature, remember RLS is now tight — anon
  can do nothing; every code path that touches `estimates` only ever runs
  post-login, and inserts must keep stamping `user_id` from the session.
- Supabase credentials come from `.env` only — never hardcode keys.
- Any RLS policy change (dashboard or SQL) is Laurie's action to take, not
  something to attempt via the anon key — always hand her exact SQL to run
  and re-verify with a live round-trip test afterward, don't assume it worked.
- Before trusting a Supabase write path works, verify with a real (self-cleaning)
  insert/update/delete round trip against the live table — reading the code
  is not enough; RLS/schema constraints only show up at request time.
