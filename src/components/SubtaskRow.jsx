import { useState } from 'react'
import { computeHours, lineCost, fmt } from '../utils/calc'
import { DEFAULT_MINUTES } from '../config/config'

export default function SubtaskRow({
  task,
  catKey,
  addedMin,
  onToggle,
  onNameChange,
  onRespChange,
  onBaseHoursChange,
  onTypeChange,
}) {
  const defMin   = DEFAULT_MINUTES[catKey] ?? 1
  const effHours = computeHours(task, catKey, addedMin)
  const cost     = task.included !== false ? lineCost(task, catKey, addedMin) : null
  const excluded = task.included === false

  // Local string so the user can backspace/clear freely.
  // We commit to parent on every valid change (live line-cost update).
  // If the user leaves an empty/invalid field, blur resets the display.
  const [localHours, setLocalHours] = useState('')
  const [hFocused,   setHFocused]   = useState(false)

  const displayVal = hFocused ? localHours : String(parseFloat(effHours.toFixed(1)))

  function commitHours(raw) {
    const v = parseFloat(raw)
    if (isNaN(v) || v < 0) return
    if (task.type === 'Dynamic') {
      const scale = (defMin + addedMin) / defMin
      onBaseHoursChange?.(scale > 0 ? v / scale : v)
    } else {
      onBaseHoursChange?.(v)
    }
  }

  return (
    <div className={`subtask-row${excluded ? ' subtask-row--excluded' : ''}`}>

      <input
        type="checkbox"
        className="subtask-check"
        checked={!excluded}
        onChange={() => onToggle?.()}
      />

      <input
        type="text"
        className="subtask-name-input"
        value={task.name}
        onChange={e => onNameChange?.(e.target.value)}
        placeholder="Task name"
      />

      <select
        className="subtask-resp-select"
        value={task.responsible}
        onChange={e => onRespChange?.(e.target.value)}
      >
        <option value="Laurie">Laurie</option>
        <option value="Megan">Megan</option>
        <option value="Michelle">Michelle</option>
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
          commitHours(e.target.value)   // live update on every valid keystroke
        }}
        onBlur={() => setHFocused(false)}  // resets display to computed if invalid
      />

      <select
        className={`subtask-type-select subtask-type-select--${(task.type || 'fixed').toLowerCase()}`}
        value={task.type || 'Fixed'}
        onChange={e => onTypeChange?.(e.target.value)}
      >
        <option value="Fixed">Fixed</option>
        <option value="Dynamic">Dynamic</option>
      </select>

      <span className="subtask-cost">
        {cost !== null ? fmt(cost) : '—'}
      </span>

    </div>
  )
}
