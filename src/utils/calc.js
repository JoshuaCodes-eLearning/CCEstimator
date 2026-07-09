import { RATES, ADA_RATES, DEFAULT_MINUTES } from '../config/config'

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
  const assignees = task.assignees ?? []
  if (assignees.length === 0) {
    return computeHours(task, catKey, addedMin) * (RATES[task.responsible] ?? 0)
  }
  return assignees.reduce((sum, a) => {
    const h = computeAssigneeHoursForTask(a, task, catKey, addedMin)
    return sum + h * (RATES[a.person] ?? 0)
  }, 0)
}

// Whichever Expense task instance (primary or second-state) is actually
// checked — the single source of truth for that category's flat expense,
// since it's counted once per category regardless of module/video count.
function activeExpenseTask(cat) {
  const primary = cat.tasks?.find(t => t.type === 'Expense')
  const second  = cat.secondState?.tasks?.find(t => t.type === 'Expense')
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
  for (const task of cat.tasks) {
    if (!task.included) continue
    // Flat expenses (e.g. WellSaid) are a pass-through — excluded from the
    // ADA-multiplied hours subtotal, added back in afterward untouched.
    if (task.type === 'Expense') { flatSum += (task.flatCost ?? 0) * (task.months ?? 1); continue }
    sum += lineCost(task, catKey, cat.additionalMinutes)
  }
  if (cat.adaEnabled && ADA_RATES[catKey] > 0) {
    sum *= (1 + ADA_RATES[catKey])
  }
  return sum + flatSum
}
