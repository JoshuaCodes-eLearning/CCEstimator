# CCEstimator — AI eLearning Estimator

## What This Is
Internal React SPA for one user (Laurie at Cobblestone Consulting). Produces eLearning project estimates. Cuts ~5hrs manual work to ~1hr. Single stateless form — the Word .docx export is the only saved output.

## Stack
- React + Vite (client-side only, NO backend, NO database)
- `docx` + `file-saver` npm packages for Word export
- GitHub → Vercel (push = auto-deploy)
- Live URL: https://cc-estimator.vercel.app

## Project Path
`C:\Users\14044\OneDrive\Desktop\CCEstimator`

## Key Rules
- NO backend, NO server, NO database — ever
- NO settings screen — all rates are hard-coded constants in config.js
- Unchecking a subtask greys it out and removes from totals — never deletes
- Keep rates, ADA %, margin, and default task data in named config constants
- Do NOT resolve open items unilaterally — use placeholders and flag them

## Open Items (do not resolve without Laurie confirming)
1. Which subtasks default to Dynamic vs Fixed (linear placeholder in place)
2. Laurie's rate: using $75 — may be $85 (confirm with Laurie)
3. "Team" subtasks: no person assigned — flag as placeholder, ask Laurie
4. Microvideo Development subtask: will be broken into sub-items like other categories

## Components (src/components/)
- `App.jsx` — root, wires all three categories + TotalsBar
- `CategoryBlock.jsx` — one expandable category (header, subtask list, ADA, minutes)
- `SubtaskRow.jsx` — single subtask row (checkbox, name, dropdown, hours, Fixed/Dynamic, line cost)
- `TotalsBar.jsx` — bottom bar: hours per member, internal cost, client price, Export button
- `ExportPreview.jsx` — read-only preview before .docx download

## Config (src/config/config.js)
All constants live here: RATES, ADA_RATES, MARGIN, DEFAULT_TASKS per category.

## Formulas
- line_cost = hours × rate (checked rows only)
- dynamic_hours = default_hours × (default_min + added_min) / default_min
- category_internal = sum(line_costs) × (1 + ada_rate) if ADA checked
- internal_cost = sum of all category_internals
- client_price = internal_cost × 2

## Design Reference
See HLD document: AI_eLearning_Estimator_HLD.docx (in project root, reference only — not committed)
Dark navy (#1e3a5f approx) category headers. Blue checkboxes. Green Dynamic pill toggle. Yellow ADA checkbox. Dashed blue "+ Add subtask" button.

## Status
Scaffolded. Config and component placeholders in place. Awaiting HLD approval before building main UI.
