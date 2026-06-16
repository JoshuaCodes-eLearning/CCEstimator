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

## Current implementation status (as of 2026-06-16)

**FULLY BUILT AND DEPLOYED** at https://cc-estimator.vercel.app/

Everything below is live and working:
- Category selector chips (Microvideo, Rise 360, Storyline 360) — multi-select
- Category blocks appear/hide on selection; collapsible cards
- All subtask rows: checkbox, editable name, editable Responsible dropdown,
  editable Hours (text input with live commit), Type dropdown, live line cost
- Additional minutes input (0–20) per category header with live scaling
- ADA toggle (Rise/Storyline only) — amber button, +10% on category cost
- + Add subtask / − Remove last subtask (with guard: no-op on empty list)
- Live formulas: Fixed/Dynamic scaling, line cost, category subtotal with
  per-member math breakdown, ADA uplift line, grand total in TotalsBar
- TotalsBar: active members only (0h members hidden), per-category breakdown
  when >1 category selected, internal cost + client price
- Export to Word: Export Preview screen (Screen 2) with real task data rendered,
  Download .docx button wired to generateAndSaveDocx()
- Currency formatted with commas ($1,234.56) everywhere via fmt() in calc.js

## Stack & architecture (decided)

- **React** single-page app. UI, all calculations, and the .docx export run
  entirely **client-side**.
- **No backend, no API routes, no database.** The app is stateless. Do not add a
  server layer "just in case." A backend is only justified if saving / accounts /
  integrations are added later — all currently out of scope.
- **Word export generated in the browser** with `docx` v9 + `file-saver` v2.
  No server round-trip.
- **GitHub**: https://github.com/JoshuaCodes-eLearning/CCEstimator
- **Vercel**: https://cc-estimator.vercel.app/ — auto-deploys on push to main.
- Do NOT use `localStorage` / `sessionStorage` for required state — keep state in
  React state. (Stateless by design; the exported .docx is the only saved output.)

## File structure

```
src/
  App.jsx               — root component; all state lives here; computes totals
  App.css               — (legacy placeholder, real styles in index.css)
  index.css             — full design system (CSS custom properties, all classes)
  config/
    config.js           — RATES, ADA_RATES, MARGIN_MULTIPLIER, DEFAULT_MINUTES,
                          CAT_LABELS, DEFAULT_TASKS (single source of truth)
  utils/
    calc.js             — computeHours(), lineCost(), categorySubtotal(), fmt()
    exportDocx.js       — generateAndSaveDocx() — builds the Word document
  components/
    CategoryBlock.jsx   — one card per selected category; props-driven (no local
                          calc state); local string state for additionalMinutes input
    SubtaskRow.jsx      — one row; local string state for hours input (live commit)
    TotalsBar.jsx       — bottom bar; member hours + costs + export button
    ExportPreview.jsx   — screen 2; renders estimate preview + download
```

## Team & rates (hard-coded constants — no settings screen)

| Member   | Role                       | Rate |
|----------|----------------------------|------|
| Megan    | Development / coordination | $50  |
| Michelle | Design / storyboarding     | $65  |
| Laurie   | Project management         | $75  |  (confirmed)

`rate(responsible)` is a constant lookup. There is intentionally no UI to edit
rates. Every default subtask is assigned to one named person (Michelle/Megan/Laurie).

## Core concepts

- **Three categories, multi-select:** Microvideo (default 3 min), Rise 360
  (15 min), Storyline 360 (15 min). Any combination; unchecked = excluded entirely.
- **Subtask row** (the atomic unit) has exactly: include checkbox · editable name ·
  Responsible field (Megan/Michelle/Laurie) · editable Hours field · a Type DROPDOWN
  (Fixed/Dynamic) · live line cost. Hours and Responsible are real editable inputs
  (text/number field + dropdown), NOT static text. No minutes control on the row —
  minutes is one control on the category header.
- **Fixed vs Dynamic** (chosen per subtask via a Type dropdown): Fixed hours never
  change. Dynamic hours scale linearly with that CATEGORY's additional minutes.
- **Additional minutes** (0–20): ONE control per category, on the block header (NOT
  per row). Scales hours of EVERY Dynamic subtask in that category, linearly off
  the default: scaled_hours = default_hours * (default_min + added_min)/default_min.
  Fixed subtasks and other categories are unaffected.
- **ADA toggle** per applicable category: flat +10% uplift on category cost
  (not hours), SAME 10% for both Rise 360 and Storyline 360. Microvideo has no ADA.
- **"+ Add subtask" / "- Remove last subtask"** per category, stack-style.
- **Blocks appear on selection:** renders only when checkbox ticked. Collapsible —
  collapsed shows 2 subtasks + Expand; expanded shows all rows + add/remove.
- **Unchecking a row** greys it out and removes it from totals — nothing deleted.

## Formulas (run live)

```
Fixed:    hours = default_hours
Dynamic:  hours = default_hours * (default_minutes + additional_minutes) / default_minutes

line_cost          = hours * rate(responsible)          # checked rows only
category_internal  = sum(line_cost in category)
if ADA:  category_internal *= (1 + 0.10)               # flat 10%, Rise + Storyline
member_hours       = sum that member's hours across ALL checked categories
internal_cost      = sum(category_internal)
client_price       = internal_cost * 2                  # 50% margin
```

Note: The worked example in HLD §6.7 (Microvideo $1,485, Rise $7,920) does NOT
reconcile with the §9 task list. It appears to be from an earlier draft. The §9
task list is authoritative and is what the app uses. Laurie should verify the
expected totals when testing with real data.

## Screens

1. **Estimator (home):** project name + course name fields; three category
   checkboxes; only checked categories render a block. Each block HEADER, left→right:
   category name · large Total Time readout · Additional minutes (0–20) input ·
   ADA toggle (Rise/Storyline only) · Collapse/Expand top-right.
   Rows: checkbox · editable name · editable Responsible · editable Hours · Type
   dropdown · live line cost. Per-category subtotal with member math breakdown.
   TotalsBar: hours per active member, per-category breakdown, internal + client price.
   "Export to Word" button.
2. **Export Preview:** real task data rendered as a Word-preview layout.
   Download .docx button triggers generateAndSaveDocx() in the browser.

## Word export contents (one combined .docx)

- Project name + course name
- Each checked category with total length (default + additional minutes)
- Per category: each checked subtask (responsible, hours, Fixed/Dynamic, line cost),
  then the category subtotal (incl. ADA if applied)
- Combined hours for Michelle, Megan, Laurie
- Internal cost and client price

Word is the only export format.

## Key implementation decisions

- **Hours input**: `type="text"` with local string state. Commits to App state on
  every valid keystroke (live line-cost update). Backspace to empty is allowed;
  blur resets display to computed effHours if field left invalid.
- **Back-calculation on hours edit**: when the user types new hours, baseHours is
  back-calculated from the displayed value so computeHours() still returns what
  they typed: `baseHours = enteredValue / scale` for Dynamic, `baseHours = enteredValue` for Fixed.
- **All buttons have type="button"** to prevent accidental form-submit behavior.
- **CAT_LABELS lives in config.js** (not App.jsx) to avoid Vite Fast Refresh warnings.
- **Active members only**: members with 0h are filtered from TotalsBar display.
- **fmt(n)** in calc.js formats all currency as $1,234.56.

## Open items (do NOT resolve unilaterally)

1. **Which subtasks default to Dynamic** — linear scaling is the placeholder; Laurie
   to confirm with Michelle. Scaling logic is isolated in calc.js/computeHours().
2. **HLD §6.7 worked example discrepancy** — numbers don't match current task list.
   Laurie should verify expected totals with real usage. Not a blocker.

## Out of scope (current phase)

**Future phase (not now):** database so Laurie can save/reopen estimates and SOWs.

Accounting/CRM/proposal integrations · multi-user/accounts/permissions · invoicing/
payments · database/saving input · editable settings screen · PDF export.

## Embedding

The app can be embedded in any website with a standard iframe:
```html
<iframe src="https://cc-estimator.vercel.app/" width="100%" height="900px"
  style="border:none;" title="AI eLearning Estimator"></iframe>
```
No code changes needed. Works in Webflow, WordPress, Squarespace, etc.

## Default subtask data

Stored in `src/config/config.js` under `DEFAULT_TASKS`. Matches HLD §9 exactly:
- Microvideo: 12 subtasks (mv-1 through mv-12)
- Rise 360: 15 subtasks (r-1 through r-15)
- Storyline 360: 16 subtasks (s-1 through s-16)

## Working agreements for Claude Code

- Keep rates, ADA percentages, the margin, and default task data in config.js only.
- Keep the scaling rule isolated in calc.js/computeHours() — it's an open item.
- All state lives in App.jsx; components are props-driven.
- Commit + push to main after any meaningful change (Vercel auto-deploys).
- When something is genuinely ambiguous vs. the HLD, ask rather than guess.
