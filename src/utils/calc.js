import { RATES, ADA_RATES, DEFAULT_MINUTES, VALIDATOR_WORD_RATES } from '../config/config'

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
    return sum + h * (RATES[a.person] ?? 0)
  }, 0)
}

// Dollar-only cost for a localization task's flat per-1000-words validator
// fee (Rise's Validate, Storyline's Validation #1, Microvideo's Validate word
// step) — no hours, no assignee, just words × the category's chosen
// validator language rate. Returns 0 until both a language is picked and a
// word count is entered.
export function validatorWordsCost(task, cat) {
  if (!task.validatorWords) return 0
  const lang = cat.validatorLanguage
  if (!lang) return 0
  const words = task.words ?? 0
  if (!words) return 0
  return (words / 1000) * (VALIDATOR_WORD_RATES[lang] ?? 0)
}

// Localization tasks are counted once per category regardless of module or
// additional-video count (same "flat, not scaled" treatment as WellSaid) —
// catKey/addedMin are irrelevant here since localization tasks are always
// Fixed or PerUnit (never Dynamic), so passing null/0 is safe.
export function localizationCostForCategory(cat) {
  if (!cat?.localizationEnabled) return { hours: 0, cost: 0 }
  let hours = 0
  let cost  = 0
  for (const task of cat.localization?.tasks ?? []) {
    if (!task.included) continue
    hours += computeHours(task, null, 0)
    cost  += lineCost(task, null, 0) + validatorWordsCost(task, cat)
  }
  return { hours, cost }
}

// The task list actually shown/counted for a category — non-destructive:
// never mutates stored state, just changes what render/calc code iterates.
// Nothing changes just from turning Localization on — it's a two-step pick
// (toggle, then Existing/New Course), and the task list stays exactly as-is
// until a mode is actually chosen. Once "Existing Course" is picked, it
// narrows to the project-management-side tasks (Project Management, Project
// Monitoring, Communications); everything else hides. Either mode then folds
// the localization tasks directly into this same list (tagged
// isLocalization: true) so they render in the normal task list — same rows,
// same per-member subtotal — rather than a separate section. They're still
// counted exactly once per category regardless of module/video count, since
// they only ever appear here (never in visibleSecondStateTasks below), and
// isLocalization tags them so ADA's multiplier can still skip them (see
// computePhaseTotals/App.jsx).
export function visibleNormalTasks(cat) {
  if (!cat.localizationEnabled || !cat.localizationMode) return cat.tasks
  const base = cat.localizationMode === 'existing'
    ? cat.tasks.filter(t => t.projectManagementCore)
    : cat.tasks
  const locTasks = (cat.localization?.tasks ?? []).map(t => ({ ...t, isLocalization: true }))
  return [...base, ...locTasks]
}

export function visibleSecondStateTasks(cat) {
  const tasks = cat.secondState?.tasks ?? []
  if (cat.localizationEnabled && cat.localizationMode === 'existing') {
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
const PHASE_KEYS = ['design', 'development', 'qa', 'pm']

export function computePhaseTotals(selectedKeys, catStates) {
  const totals = {}
  for (const p of PHASE_KEYS) totals[p] = { hours: 0, cost: 0 }

  function bucketFor(task) {
    return totals[task.phase] ? task.phase : 'development'
  }

  function addHourTask(task, catKey, addedMin, multiplier, adaRate, cat) {
    // Localization tasks are a pass-through — never multiplied by ADA, same
    // exemption categorySubtotal() gives them.
    const effectiveAdaRate = task.isLocalization ? 0 : adaRate
    const phase = bucketFor(task)
    for (const a of task.assignees ?? []) {
      const h = computeAssigneeHoursForTask(a, task, catKey, addedMin)
      totals[phase].hours += h * multiplier
      totals[phase].cost  += h * (RATES[a.person] ?? 0) * (1 + effectiveAdaRate) * multiplier
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
