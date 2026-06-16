import { RATES, ADA_RATES, DEFAULT_MINUTES, MARGIN_MULTIPLIER } from '../config/config'

// Defensive: fall back to task.hours if baseHours not yet set
function base(task) {
  return task.baseHours ?? task.hours ?? 0
}

export function computeHours(task, catKey, addedMin) {
  if (task.type === 'Fixed') return base(task)
  const defMin = DEFAULT_MINUTES[catKey]
  if (!defMin) return base(task)
  return base(task) * (defMin + addedMin) / defMin
}

export function lineCost(task, catKey, addedMin) {
  return computeHours(task, catKey, addedMin) * (RATES[task.responsible] ?? 0)
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
