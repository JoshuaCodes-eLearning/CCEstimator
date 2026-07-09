import { useState, useRef, useEffect } from 'react'
import { computeAssigneeHoursForTask, lineCost, fmt } from '../utils/calc'
import { DEFAULT_MINUTES, RATES } from '../config/config'

const PEOPLE = ['Laurie', 'Megan', 'Michelle', 'QA Resource', 'J.K.']

// Task name box — grows to fit its content so long descriptions
// (Storyboard, Development, etc.) are never clipped to one line.
function NameTextarea({ value, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      className="subtask-name-input"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder="Task name"
      rows={1}
    />
  )
}

// Months input for a flat monthly Expense task (e.g. WellSaid) — same
// local-state focus/blur pattern as the hours inputs above.
function MonthsInput({ months, onChange }) {
  const [local,   setLocal]   = useState(String(months))
  const [focused, setFocused] = useState(false)
  const display = focused ? local : String(months)

  function handleFocus() { setLocal(String(months)); setFocused(true) }
  function handleChange(raw) {
    setLocal(raw)
    const v = parseInt(raw)
    if (!isNaN(v) && v >= 1) onChange(v)
  }
  function handleBlur() {
    setFocused(false)
    if (isNaN(parseInt(local)) || parseInt(local) < 1) onChange(1)
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      className="expense-months-input"
      value={display}
      onFocus={handleFocus}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  )
}

// One person + hours line within a subtask
function AssigneeRow({ assignee, task, catKey, addedMin, canRemove, onPersonChange, onHoursChange, onRemove }) {
  const defMin   = DEFAULT_MINUTES[catKey] ?? 1
  const effHours = computeAssigneeHoursForTask(assignee, task, catKey, addedMin)

  const [localHours, setLocalHours] = useState('')
  const [hFocused,   setHFocused]   = useState(false)

  const displayVal = hFocused ? localHours : String(parseFloat(effHours.toFixed(1)))

  function commitHours(raw) {
    const v = parseFloat(raw)
    if (isNaN(v) || v < 0) return
    if (task.type === 'Dynamic') {
      const scale = (defMin + addedMin) / defMin
      onHoursChange(scale > 0 ? v / scale : v)
    } else {
      onHoursChange(v)
    }
  }

  return (
    <div className="assignee-row">
      <select
        className="subtask-resp-select"
        value={assignee.person}
        onChange={e => onPersonChange(e.target.value)}
      >
        {PEOPLE.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      <input
        type="text"
        inputMode="decimal"
        className="subtask-hours-input"
        value={displayVal}
        onFocus={() => {
          setLocalHours(String(parseFloat(effHours.toFixed(1))))
          setHFocused(true)
        }}
        onChange={e => {
          setLocalHours(e.target.value)
          commitHours(e.target.value)
        }}
        onBlur={() => setHFocused(false)}
      />

      {canRemove && (
        <button type="button" className="btn-remove-assignee" onClick={onRemove} title="Remove person">
          ×
        </button>
      )}
    </div>
  )
}

export default function SubtaskRow({
  task,
  catKey,
  addedMin,
  onToggle,
  onNameChange,
  onUpdateAssignees,
  onTypeChange,
  onMonthsChange,
}) {
  const isExpense = task.type === 'Expense'
  const excluded  = task.included === false
  const cost      = !excluded ? lineCost(task, catKey, addedMin) : null

  function handlePersonChange(idx, person) {
    onUpdateAssignees(task.assignees.map((a, i) => i === idx ? { ...a, person } : a))
  }

  function handleHoursChange(idx, baseHours) {
    onUpdateAssignees(task.assignees.map((a, i) => i === idx ? { ...a, baseHours } : a))
  }

  function addAssignee() {
    onUpdateAssignees([...task.assignees, { person: 'Megan', baseHours: 1, hours: 1 }])
  }

  function removeAssignee(idx) {
    if (task.assignees.length <= 1) return
    onUpdateAssignees(task.assignees.filter((_, i) => i !== idx))
  }

  return (
    <div className={`subtask-row${excluded ? ' subtask-row--excluded' : ''}${task.indent ? ' subtask-row--indented' : ''}`}>

      <input
        type="checkbox"
        className="subtask-check"
        checked={!excluded}
        onChange={() => onToggle?.()}
      />

      <NameTextarea value={task.name} onChange={onNameChange} />

      {isExpense ? (
        <div className="subtask-expense-months">
          <span className="expense-months-label">Months</span>
          <MonthsInput months={task.months ?? 1} onChange={onMonthsChange} />
          <span className="expense-months-hint">× {fmt(task.flatCost ?? 0)}/mo</span>
        </div>
      ) : (
        <div className="subtask-assignees">
          {(task.assignees ?? []).map((assignee, idx) => (
            <AssigneeRow
              key={idx}
              assignee={assignee}
              task={task}
              catKey={catKey}
              addedMin={addedMin}
              canRemove={(task.assignees ?? []).length > 1}
              onPersonChange={person    => handlePersonChange(idx, person)}
              onHoursChange={baseHours => handleHoursChange(idx, baseHours)}
              onRemove={() => removeAssignee(idx)}
            />
          ))}
          {(task.assignees ?? []).length < 4 && (
            <button type="button" className="btn-add-assignee" onClick={addAssignee}>
              + add person
            </button>
          )}
        </div>
      )}

      {isExpense ? (
        <span className="subtask-type-flat">Expense</span>
      ) : (
        <select
          className={`subtask-type-select subtask-type-select--${(task.type || 'fixed').toLowerCase()}`}
          value={task.type || 'Fixed'}
          onChange={e => onTypeChange?.(e.target.value)}
        >
          <option value="Fixed">Fixed</option>
          <option value="Dynamic">Dynamic</option>
        </select>
      )}

      <span className="subtask-cost">
        {cost !== null ? fmt(cost) : '—'}
      </span>

    </div>
  )
}
