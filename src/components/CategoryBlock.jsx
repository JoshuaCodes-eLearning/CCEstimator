import { useState } from 'react'
import SubtaskRow from './SubtaskRow'
import { computeAssigneeHoursForTask, computeHours, fmt, expenseCostForCategory, expenseMonthsForCategory, validatorWordsCost, visibleNormalTasks, visibleSecondStateTasks, orderTasksByPhase, sectionizeTasks, SECTION_LABELS } from '../utils/calc'
import { DEFAULT_MINUTES, ADA_RATES, RATES } from '../config/config'

const VALIDATOR_LANG_LABELS = { spanish: 'Spanish', french: 'French' }

const COLLAPSED_ROWS = 2

function VideoTimeInput({ minutes, onChange }) {
  const [local, setLocal]   = useState(String(minutes))
  const [focused, setFocused] = useState(false)
  const display = focused ? local : String(minutes)

  function handleFocus() { setLocal(String(minutes)); setFocused(true) }
  function handleChange(raw) {
    setLocal(raw)
    const v = parseInt(raw)
    if (!isNaN(v) && v >= 1) onChange(v)
  }
  function handleBlur() {
    setFocused(false)
    if (isNaN(parseInt(local)) || parseInt(local) < 1) onChange(minutes)
  }

  return (
    <input
      type="number" className="video-min-input" min={1} max={60}
      value={display}
      onFocus={handleFocus}
      onChange={e => handleChange(e.target.value)}
      onBlur={handleBlur}
    />
  )
}

export default function CategoryBlock({
  catKey, label, cat, hasAda,
  onUpdate, onUpdateTask, onAddTask, onRemoveTask, onUndoRemove, canUndo,
  onUpdateSecondState, onUpdateSecondStateTask, onAddSecondStateTask,
  onRemoveSecondStateTask, onUndoSecondStateRemove, canUndoSecond,
  onAddVideo, onRemoveVideo, onUpdateVideoMinutes,
  onUpdateLocalizationTask, onLocalizationLanguageChange,
}) {
  const isMicrovideo = catKey === 'microvideo'
  const { collapsed, additionalMinutes, adaEnabled, moduleCount = 1, secondState, additionalVideos = [],
          localizationEnabled, localizationMode, validatorLanguage } = cat
  // Non-destructive filter — "Localize Existing Course" hides all non-PM
  // tasks from view/totals without deleting their stored state. When
  // Localization is on, its tasks are folded directly into this same list
  // (tagged isLocalization) so they render alongside everything else instead
  // of a separate section.
  const tasks = orderTasksByPhase(visibleNormalTasks(cat))
  const defMin       = DEFAULT_MINUTES[catKey]
  const totalMin     = defMin + additionalMinutes
  const extraModules = isMicrovideo ? 0 : (moduleCount - 1)
  const unit         = isMicrovideo ? 'video' : 'module'
  const Unit         = unit.charAt(0).toUpperCase() + unit.slice(1)
  const hiddenCount  = tasks.length - COLLAPSED_ROWS
  const visibleTasks = collapsed ? tasks.slice(0, COLLAPSED_ROWS) : tasks
  const taskSections  = sectionizeTasks(visibleTasks)

  // ── Local input: additionalMinutes ────────────────────────
  const [localMin,   setLocalMin]   = useState(String(additionalMinutes))
  const [minFocused, setMinFocused] = useState(false)
  const displayMin = minFocused ? localMin : String(additionalMinutes)
  function handleMinFocus()     { setLocalMin(String(additionalMinutes)); setMinFocused(true) }
  function handleMinChange(raw) {
    setLocalMin(raw)
    const v = parseInt(raw)
    if (!isNaN(v)) onUpdate({ additionalMinutes: Math.max(0, Math.min(20, v)) })
  }
  function handleMinBlur() { setMinFocused(false) }

  // ── Local input: moduleCount (rise/storyline only) ────────
  const [localMod,   setLocalMod]   = useState(String(moduleCount))
  const [modFocused, setModFocused] = useState(false)
  const displayMod = modFocused ? localMod : String(moduleCount)
  function handleModFocus()     { setLocalMod(String(moduleCount)); setModFocused(true) }
  function handleModChange(raw) {
    setLocalMod(raw)
    const v = parseInt(raw)
    if (!isNaN(v)) onUpdate({ moduleCount: Math.max(1, Math.min(20, v)) })
  }
  function handleModBlur() { setModFocused(false) }

  // ── Video 1 / Module 1 cost breakdown ─────────────────────
  // adaEligibleSum excludes isLocalization tasks — the only base ADA's %
  // multiplies (see the ADA calc below); validatorWordsSum is the flat
  // per-1000-words fee, which has no assignee so it can't live in memberMap.
  // hasValidatorWordsTask tracks whether one is checked at all, so the
  // "Validator fee" line always shows (even at $0 before words are typed in)
  // instead of only appearing once a nonzero fee exists.
  const memberMap = {}
  let adaEligibleSum       = 0
  let validatorWordsSum    = 0
  let hasValidatorWordsTask = false
  for (const task of tasks) {
    if (!task.included) continue
    if (task.type === 'PerUnit') {
      const h = computeHours(task, catKey, additionalMinutes)
      const person = task.assignees?.[0]?.person
      const c = h * (RATES[person] ?? 0)
      if (!memberMap[person]) memberMap[person] = { hours: 0, cost: 0 }
      memberMap[person].hours += h
      memberMap[person].cost  += c
      if (!task.isLocalization) adaEligibleSum += c
      continue
    }
    for (const a of task.assignees ?? []) {
      const h = computeAssigneeHoursForTask(a, task, catKey, additionalMinutes)
      const c = h * (RATES[a.person] ?? 0)
      if (!memberMap[a.person]) memberMap[a.person] = { hours: 0, cost: 0 }
      memberMap[a.person].hours += h
      memberMap[a.person].cost  += c
      if (!task.isLocalization) adaEligibleSum += c
    }
    if (task.validatorWords) {
      hasValidatorWordsTask = true
      validatorWordsSum += validatorWordsCost(task, cat)
    }
  }
  const mod1BaseSum = Object.values(memberMap).reduce((s, m) => s + m.cost, 0) + validatorWordsSum

  // ── WellSaid flat expense (once per category, unaffected by ADA) ──
  const wellsaidCost    = expenseCostForCategory(cat)
  const wellsaidChecked = wellsaidCost > 0
  const wellsaidMonths  = expenseMonthsForCategory(cat)
  const wellsaidLabel   = `WellSaid add-on${wellsaidMonths > 1 ? ` (${wellsaidMonths} months)` : ''}`

  const hasIncluded = Object.keys(memberMap).length > 0 || wellsaidChecked || hasValidatorWordsTask

  // ── Second state tasks ────────────────────────────────────
  const secondTasks        = orderTasksByPhase(visibleSecondStateTasks(cat))
  const secondCollapsed    = secondState?.collapsed ?? true
  const secondHiddenCount  = secondTasks.length - COLLAPSED_ROWS
  const visibleSecondTasks = secondCollapsed ? secondTasks.slice(0, COLLAPSED_ROWS) : secondTasks
  const secondTaskSections = sectionizeTasks(visibleSecondTasks)

  // ── Per-video costs (microvideo only) ─────────────────────
  const additionalVideosCosts = isMicrovideo
    ? additionalVideos.map(video => {
        const addedMin = video.minutes - defMin
        let cost = 0
        for (const task of secondTasks) {
          if (!task.included) continue
          for (const a of task.assignees ?? []) {
            const h = computeAssigneeHoursForTask(a, task, catKey, addedMin)
            cost += h * (RATES[a.person] ?? 0)
          }
        }
        return { video, cost }
      })
    : []
  const additionalVideosTotalCost = additionalVideosCosts.reduce((s, { cost }) => s + cost, 0)

  // ── Second state cost (rise/storyline only) ───────────────
  const secondMemberMap = {}
  if (!isMicrovideo && extraModules > 0) {
    for (const task of secondTasks) {
      if (!task.included) continue
      for (const a of task.assignees ?? []) {
        const h = computeAssigneeHoursForTask(a, task, catKey, additionalMinutes)
        const c = h * (RATES[a.person] ?? 0)
        if (!secondMemberMap[a.person]) secondMemberMap[a.person] = { hours: 0, cost: 0 }
        secondMemberMap[a.person].hours += h
        secondMemberMap[a.person].cost  += c
      }
    }
  }
  const secondPerModule   = Object.values(secondMemberMap).reduce((s, m) => s + m.cost, 0)
  const secondTotalCost   = secondPerModule * extraModules
  const hasSecondIncluded = Object.keys(secondMemberMap).length > 0

  // ── Overall totals ────────────────────────────────────────
  // combinedBase/mod1BaseSum are the FULL displayed totals (incl.
  // localization); adaEligible* excludes localization tasks — ADA's % only
  // ever multiplies that smaller base, matching the pass-through exemption
  // in calc.js. Neither the additional-video template nor the second-state
  // module template ever contain localization tasks, so they're ADA-eligible
  // in full already.
  const adaRate      = (adaEnabled && hasAda) ? ADA_RATES[catKey] : 0
  const combinedBase = isMicrovideo
    ? (mod1BaseSum + additionalVideosTotalCost)
    : (mod1BaseSum + secondTotalCost)
  const adaEligibleCombined = isMicrovideo
    ? (adaEligibleSum + additionalVideosTotalCost)
    : (adaEligibleSum + secondTotalCost)
  const adaAmount    = adaEligibleCombined * adaRate
  const overallTotal = combinedBase + adaAmount + wellsaidCost
  const singleAdaAmt = adaEligibleSum * adaRate
  const singleTotal  = mod1BaseSum + singleAdaAmt + wellsaidCost

  const hasMultiple = isMicrovideo ? additionalVideos.length > 0 : moduleCount > 1

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
            <label className="add-min-label">
              {isMicrovideo ? 'Video 1 additional minutes (0–20)' : 'Additional minutes (0–20)'}
            </label>
            <div className="add-min-row">
              <input type="number" className="add-min-input" min={0} max={20}
                value={displayMin} onFocus={handleMinFocus}
                onChange={e => handleMinChange(e.target.value)} onBlur={handleMinBlur} />
              <span className="scales-hint">scales Dynamic subtasks</span>
            </div>
          </div>
        </div>

        <div className="cat-header-right">
          {/* Row 1: ADA + Expand/Collapse, side by side */}
          <div className="cat-header-top-row">
            {hasAda && (
              <button type="button"
                className={`ada-toggle${adaEnabled ? ' ada-toggle--on' : ''}`}
                onClick={() => onUpdate({ adaEnabled: !adaEnabled })}>
                {adaEnabled ? '✓ ADA compliant +10%' : 'ADA — off'}
              </button>
            )}
            <button type="button" className="collapse-btn"
              onClick={() => onUpdate({ collapsed: !collapsed })}>
              {collapsed ? 'Expand ▸' : 'Collapse ▾'}
            </button>
          </div>

          {/* Row 2: Localization, spanning/centered under row 1 — expands
              downward only (mode buttons side by side, language below) */}
          <div className="loc-toggle-group">
            <button type="button"
              className={`loc-toggle${localizationEnabled ? ' loc-toggle--on' : ''}`}
              onClick={() => onUpdate({ localizationEnabled: !localizationEnabled })}>
              {localizationEnabled ? '✓ Localization' : 'Localization — off'}
            </button>
            {localizationEnabled && (
              <div className="loc-options">
                <div className="loc-mode-buttons">
                  <button type="button"
                    className={`loc-mode-btn${localizationMode === 'existing' ? ' loc-mode-btn--selected' : ''}`}
                    onClick={() => onUpdate({ localizationMode: 'existing', collapsed: false })}>
                    Existing Course
                  </button>
                  <button type="button"
                    className={`loc-mode-btn${localizationMode === 'new' ? ' loc-mode-btn--selected' : ''}`}
                    onClick={() => onUpdate({ localizationMode: 'new', collapsed: false })}>
                    New Course
                  </button>
                </div>
                <div className="loc-language-group">
                  <span className="loc-language-label">Validator:</span>
                  <select className="loc-language-select"
                    value={validatorLanguage ?? 'spanish'}
                    onChange={e => onLocalizationLanguageChange(e.target.value)}>
                    <option value="spanish">Spanish</option>
                    <option value="french">French</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ Body ════════════════════════════════════════════ */}
      <div className="cat-body">

        {/* Module count bar (rise/storyline only) */}
        {!isMicrovideo && (
          <div className="module-count-bar">
            <span className="module-count-label">Number of {unit}s</span>
            <input type="number" className="module-count-input" min={1} max={20}
              value={displayMod} onFocus={handleModFocus}
              onChange={e => handleModChange(e.target.value)} onBlur={handleModBlur} />
            <span className="module-count-hint">
              {moduleCount === 1
                ? `single ${unit}`
                : `${unit} 1 full rate · ${unit}s 2–${moduleCount} use second state template`}
            </span>
          </div>
        )}

        {/* Section label (multi only) */}
        {hasMultiple && (
          <div className="module-section-label">
            {isMicrovideo ? 'Video 1' : `${Unit} 1`}
          </div>
        )}

        {/* Column headers — expanded only */}
        {!collapsed && (
          <div className="subtask-cols">
            <span /><span className="col-label">Task</span>
            <span className="col-label">Responsible / Hrs</span>
            <span className="col-label">Type</span>
            <span className="col-label col-label--right">Line Cost</span>
          </div>
        )}

        {/* Task rows — localization tasks are folded in here too (tagged
            isLocalization), routed to the localization update handler
            instead of the normal one */}
        {taskSections.map(section => (
          <div key={section.key} className="phase-section">
            <div className={`phase-section-header phase-section-header--${section.key}`}>
              {SECTION_LABELS[section.key]}
            </div>
            {section.tasks.map(task => {
              const update = task.isLocalization ? onUpdateLocalizationTask : onUpdateTask
              return (
                <SubtaskRow key={task.id} task={task} catKey={catKey} addedMin={additionalMinutes}
                  validatorLanguage={validatorLanguage}
                  onToggle={()                  => update(task.id, { included: !task.included })}
                  onNameChange={v               => update(task.id, { name: v })}
                  onUpdateAssignees={assignees  => update(task.id, { assignees })}
                  onTypeChange={v               => update(task.id, { type: v })}
                  onMonthsChange={v             => update(task.id, { months: v })}
                  onQuantityChange={v           => update(task.id, { quantity: v })}
                  onWordsChange={v              => update(task.id, { words: v })}
                />
              )
            })}
          </div>
        ))}

        {/* Collapsed hint */}
        {collapsed && hiddenCount > 0 && (
          <>
            <p className="collapsed-count-hint">… {hiddenCount} more subtasks (all visible while expanded) …</p>
            <div className="expand-prompt">
              <button type="button" className="expand-link" onClick={() => onUpdate({ collapsed: false })}>
                Expand to see the other {hiddenCount} subtasks and add / remove
              </button>
            </div>
          </>
        )}

        {/* Add / Remove / Undo — Video 1 / Module 1 */}
        {!collapsed && (
          <div className="add-remove-row">
            <button type="button" className="btn-add"    onClick={onAddTask}>+ Add subtask</button>
            <button type="button" className="btn-remove" onClick={onRemoveTask}>− Remove last subtask</button>
            <button type="button"
              className={`btn-undo${canUndo ? '' : ' btn-undo--disabled'}`}
              onClick={onUndoRemove} disabled={!canUndo}>↩ Undo last removal</button>
          </div>
        )}

        {/* Video 1 / Module 1 subtotal */}
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
              {hasValidatorWordsTask && (
                <div className="subtotal-member-line">
                  <span className="subtotal-member-desc">
                    Validator fee ({VALIDATOR_LANG_LABELS[validatorLanguage] ?? 'validator'})
                  </span>
                  <span className="subtotal-member-cost">= {fmt(validatorWordsSum)}</span>
                </div>
              )}
              {!isMicrovideo && moduleCount === 1 && singleAdaAmt > 0 && (
                <div className="subtotal-ada-line">
                  <span>ADA +10% on {fmt(adaEligibleSum)}</span>
                  <span>+ {fmt(singleAdaAmt)}</span>
                </div>
              )}
              {!hasMultiple && wellsaidChecked && (
                <div className="subtotal-ada-line">
                  <span>{wellsaidLabel}</span>
                  <span>+ {fmt(wellsaidCost)}</span>
                </div>
              )}
              <div className="subtotal-final-line">
                <span>
                  {isMicrovideo
                    ? (additionalVideos.length > 0 ? 'Video 1 subtotal' : `${label} subtotal`)
                    : (moduleCount > 1
                        ? `${Unit} 1 subtotal`
                        : `${label} subtotal${adaEnabled && hasAda ? ' (incl. ADA)' : ''}`)}
                </span>
                <span>
                  {isMicrovideo
                    ? fmt(mod1BaseSum + (hasMultiple ? 0 : wellsaidCost))
                    : fmt(moduleCount > 1 ? mod1BaseSum : singleTotal)}
                </span>
              </div>
            </>
          ) : (
            <div className="subtotal-final-line">
              <span>
                {isMicrovideo
                  ? (additionalVideos.length > 0 ? 'Video 1 subtotal' : `${label} subtotal`)
                  : (moduleCount > 1 ? `${Unit} 1 subtotal` : `${label} subtotal`)}
              </span>
              <span className="subtotal-empty">No tasks selected</span>
            </div>
          )}
        </div>

        {/* ══ MICROVIDEO: Additional Videos ══════════════════════ */}
        {isMicrovideo && (
          <div className="additional-videos-section">
            <div className="additional-videos-bar">
              <span className="additional-videos-title">Additional Videos</span>
              <button type="button" className="btn-add" onClick={onAddVideo}>+ Add Video</button>
            </div>

            {additionalVideos.length > 0 && (
              <div className="additional-videos-list">
                {additionalVideosCosts.map(({ video, cost }, idx) => (
                  <div key={video.id} className="additional-video-row">
                    <span className="additional-video-label">Video {idx + 2}</span>
                    <VideoTimeInput
                      minutes={video.minutes}
                      onChange={mins => onUpdateVideoMinutes(video.id, mins)}
                    />
                    <span className="additional-video-min-label">min</span>
                    <span className="additional-video-cost">{fmt(cost)}</span>
                    <button type="button" className="btn-remove-video"
                      onClick={() => onRemoveVideo(video.id)}>✕ Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ MICROVIDEO: Additional Video Template ══════════════ */}
        {isMicrovideo && additionalVideos.length > 0 && (
          <div className="second-state-block">
            <div className="second-state-header">
              <div className="second-state-title-group">
                <span className="second-state-title">Additional Video Template</span>
                <span className="second-state-subtitle">
                  Check tasks that apply to all additional videos (hrs shown at {defMin} min default)
                </span>
              </div>
              <button type="button" className="collapse-btn"
                onClick={() => onUpdateSecondState({ collapsed: !secondCollapsed })}>
                {secondCollapsed ? 'Expand ▸' : 'Collapse ▾'}
              </button>
            </div>

            {!secondCollapsed && (
              <div className="subtask-cols">
                <span /><span className="col-label">Task</span>
                <span className="col-label">Responsible</span>
                <span className="col-label">Hrs</span>
                <span className="col-label">Type</span>
                <span className="col-label col-label--right">Line Cost</span>
              </div>
            )}

            {secondTaskSections.map(section => (
              <div key={section.key} className="phase-section">
                <div className={`phase-section-header phase-section-header--${section.key}`}>
                  {SECTION_LABELS[section.key]}
                </div>
                {section.tasks.map(task => (
                  <SubtaskRow key={`s2-${task.id}`} task={task} catKey={catKey} addedMin={0}
                    onToggle={()                  => onUpdateSecondStateTask(task.id, { included: !task.included })}
                    onNameChange={v               => onUpdateSecondStateTask(task.id, { name: v })}
                    onUpdateAssignees={assignees  => onUpdateSecondStateTask(task.id, { assignees })}
                    onTypeChange={v               => onUpdateSecondStateTask(task.id, { type: v })}
                    onMonthsChange={v             => onUpdateSecondStateTask(task.id, { months: v })}
                  />
                ))}
              </div>
            ))}

            {secondCollapsed && secondHiddenCount > 0 && (
              <>
                <p className="collapsed-count-hint">… {secondHiddenCount} more subtasks (all visible while expanded) …</p>
                <div className="expand-prompt">
                  <button type="button" className="expand-link"
                    onClick={() => onUpdateSecondState({ collapsed: false })}>
                    Expand to see the other {secondHiddenCount} subtasks and add / remove
                  </button>
                </div>
              </>
            )}

            {!secondCollapsed && (
              <div className="add-remove-row">
                <button type="button" className="btn-add"    onClick={onAddSecondStateTask}>+ Add subtask</button>
                <button type="button" className="btn-remove" onClick={onRemoveSecondStateTask}>− Remove last subtask</button>
                <button type="button"
                  className={`btn-undo${canUndoSecond ? '' : ' btn-undo--disabled'}`}
                  onClick={onUndoSecondStateRemove} disabled={!canUndoSecond}>↩ Undo last removal</button>
              </div>
            )}
          </div>
        )}

        {/* ══ RISE/STORYLINE: Second State Section ══════════════ */}
        {!isMicrovideo && moduleCount > 1 && (
          <div className="second-state-block">

            <div className="second-state-header">
              <div className="second-state-title-group">
                <span className="second-state-title">
                  {moduleCount === 2 ? `${Unit} 2` : `${Unit}s 2–${moduleCount}`}
                </span>
                <span className="second-state-subtitle">
                  Second state template — check tasks that apply to additional {unit}s
                </span>
              </div>
              <button type="button" className="collapse-btn"
                onClick={() => onUpdateSecondState({ collapsed: !secondCollapsed })}>
                {secondCollapsed ? 'Expand ▸' : 'Collapse ▾'}
              </button>
            </div>

            {!secondCollapsed && (
              <div className="subtask-cols">
                <span /><span className="col-label">Task</span>
                <span className="col-label">Responsible</span>
                <span className="col-label">Hrs</span>
                <span className="col-label">Type</span>
                <span className="col-label col-label--right">Line Cost</span>
              </div>
            )}

            {secondTaskSections.map(section => (
              <div key={section.key} className="phase-section">
                <div className={`phase-section-header phase-section-header--${section.key}`}>
                  {SECTION_LABELS[section.key]}
                </div>
                {section.tasks.map(task => (
                  <SubtaskRow key={`s2-${task.id}`} task={task} catKey={catKey} addedMin={additionalMinutes}
                    onToggle={()                  => onUpdateSecondStateTask(task.id, { included: !task.included })}
                    onNameChange={v               => onUpdateSecondStateTask(task.id, { name: v })}
                    onUpdateAssignees={assignees  => onUpdateSecondStateTask(task.id, { assignees })}
                    onTypeChange={v               => onUpdateSecondStateTask(task.id, { type: v })}
                    onMonthsChange={v             => onUpdateSecondStateTask(task.id, { months: v })}
                  />
                ))}
              </div>
            ))}

            {secondCollapsed && secondHiddenCount > 0 && (
              <>
                <p className="collapsed-count-hint">… {secondHiddenCount} more subtasks (all visible while expanded) …</p>
                <div className="expand-prompt">
                  <button type="button" className="expand-link"
                    onClick={() => onUpdateSecondState({ collapsed: false })}>
                    Expand to see the other {secondHiddenCount} subtasks and add / remove
                  </button>
                </div>
              </>
            )}

            {!secondCollapsed && (
              <div className="add-remove-row">
                <button type="button" className="btn-add"    onClick={onAddSecondStateTask}>+ Add subtask</button>
                <button type="button" className="btn-remove" onClick={onRemoveSecondStateTask}>− Remove last subtask</button>
                <button type="button"
                  className={`btn-undo${canUndoSecond ? '' : ' btn-undo--disabled'}`}
                  onClick={onUndoSecondStateRemove} disabled={!canUndoSecond}>↩ Undo last removal</button>
              </div>
            )}

            {/* Second state subtotal */}
            <div className="second-state-subtotal">
              {hasSecondIncluded ? (
                <>
                  {Object.entries(secondMemberMap).map(([member, { hours, cost }]) => (
                    <div key={member} className="subtotal-member-line">
                      <span className="subtotal-member-desc">
                        {member}: {parseFloat(hours.toFixed(1))}h × ${RATES[member]}/hr
                      </span>
                      <span className="subtotal-member-cost">= {fmt(cost)}</span>
                    </div>
                  ))}
                  <div className="subtotal-final-line">
                    <span>Per-{unit} rate</span>
                    <span>{fmt(secondPerModule)}</span>
                  </div>
                  {extraModules > 1 && (
                    <div className="subtotal-final-line second-state-total-line">
                      <span>{moduleCount === 2 ? `${Unit} 2` : `${Unit}s 2–${moduleCount}`} subtotal (× {extraModules})</span>
                      <span>{fmt(secondTotalCost)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="subtotal-final-line">
                  <span>{moduleCount === 2 ? `${Unit} 2` : `${Unit}s 2–${moduleCount}`} subtotal</span>
                  <span className="subtotal-empty">No tasks selected</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ══ OVERALL TOTAL ═════════════════════════════════════ */}
        {hasMultiple && (
          <div className="overall-cat-total">
            {isMicrovideo ? (
              <>
                {additionalVideosCosts.map(({ video, cost }, idx) => (
                  <div key={video.id} className="subtotal-final-line">
                    <span>Video {idx + 2} ({video.minutes} min)</span>
                    <span>{fmt(cost)}</span>
                  </div>
                ))}
                {wellsaidChecked && (
                  <div className="subtotal-ada-line">
                    <span>{wellsaidLabel}</span>
                    <span>+ {fmt(wellsaidCost)}</span>
                  </div>
                )}
                <div className="overall-total-line">
                  <span>{label} total — {additionalVideos.length + 1} videos</span>
                  <span>{fmt(mod1BaseSum + additionalVideosTotalCost + wellsaidCost)}</span>
                </div>
              </>
            ) : (
              <>
                {adaAmount > 0 && (
                  <div className="subtotal-ada-line">
                    <span>ADA +10% on {fmt(adaEligibleCombined)}</span>
                    <span>+ {fmt(adaAmount)}</span>
                  </div>
                )}
                {wellsaidChecked && (
                  <div className="subtotal-ada-line">
                    <span>{wellsaidLabel}</span>
                    <span>+ {fmt(wellsaidCost)}</span>
                  </div>
                )}
                <div className="overall-total-line">
                  <span>
                    {label} total — {moduleCount} {unit}{moduleCount > 1 ? 's' : ''}
                    {adaEnabled && hasAda ? ' (incl. ADA)' : ''}
                  </span>
                  <span>{fmt(overallTotal)}</span>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
