import { useState, useRef, useEffect } from 'react'
import { computeAssigneeHoursForTask, lineCost, validatorWordsCost, fmt } from '../utils/calc'
import { DEFAULT_MINUTES } from '../config/config'

const PEOPLE = ['Laurie', 'Megan', 'Michelle', 'QA Resource', 'J.K.', 'QA Spanish', 'QA French']

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

// Quantity input for a localization "per item/slide" PerUnit task — same
// local-state focus/blur pattern as MonthsInput, but floors at 0 (Laurie
// hasn't counted yet) rather than 1.
function QuantityInput({ quantity, onChange }) {
  const [local,   setLocal]   = useState(String(quantity))
  const [focused, setFocused] = useState(false)
  const display = focused ? local : String(quantity)

  function handleFocus() { setLocal(String(quantity)); setFocused(true) }
  function handleChange(raw) {
    setLocal(raw)
    const v = parseInt(raw)
    if (!isNaN(v) && v >= 0) onChange(v)
  }
  function handleBlur() {
    setFocused(false)
    if (isNaN(parseInt(local)) || parseInt(local) < 0) onChange(0)
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      className="loc-quantity-input"
      value={display}
      onFocus={handleFocus}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  )
}

// Word-count input for a localization flat-fee validator task — same
// pattern as QuantityInput, floors at 0.
function WordsInput({ words, onChange }) {
  const [local,   setLocal]   = useState(String(words))
  const [focused, setFocused] = useState(false)
  const display = focused ? local : String(words)

  function handleFocus() { setLocal(String(words)); setFocused(true) }
  function handleChange(raw) {
    setLocal(raw)
    const v = parseInt(raw)
    if (!isNaN(v) && v >= 0) onChange(v)
  }
  function handleBlur() {
    setFocused(false)
    if (isNaN(parseInt(local)) || parseInt(local) < 0) onChange(0)
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      className="loc-words-input"
      value={display}
      onFocus={handleFocus}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  )
}

// The validator "seat" on a task — QA Spanish/QA French, auto-determined by
// the category's single validatorLanguage picker rather than manually
// chosen like a normal assignee (no person dropdown, no remove button).
// mode: 'hours' (Storyline's Validation #2, Microvideo's Validate) shows an
// editable hours field next to the name; mode: 'words' (the flat
// per-1000-words fee tasks) shows a words field instead.
function ValidatorSeat({ name, mode, hours, words, onHoursChange, onWordsChange, validatorLanguage }) {
  const [localHours, setLocalHours] = useState('')
  const [hFocused,   setHFocused]   = useState(false)
  const hoursDisplay = hFocused ? localHours : String(parseFloat((hours ?? 0).toFixed(1)))

  function commitHours(raw) {
    const v = parseFloat(raw)
    if (!isNaN(v) && v >= 0) onHoursChange(v)
  }

  return (
    <div className="validator-seat assignee-row">
      <span className="validator-seat-name">{name}</span>
      {mode === 'words' ? (
        <>
          <WordsInput words={words ?? 0} onChange={onWordsChange} />
          <span className="loc-unit-hint">words</span>
          {!validatorLanguage && <span className="loc-unit-hint loc-unit-hint--warn">pick a validator language above</span>}
        </>
      ) : (
        <>
          <input
            type="text"
            inputMode="decimal"
            className="subtask-hours-input"
            value={hoursDisplay}
            onFocus={() => { setLocalHours(String(parseFloat((hours ?? 0).toFixed(1)))); setHFocused(true) }}
            onChange={e => { setLocalHours(e.target.value); commitHours(e.target.value) }}
            onBlur={() => setHFocused(false)}
          />
          <span className="loc-unit-hint">hrs</span>
        </>
      )}
    </div>
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
  onQuantityChange,
  onWordsChange,
  validatorLanguage,
}) {
  const isExpense        = task.type === 'Expense'
  const isPerUnit        = task.type === 'PerUnit'
  const isValidatorWords = task.validatorWords === true
  const hasValidatorSeat = task.validatorAssigneeIndex !== undefined
  const validatorName    = validatorLanguage === 'french' ? 'QA French' : 'QA Spanish'
  const excluded  = task.included === false
  const cost      = !excluded
    ? lineCost(task, catKey, addedMin) + validatorWordsCost(task, { validatorLanguage })
    : null

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
    <div className={`subtask-row${excluded ? ' subtask-row--excluded' : ''}${task.indent === 2 ? ' subtask-row--indented-2' : task.indent ? ' subtask-row--indented' : ''}`}>

      <input
        type="checkbox"
        className="subtask-check"
        checked={!excluded}
        onChange={() => onToggle?.()}
      />

      <div className="subtask-name-cell">
        <NameTextarea value={task.name} onChange={onNameChange} />
      </div>

      {isExpense ? (
        <div className="subtask-expense-months">
          <span className="expense-months-label">Months</span>
          <MonthsInput months={task.months ?? 1} onChange={onMonthsChange} />
          <span className="expense-months-hint">× {fmt(task.flatCost ?? 0)}/mo</span>
        </div>
      ) : isPerUnit ? (
        <div className="subtask-perunit">
          <select
            className="subtask-resp-select"
            value={task.assignees?.[0]?.person ?? ''}
            onChange={e => handlePersonChange(0, e.target.value)}
          >
            {PEOPLE.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="loc-quantity-chip">
            <QuantityInput quantity={task.quantity ?? 0} onChange={onQuantityChange} />
            <span className="loc-quantity-chip-label">{task.unitLabel ?? 'unit'}{task.quantity === 1 ? '' : 's'}</span>
          </div>
        </div>
      ) : (
        <div className="subtask-mixed-content">
          {/* Real team members (e.g. Michelle overseeing/importing validated
              text), the "+ add person" link, then the validator seat right
              below it — same list, same per-person row styling — since its
              name isn't manually picked like a normal assignee. */}
          {(task.assignees ?? []).length > 0 && (
            <div className="subtask-assignees">
              {task.assignees.map((assignee, idx) => (
                idx === task.validatorAssigneeIndex ? null : (
                  <AssigneeRow
                    key={idx}
                    assignee={assignee}
                    task={task}
                    catKey={catKey}
                    addedMin={addedMin}
                    canRemove={task.assignees.length > 1}
                    onPersonChange={person    => handlePersonChange(idx, person)}
                    onHoursChange={baseHours => handleHoursChange(idx, baseHours)}
                    onRemove={() => removeAssignee(idx)}
                  />
                )
              ))}
              {task.assignees.length < 4 && (
                <button type="button" className="btn-add-assignee" onClick={addAssignee}>
                  + add person
                </button>
              )}
              {hasValidatorSeat && (
                <ValidatorSeat
                  name={validatorName}
                  mode="hours"
                  hours={task.assignees[task.validatorAssigneeIndex]?.baseHours ?? task.assignees[task.validatorAssigneeIndex]?.hours ?? 0}
                  onHoursChange={h => handleHoursChange(task.validatorAssigneeIndex, h)}
                />
              )}
              {isValidatorWords && (
                <ValidatorSeat
                  name={validatorName}
                  mode="words"
                  words={task.words ?? 0}
                  onWordsChange={onWordsChange}
                  validatorLanguage={validatorLanguage}
                />
              )}
            </div>
          )}
        </div>
      )}

      {isExpense ? (
        <span className="subtask-type-flat">Expense</span>
      ) : isPerUnit ? (
        <span className="subtask-type-flat">Per {task.unitLabel ?? 'unit'}</span>
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
