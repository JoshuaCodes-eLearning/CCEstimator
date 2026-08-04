import { RATES, ADA_RATES, DEFAULT_MINUTES, VALIDATOR_WORD_RATES, PHASE_LABELS } from '../config/config'

// Hours for one assignee within a task (respects Fixed vs Dynamic scaling)
export function computeAssigneeHoursForTask(assignee, task, catKey, addedMin) {
  const bh = assignee.baseHours ?? assignee.hours ?? 0
  if (task.type === 'Fixed') return bh
  const defMin = DEFAULT_MINUTES[catKey]
  if (!defMin) return bh
  return bh * (defMin + addedMin) / defMin
}

// Total hours across all assignees for a task
export function computeHours(task, catKey, addedMin) {
  if (task.type === 'Expense') return 0
  // Localization "per item/slide" tasks — quantity (Laurie-entered) ×
  // unitMinutes, unaffected by category minutes/module scaling.
  if (task.type === 'PerUnit') return (task.unitMinutes ?? 0) / 60 * (task.quantity ?? 0)
  const assignees = task.assignees ?? []
  if (assignees.length === 0) {
    const bh = task.baseHours ?? task.hours ?? 0
    if (task.type === 'Fixed') return bh
    const defMin = DEFAULT_MINUTES[catKey]
    if (!defMin) return bh
    return bh * (defMin + addedMin) / defMin
  }
  return assignees.reduce((sum, a) => sum + computeAssigneeHoursForTask(a, task, catKey, addedMin), 0)
}

// Effective hourly rate for one assignee — respects a per-assignee
// `hourlyRate` override (added 2026-08 for the Rise/Storyline localization
// validator seats, so Laurie can price a Fiverr-sourced QA person on the
// fly) before falling back to the shared RATES table. The single place this
// override is applied, so every cost/display path stays consistent.
export function assigneeRate(a) {
  return a.hourlyRate ?? RATES[a.person] ?? 0
}

// Total cost across all assignees for a task
export function lineCost(task, catKey, addedMin) {
  if (task.type === 'Expense') return (task.flatCost ?? 0) * (task.months ?? 1)
  if (task.type === 'PerUnit') {
    const person = task.assignees?.[0]?.person
    return computeHours(task, catKey, addedMin) * (RATES[person] ?? 0)
  }
  const assignees = task.assignees ?? []
  if (assignees.length === 0) {
    return computeHours(task, catKey, addedMin) * (RATES[task.responsible] ?? 0)
  }
  return assignees.reduce((sum, a) => {
    const h = computeAssigneeHoursForTask(a, task, catKey, addedMin)
    return sum + h * assigneeRate(a)
  }, 0)
}

// Dollar-only cost for a localization task's flat per-1000-words validator
// fee (Rise's Validate, Storyline's Validation #1, Microvideo's Validate word
// step) — no hours, no assignee, just words × a rate. `task.flatRate` (added
// 2026-08) is a per-task customizable override Laurie can type in on the row
// ("Flat Rate"); falls back to the category's validatorLanguage table rate
// for legacy tasks that predate the override. Returns 0 until a rate is
// available and a word count is entered.
export function validatorWordsCost(task, cat) {
  if (!task.validatorWords) return 0
  const words = task.words ?? 0
  if (!words) return 0
  const rate = task.flatRate ?? VALIDATOR_WORD_RATES[cat.validatorLanguage] ?? 0
  if (!rate) return 0
  return (words / 1000) * rate
}

// Tasks that render/count under the trailing "Localization" section — the
// translate/validate steps (cat.localization.tasks) always, plus, for New
// Course mode on Rise 360/Storyline 360 only, the old-hours Project
// Management/Monitoring/Communications tasks from cat.localizationPmCore
// (see LOCALIZATION_PM_CORE_TASKS in config.js). Existing Course mode's
// PM-core tasks render in the normal Project Management phase section
// instead (see visibleNormalTasks below), so they're deliberately excluded
// here — including them in both places would double-count their cost.
export function localizationSectionTasks(cat) {
  const pmCore = (cat.localizationMode === 'new' && cat.localizationPmCore?.tasks) || []
  return [...pmCore, ...(cat.localization?.tasks ?? [])]
}

// Localization tasks are counted once per category regardless of module or
// additional-video count (same "flat, not scaled" treatment as WellSaid) —
// catKey/addedMin are irrelevant here since localization tasks are always
// Fixed or PerUnit (never Dynamic), so passing null/0 is safe.
export function localizationCostForCategory(cat) {
  // Requires a mode too, not just the toggle — matches visibleNormalTasks()'s
  // own gating rule below, so the export can never count a cost the live
  // screen never showed. In practice localizationMode is always set the
  // instant localizationEnabled is (CategoryBlock's toggle defaults it to
  // 'existing'); this guards legacy saved estimates from before that pairing
  // existed, where enabled: true, mode: null could be stored together.
  if (!cat?.localizationEnabled || !cat.localizationMode) return { hours: 0, cost: 0 }
  let hours = 0
  let cost  = 0
  for (const task of localizationSectionTasks(cat)) {
    if (!task.included) continue
    hours += computeHours(task, null, 0)
    cost  += lineCost(task, null, 0) + validatorWordsCost(task, cat)
  }
  return { hours, cost }
}

// The task list actually shown/counted for a category — non-destructive:
// never mutates stored state, just changes what render/calc code iterates.
// Turning Localization on auto-defaults the mode to 'existing' (same
// "Existing Course" narrowing described below) rather than leaving it unset
// — see CategoryBlock's toggle — so there's no longer a limbo state where
// localizationEnabled is true but localizationMode is null; the `!cat.
// localizationMode` check here is just the (still-correct) guard for legacy
// saved estimates from before that pairing existed. Once "Existing Course" is
// picked, it narrows to the project-management-side tasks (Project
// Management, Project Monitoring, Communications); everything else hides.
// Either mode then folds
// the localization tasks directly into this same list (tagged
// isLocalization: true) so they render in the normal task list — same rows,
// same per-member subtotal — rather than a separate section. They're still
// counted exactly once per category regardless of module/video count, since
// they only ever appear here (never in visibleSecondStateTasks below), and
// isLocalization tags them so ADA's multiplier can still skip them (see
// computePhaseTotals/App.jsx).
export function visibleNormalTasks(cat) {
  if (!cat.localizationEnabled || !cat.localizationMode) return cat.tasks
  const locTasks = localizationSectionTasks(cat).map(t => ({ ...t, isLocalization: true }))
  if (cat.localizationMode === 'existing') {
    // Rise/Storyline: cat.localizationPmCore holds the old (localization)
    // hours for these three tasks, entirely replacing the new-default
    // versions in cat.tasks (see LOCALIZATION_PM_CORE_TASKS in config.js).
    // Microvideo has no override, so it falls back to the original filter.
    const base = cat.localizationPmCore?.tasks ?? cat.tasks.filter(t => t.projectManagementCore)
    return [...base, ...locTasks]
  }
  return [...cat.tasks, ...locTasks]
}

export function visibleSecondStateTasks(cat) {
  const tasks = cat.secondState?.tasks ?? []
  if (cat.localizationEnabled && cat.localizationMode === 'existing') {
    if (cat.localizationPmCore) return cat.localizationPmCore.secondStateTasks ?? []
    return tasks.filter(t => t.projectManagementCore)
  }
  return tasks
}

// Whichever Expense task instance (primary or second-state) is actually
// checked — the single source of truth for that category's flat expense,
// since it's counted once per category regardless of module/video count.
function activeExpenseTask(cat) {
  // Respects "Existing Course" localization mode's PM-core filter — WellSaid
  // isn't a PM task, so it hides (and stops costing) along with the rest of
  // the normal content tasks in that mode, same as it does visually.
  const primary = visibleNormalTasks(cat).find(t => t.type === 'Expense')
  const second  = visibleSecondStateTasks(cat).find(t => t.type === 'Expense')
  if (primary?.included) return primary
  if (second?.included) return second
  return null
}

// Flat "Expense" task cost for a category (e.g. WellSaid) — counted once
// per category regardless of module/video count, whether checked in the
// primary task list or the second-state template (or both). Months is a
// flat multiplier (subscription-style — it does NOT scale with module or
// additional-video count, unlike Fixed/Dynamic hours).
export function expenseCostForCategory(cat) {
  const active = activeExpenseTask(cat)
  if (!active) return 0
  return (active.flatCost ?? 0) * (active.months ?? 1)
}

// Months value of the active Expense task, for export/label display (e.g.
// "+ WellSaid add-on (3 months)"). Defaults to 1 when not checked/unset.
export function expenseMonthsForCategory(cat) {
  return activeExpenseTask(cat)?.months ?? 1
}

export function fmt(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function categorySubtotal(catKey, cat) {
  let sum = 0
  let flatSum = 0
  let locSum = 0
  for (const task of visibleNormalTasks(cat)) {
    if (!task.included) continue
    // Flat expenses (e.g. WellSaid) are a pass-through — excluded from the
    // ADA-multiplied hours subtotal, added back in afterward untouched.
    if (task.type === 'Expense') { flatSum += (task.flatCost ?? 0) * (task.months ?? 1); continue }
    // Localization tasks (merged into this same list) are also a
    // pass-through — never multiplied by ADA, same as flat expenses.
    if (task.isLocalization) { locSum += lineCost(task, catKey, cat.additionalMinutes) + validatorWordsCost(task, cat); continue }
    sum += lineCost(task, catKey, cat.additionalMinutes)
  }
  if (cat.adaEnabled && ADA_RATES[catKey] > 0) {
    sum *= (1 + ADA_RATES[catKey])
  }
  return sum + flatSum + locSum
}

// ── Phase Totals (Design / Development / QA / Project Management) ──────
// Added 2026-07 restructure — every cost-bearing task carries a `phase` in
// config.js; tasks without one (pre-restructure saved estimates, or a
// user's own "+ Add subtask" row) fall back to 'development', matching the
// source restructure's own stated rule ("everything else is development,
// except Sales Meetings, which is project management" — Sales/SOW tasks
// already carry an explicit phase: 'pm', so this fallback never touches them).
export const PHASE_KEYS = ['design', 'development', 'qa', 'pm']

// The single source of truth for "which phase bucket does this task belong
// to" — shared by computePhaseTotals (cost bucketing) and orderTasksByPhase/
// sectionizeTasks below (visual grouping), so the two can never drift apart.
export function effectivePhase(task) {
  return PHASE_KEYS.includes(task.phase) ? task.phase : 'development'
}

// ── Visual phase grouping (added 2026-08) ───────────────────────────────
// Replaces the old per-task phase pill: instead of a small badge on every
// row, the task list itself is reordered into one Design block, then
// Development, then QA, then Project Management (stable sort — relative
// order within a phase is unchanged, so existing indent/nesting pairs like
// "Storyboard" → "Asset Procurement" or "Project Management" → "Project
// Monitoring" → "Communications" stay adjacent). Localization tasks (tagged
// isLocalization by visibleNormalTasks()) are always pulled out into their
// own trailing group after Project Management, regardless of the individual
// phase their underlying task carries (some are 'development', some 'qa') —
// per Laurie's explicit call that Localization reads as one block under PM,
// not scattered across the phase sections it technically touches.
export function orderTasksByPhase(tasks) {
  const normal = tasks.filter(t => !t.isLocalization)
  const loc    = tasks.filter(t => t.isLocalization)
  const ordered = PHASE_KEYS.flatMap(phase => normal.filter(t => effectivePhase(t) === phase))
  return [...ordered, ...loc]
}

// Splits an already phase-ordered task list (or any contiguous slice of
// one — e.g. a collapsed preview) into labeled sections, one per contiguous
// run of the same phase/localization key, for rendering a header above each
// group's first row.
export function sectionizeTasks(orderedTasks) {
  const sections = []
  let current = null
  for (const task of orderedTasks) {
    const key = task.isLocalization ? 'localization' : effectivePhase(task)
    if (!current || current.key !== key) {
      current = { key, tasks: [] }
      sections.push(current)
    }
    current.tasks.push(task)
  }
  return sections
}

export const SECTION_LABELS = { ...PHASE_LABELS, localization: 'Localization' }

export function computePhaseTotals(selectedKeys, catStates) {
  const totals = {}
  for (const p of PHASE_KEYS) totals[p] = { hours: 0, cost: 0 }

  function bucketFor(task) {
    return effectivePhase(task)
  }

  function addHourTask(task, catKey, addedMin, multiplier, adaRate, cat) {
    // Localization tasks are a pass-through — never multiplied by ADA, same
    // exemption categorySubtotal() gives them.
    const effectiveAdaRate = task.isLocalization ? 0 : adaRate
    const phase = bucketFor(task)
    // PerUnit tasks (quantity × unitMinutes — e.g. Storyline's "Clone the
    // course") are keyed off task.quantity, not any assignee's baseHours, so
    // computeAssigneeHoursForTask (Fixed/Dynamic only) always returns 0 for
    // them — same computeHours()/single-assignee pattern lineCost() uses.
    if (task.type === 'PerUnit') {
      const h = computeHours(task, catKey, addedMin)
      const person = task.assignees?.[0]?.person
      totals[phase].hours += h * multiplier
      totals[phase].cost  += h * (RATES[person] ?? 0) * (1 + effectiveAdaRate) * multiplier
    } else {
      for (const a of task.assignees ?? []) {
        const h = computeAssigneeHoursForTask(a, task, catKey, addedMin)
        totals[phase].hours += h * multiplier
        totals[phase].cost  += h * assigneeRate(a) * (1 + effectiveAdaRate) * multiplier
      }
    }
    // Flat per-1000-words validator fee — no assignees, so the loop above
    // never sees it; add it directly, still untouched by ADA.
    if (task.validatorWords && cat) {
      totals[phase].cost += validatorWordsCost(task, cat) * multiplier
    }
  }

  for (const catKey of selectedKeys) {
    const cat = catStates[catKey]
    if (!cat) continue
    const adaRate = (cat.adaEnabled && ADA_RATES[catKey] > 0) ? ADA_RATES[catKey] : 0

    const normalTasks = visibleNormalTasks(cat)
    const secondTasks = visibleSecondStateTasks(cat)

    if (catKey === 'microvideo') {
      for (const task of normalTasks) {
        if (!task.included || task.type === 'Expense') continue
        addHourTask(task, catKey, cat.additionalMinutes, 1, 0, cat)
      }
      for (const video of (cat.additionalVideos ?? [])) {
        const addedMin = video.minutes - DEFAULT_MINUTES[catKey]
        for (const task of secondTasks) {
          if (!task.included || task.type === 'Expense') continue
          addHourTask(task, catKey, addedMin, 1, 0, cat)
        }
      }
    } else {
      const extraModules = (cat.moduleCount ?? 1) - 1
      for (const task of normalTasks) {
        if (!task.included || task.type === 'Expense') continue
        addHourTask(task, catKey, cat.additionalMinutes, 1, adaRate, cat)
      }
      if (extraModules > 0 && cat.secondState) {
        for (const task of secondTasks) {
          if (!task.included || task.type === 'Expense') continue
          addHourTask(task, catKey, cat.additionalMinutes, extraModules, adaRate, cat)
        }
      }
    }

    // Flat expense (e.g. WellSaid) — counted once per category via the same
    // activeExpenseTask() dedup rule used by expenseCostForCategory(), added
    // untouched (no ADA) to whichever phase that active task carries.
    const active = activeExpenseTask(cat)
    if (active) {
      totals[bucketFor(active)].cost += (active.flatCost ?? 0) * (active.months ?? 1)
    }
  }

  return totals
}
