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

## Current implementation status (as of 2026-06-18)

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
- Module 1 = full subtask list; Modules 2–N = second state template (all tasks
  start unchecked; user checks what applies)
- Cost = Module 1 + (N−1) × second-state-per-module cost; ADA on combined total
- Export/Word: Module 1 table + second state template table + per-module costs + overall total

**Microvideo — additional videos (live):**
- "+ Add Video" adds additional videos, each with its own editable time input
- "Additional Video Template" (collapsible second state) — user checks which
  tasks apply to all additional videos; Dynamic tasks scale per video time
- Per-video cost shown inline; overall Microvideo total when additional videos exist

## Stack & architecture (decided)

- **React** single-page app — UI, all calculations, and .docx export run entirely
  **client-side**. No backend, no API routes, no database.
- **Word export** generated in the browser with `docx` v9 + `file-saver` v2.
- **GitHub**: https://github.com/JoshuaCodes-eLearning/CCEstimator
- **Vercel**: https://cc-estimator.vercel.app/ — auto-deploys on push to main.
- Do NOT use localStorage/sessionStorage — all state stays in React. The exported
  .docx is the only saved output.

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
  utils/
    calc.js             — computeAssigneeHoursForTask(), computeHours(),
                          lineCost(), categorySubtotal(), fmt()
    exportDocx.js       — generateAndSaveDocx() — builds the Word document
  components/
    CategoryBlock.jsx   — one card per selected category; props-driven
    SubtaskRow.jsx      — one row; inner AssigneeRow component per person
    TotalsBar.jsx       — bottom bar; member hours + costs + export button
    ExportPreview.jsx   — screen 2; renders estimate preview + download
```

## Team & rates (hard-coded in config.js — no settings screen)

| Member      | Role                       | Rate |
|-------------|----------------------------|------|
| Megan       | Development / coordination | $50  |
| Michelle    | Design / storyboarding     | $65  |
| Laurie      | Project management         | $75  |
| QA Resource | Quality assurance (hire)   | $50  |

Rates live in `RATES` in config.js only. There is no UI to edit them.

## Task data model (updated June 2026)

Each task uses an **assignees array** — multiple people can work the same subtask,
each with their own hours.

```js
{
  id:        'mv-4',
  name:      'Internal meetings, client kickoff and status meetings',
  type:      'Fixed',          // 'Fixed' | 'Dynamic'
  included:  true,             // false = starts unchecked (optional, defaults true)
  assignees: [
    { person: 'Laurie',   hours: 2.5 },   // hours = config default
    { person: 'Michelle', hours: 2   },   // baseHours added at runtime by initCat()
    { person: 'Megan',    hours: 3.5 },
  ],
}
```

`hours` in config → `baseHours` added at runtime in `initCat()`. Calculations
always use `assignee.baseHours ?? assignee.hours ?? 0`.

**UI:** Each assignee renders as `[person dropdown] [hours input] [× remove]`.
A `+ add person` link adds another row. Maximum 4 assignees per task.
The `×` remove button is only shown when there are ≥ 2 assignees.

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
- **Unchecked-by-default tasks** (included: false in DEFAULT_TASKS):
  - All categories: Sales meetings / SOW (moved to bottom)
  - Microvideo: Logo stinger, Up to 5 min VEO3/Vyond, Up to 5 custom AI images
  - Storyline 360: Logo Stinger, Up to 5 min VEO3/Vyond, Up to 5 min software
    simulations, Up to 5 custom images

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

## Default subtask counts (June 2026)

- Microvideo: 16 tasks (mv-1 through mv-img; Sales SOW at bottom, unchecked)
- Rise 360: 15 tasks (r-1 through r-15; Sales SOW at bottom, unchecked)
- Storyline 360: 18 tasks (s-1 through s-16 + s-logo + s-narr; Sales SOW at
  bottom, unchecked)

All stored in `DEFAULT_TASKS` in config.js. `DEFAULT_SECOND_STATE_TASKS` is
auto-generated from DEFAULT_TASKS with all tasks set to `included: false`.

## Key implementation decisions

- **Multi-person assignees**: `SubtaskRow` contains an inner `AssigneeRow`
  component (defined in the same file) that manages its own local hours input
  state. `onUpdateAssignees(newAssignees)` is the single callback — SubtaskRow
  computes the new array and calls up to App via CategoryBlock's `onUpdateTask`.
- **Hours input**: `type="text"` with local string state. Commits to App state on
  every valid keystroke (live line-cost update). Back-calculation on Dynamic tasks:
  `baseHours = enteredValue / scale` so computeHours() returns what the user typed.
- **initCat()** in App.jsx initializes both `DEFAULT_TASKS` and
  `DEFAULT_SECOND_STATE_TASKS`; sets `included: t.included !== false` (respects
  false flags in config) and maps `assignees: t.assignees.map(a => ({...a, baseHours: a.hours}))`.
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

## Known assumption to verify

Rise 360 "Lessons Learned" in the June 18 Updates document reads
`"Laurie 3.25, Megan 1.25, Laurie 1.25"` — third person coded as **Michelle 1.25**
(assumed typo; all other split tasks include all three people). Comment in config.js
flags this. Confirm with Laurie before treating as final.

## Open items (do NOT resolve unilaterally)

1. **Which subtasks default to Dynamic** — linear scaling is the placeholder; Laurie
   to confirm with Michelle. Scaling logic isolated in `computeAssigneeHoursForTask()`
   in calc.js.
2. **HLD §6.7 worked example discrepancy** — numbers predate current task list.
   Not a blocker; Laurie to verify totals with real usage.
3. **Rise 360 Lessons Learned third person** — see "Known assumption" above.

## Out of scope (current phase)

**Future phase (not now):** database so Laurie can save/reopen estimates and SOWs.

Accounting/CRM/proposal integrations · multi-user/accounts/permissions · invoicing/
payments · editable settings screen · PDF export.

## Embedding

```html
<iframe src="https://cc-estimator.vercel.app/" width="100%" height="900px"
  style="border:none;" title="AI eLearning Estimator"></iframe>
```

## Working agreements for Claude Code

- Keep rates, ADA percentages, margin, and default task data in config.js only.
- Keep scaling rule isolated in calc.js — it's an open item.
- All state lives in App.jsx; components are props-driven.
- Commit + push to main after any meaningful change (Vercel auto-deploys).
- When something is genuinely ambiguous vs. the HLD, ask rather than guess.
