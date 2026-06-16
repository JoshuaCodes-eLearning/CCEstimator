import { useState } from 'react'
import SubtaskRow from './SubtaskRow'
import { computeHours, fmt } from '../utils/calc'
import { DEFAULT_MINUTES, ADA_RATES, RATES } from '../config/config'

const COLLAPSED_ROWS = 2

export default function CategoryBlock({
  catKey,
  label,
  cat,
  hasAda,
  onUpdate,
  onUpdateTask,
  onAddTask,
  onRemoveTask,
}) {
  const { collapsed, additionalMinutes, adaEnabled, tasks } = cat
  const defMin      = DEFAULT_MINUTES[catKey]
  const totalMin    = defMin + additionalMinutes
  const hiddenCount = tasks.length - COLLAPSED_ROWS
  const visibleTasks = collapsed ? tasks.slice(0, COLLAPSED_ROWS) : tasks

  // Local string state so the user can backspace/type freely; commit on blur
  const [localMin,  setLocalMin]  = useState(String(additionalMinutes))
  const [minFocused, setMinFocused] = useState(false)

  const displayMin = minFocused ? localMin : String(additionalMinutes)

  function handleMinFocus() {
    setLocalMin(String(additionalMinutes))
    setMinFocused(true)
  }

  function handleMinChange(raw) {
    setLocalMin(raw)
    const v = parseInt(raw)
    if (!isNaN(v)) {
      onUpdate({ additionalMinutes: Math.max(0, Math.min(20, v)) })
    }
    // blank/NaN intermediate state: don't commit, just show what the user typed
  }

  function handleMinBlur() {
    setMinFocused(false)
    // display reverts to committed additionalMinutes if local state is invalid
  }

  // ── Per-member breakdown (included tasks only) ───────────
  const memberMap = {}
  for (const task of tasks) {
    if (!task.included) continue
    const h = computeHours(task, catKey, additionalMinutes)
    const c = h * (RATES[task.responsible] ?? 0)
    if (!memberMap[task.responsible]) memberMap[task.responsible] = { hours: 0, cost: 0 }
    memberMap[task.responsible].hours += h
    memberMap[task.responsible].cost  += c
  }

  const baseSubtotal  = Object.values(memberMap).reduce((s, m) => s + m.cost, 0)
  const adaRate       = (adaEnabled && hasAda) ? ADA_RATES[catKey] : 0
  const adaAmount     = baseSubtotal * adaRate
  const totalSubtotal = baseSubtotal + adaAmount
  const hasIncluded   = Object.keys(memberMap).length > 0

  return (
    <div className="cat-block">

      {/* ══ Header ══════════════════════════════════════════ */}
      <div className="cat-header">

        <div className="cat-header-left">
          <h2 className="cat-name">{label}</h2>
          <div className="cat-total-time">
            <span className="total-time-label">TOTAL TIME</span>
            <span className="total-time-value">{totalMin} min</span>
          </div>
        </div>

        <div className="cat-header-center">
          <div className="add-min-group">
            <label className="add-min-label">Additional minutes (0–20)</label>
            <div className="add-min-row">
              <input
                type="number"
                className="add-min-input"
                min={0}
                max={20}
                value={displayMin}
                onFocus={handleMinFocus}
                onChange={e => handleMinChange(e.target.value)}
                onBlur={handleMinBlur}
              />
              <span className="scales-hint">scales Dynamic subtasks</span>
            </div>
          </div>
        </div>

        <div className="cat-header-right">
          {hasAda && (
            <button
              type="button"
              className={`ada-toggle${adaEnabled ? ' ada-toggle--on' : ''}`}
              onClick={() => onUpdate({ adaEnabled: !adaEnabled })}
            >
              {adaEnabled ? '✓ ADA compliant +10%' : 'ADA — off'}
            </button>
          )}
          <button type="button" className="collapse-btn" onClick={() => onUpdate({ collapsed: !collapsed })}>
            {collapsed ? 'Expand ▸' : 'Collapse ▾'}
          </button>
        </div>

      </div>

      {/* ══ Body ════════════════════════════════════════════ */}
      <div className="cat-body">

        {/* Column headers — expanded only */}
        {!collapsed && (
          <div className="subtask-cols">
            <span />
            <span className="col-label">Task</span>
            <span className="col-label">Responsible</span>
            <span className="col-label">Hrs</span>
            <span className="col-label">Type</span>
            <span className="col-label col-label--right">Line Cost</span>
          </div>
        )}

        {/* Task rows */}
        {visibleTasks.map(task => (
          <SubtaskRow
            key={task.id}
            task={task}
            catKey={catKey}
            addedMin={additionalMinutes}
            onToggle={()           => onUpdateTask(task.id, { included: !task.included })}
            onNameChange={v        => onUpdateTask(task.id, { name: v })}
            onRespChange={v        => onUpdateTask(task.id, { responsible: v })}
            onBaseHoursChange={v   => onUpdateTask(task.id, { baseHours: v })}
            onTypeChange={v        => onUpdateTask(task.id, { type: v })}
          />
        ))}

        {/* Collapsed: count hint + expand link */}
        {collapsed && hiddenCount > 0 && (
          <>
            <p className="collapsed-count-hint">
              … {hiddenCount} more subtasks (all visible while expanded) …
            </p>
            <div className="expand-prompt">
              <button type="button" className="expand-link" onClick={() => onUpdate({ collapsed: false })}>
                Expand to see the other {hiddenCount} subtasks and add / remove
              </button>
            </div>
          </>
        )}

        {/* Add / Remove — expanded only */}
        {!collapsed && (
          <div className="add-remove-row">
            <button type="button" className="btn-add"    onClick={onAddTask}>+ Add subtask</button>
            <button type="button" className="btn-remove" onClick={onRemoveTask}>− Remove last subtask</button>
          </div>
        )}

        {/* ── Subtotal with math breakdown ── */}
        <div className="cat-subtotal-section">
          {hasIncluded ? (
            <>
              {Object.entries(memberMap).map(([member, { hours, cost }]) => (
                <div key={member} className="subtotal-member-line">
                  <span className="subtotal-member-desc">
                    {member}: {parseFloat(hours.toFixed(1))}h × ${RATES[member]}/hr
                  </span>
                  <span className="subtotal-member-cost">= {fmt(cost)}</span>
                </div>
              ))}

              {adaAmount > 0 && (
                <div className="subtotal-ada-line">
                  <span>ADA +10% on {fmt(baseSubtotal)}</span>
                  <span>+ {fmt(adaAmount)}</span>
                </div>
              )}

              <div className="subtotal-final-line">
                <span>{label} subtotal{adaEnabled && hasAda ? ' (incl. ADA)' : ''}</span>
                <span>{fmt(totalSubtotal)}</span>
              </div>
            </>
          ) : (
            <div className="subtotal-final-line">
              <span>{label} subtotal</span>
              <span className="subtotal-empty">No tasks selected</span>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
