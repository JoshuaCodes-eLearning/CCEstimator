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
  const assignees = task.assignees ?? []
  if (assignees.length === 0) {
    return computeHours(task, catKey, addedMin) * (RATES[task.responsible] ?? 0)
  }
  return assignees.reduce((sum, a) => {
    const h = computeAssigneeHoursForTask(a, task, catKey, addedMin)
    return sum + h * (RATES[a.person] ?? 0)
  }, 0)
}

export function fmt(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function categorySubtotal(catKey, cat) {
  let sum = 0
  for (const task of cat.tasks) {
    if (!task.included) continue
    sum += lineCost(task, catKey, cat.additionalMinutes)
  }
  if (cat.adaEnabled && ADA_RATES[catKey] > 0) {
    sum *= (1 + ADA_RATES[catKey])
  }
  return sum
}
