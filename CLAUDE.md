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

## Stack & architecture (decided)

- **React** single-page app. UI, all calculations, and the .docx export run
  entirely **client-side**.
- **No backend, no API routes, no database.** The app is stateless. Do not add a
  server layer "just in case." A backend is only justified if saving / accounts /
  integrations are added later — all currently out of scope.
- **Word export generated in the browser** with a JS .docx library (e.g. `docx`)
  + a save-file helper. No server round-trip.
- **GitHub** for source control: commit often with clean messages, push regularly.
- **Vercel** for hosting, connected to the GitHub repo; each push auto-deploys.
- Do NOT use `localStorage` / `sessionStorage` for required state — keep state in
  React state. (Stateless by design; the exported .docx is the only saved output.)

## Team & rates (hard-coded constants — no settings screen)

| Member   | Role                       | Rate |
|----------|----------------------------|------|
| Megan    | Development / coordination | $50  |
| Michelle | Design / storyboarding     | $65  |
| Laurie   | Project management         | $75  |  (confirmed)

`rate(responsible)` is a constant lookup. There is intentionally no UI to edit
rates. Every default subtask is assigned to one named person (Michelle/Megan/Laurie); the old shared "Team" rows now each default to a specific owner — meetings, communication, and lessons-learned go to Laurie (PM) unless edited.

## Core concepts

- **Three categories, multi-select:** Microvideo (default 3 min), Rise 360
  (15 min), Storyline 360 (15 min). Any combination; unchecked = excluded entirely.
- **Subtask row** (the atomic unit) has exactly: include checkbox · editable name ·
  Responsible field (Megan/Michelle/Laurie) · editable Hours field · a Type DROPDOWN
  (Fixed/Dynamic) · live line cost. Hours and Responsible are real editable inputs
  (text/number field + dropdown), NOT static text. No minutes control on the row —
  minutes is one control on the category header. Default name/who/hours come from the requirements and
  act as editable placeholders.
- **Fixed vs Dynamic** (chosen per subtask via a Type dropdown): Fixed hours never
  change. Dynamic hours scale linearly with that CATEGORY's additional minutes.
- **Additional minutes** (0–20): ONE control per category, on the block header (NOT
  per row). It scales the hours of EVERY Dynamic subtask in that category, linearly
  off the default: scaled_hours = default_hours * (default_min + added_min)/default_min.
  Fixed subtasks and other categories are unaffected.
  e.g. a 3h Dynamic Storyline subtask at 15min default, +5min -> 3*(20/15) = 4h.
- **ADA toggle** per applicable category: a flat +10% uplift on the category cost
  (not hours), the SAME 10% for both Rise 360 and Storyline 360. Microvideo has no
  ADA option. Make the toggle prominent in the UI.
- **"+ Add subtask" / "- Remove last subtask"** per category: Add appends a row
  (same shape); Remove pops the bottom-most row, stack-style (last-on, first-off).
- **Blocks appear on selection:** a category's block renders only when its checkbox
  is ticked; unchecked = no block at all. Each block is collapsible — collapsed
  shows a few subtasks + an Expand control; expanded shows all rows, add/remove,
  and per-row minutes. Space categories apart as distinct cards.
- **Unchecking a row** greys it out and removes it from totals — nothing is deleted.

## Formulas (run live)

```
# effective hours
Fixed:    hours = default_hours
Dynamic:  hours = default_hours * (default_minutes + additional_minutes) / default_minutes

line_cost          = hours * rate(responsible)          # checked rows only
category_internal  = sum(line_cost in category)
if ADA:  category_internal *= (1 + ada_rate)            # flat 0.10 for BOTH Rise and Storyline
member_hours       = sum that member's hours across ALL checked categories
internal_cost      = sum(category_internal)             # includes ADA
client_price       = internal_cost * 2                  # constant 50% margin
```

Worked example (Microvideo +3 min, Rise +ADA, Storyline off):
Microvideo $1,485 + Rise $7,920 = internal $9,405 → client $18,810.

## Screens

1. **Estimator (home):** project name + course name fields; three category
   checkboxes; only checked categories render a block. Each block HEADER, left→right:
   category name · large Total Time readout (default + added min) · Additional minutes
   (0–20) input box · ADA toggle (Rise/Storyline only) · Collapse/Expand top-right.
   Rows: checkbox · editable name · editable Responsible · editable Hours · Type
   dropdown · live line cost. Then per-category subtotal and a combined grand total
   (hours per member, internal cost, client price); "Export to Word" button.
2. **Export Preview:** review the combined estimate as it will appear in Word,
   then download the .docx. Back button returns to the form.

## Word export contents (one combined .docx)

- Project name + course name
- Each checked category with total length (default + additional minutes)
- Per category: each checked subtask (responsible, hours, Fixed/Dynamic, line cost),
  then the category subtotal (incl. ADA if applied)
- Combined hours for Michelle, Megan, Laurie
- Internal cost and client price

Word is the only export format.

## Open items (do NOT resolve unilaterally — placeholders are fine to build on)

1. **Minute-scaling behaviour & which subtasks default to Dynamic** — linear is the
   placeholder default; Laurie to confirm with Michelle. Keep scaling logic isolated
   and easy to swap.
2. **Laurie's rate is CONFIRMED at $75.** Keep it a single named constant so any
   future change is one line. (No longer an open question.)

Build and test now with placeholder values + linear scaling. Neither item blocks.

## Out of scope (current phase)

**Future phase (not now):** a database so Laurie can save/reopen estimates and SOWs.
Keep the architecture easy to extend; do not build it yet, but do not hard-block it.


Accounting/CRM/proposal integrations · multi-user/accounts/permissions · invoicing/
payments · database/saving input (current phase only) · editable settings screen · PDF export.

## Default subtask data

Lives in the HLD §9 (Microvideo, Rise 360, Storyline 360 task lists with
responsible person + hours). Load these as editable placeholder defaults. Treat the
HLD as the source; keep the data in one config module so it's easy to update.

## Working agreements for Claude Code

- Make a new git repo if none exists; commit + push regularly with clean messages.
- Keep rates, ADA percentages, the margin, and default task data in clearly named
  config constants — not scattered through components.
- Keep the scaling rule in one place (it's an open item likely to change).
- Prefer a small number of well-named components: App, CategoryBlock, SubtaskRow,
  TotalsBar, ExportPreview.
- When something is genuinely ambiguous vs. the HLD, ask rather than guess.
