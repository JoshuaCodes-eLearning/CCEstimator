import { useState } from 'react'
import './App.css'
import CategoryBlock from './components/CategoryBlock'
import TotalsBar     from './components/TotalsBar'
import ExportPreview from './components/ExportPreview'
import { DEFAULT_TASKS, DEFAULT_SECOND_STATE_TASKS, DEFAULT_MINUTES, RATES, ADA_RATES, CAT_LABELS, MARGIN_OPTIONS, DEFAULT_MARGIN_PCT } from './config/config'
import { computeAssigneeHoursForTask } from './utils/calc'

export { CAT_LABELS }

const CAT_KEYS = ['microvideo', 'rise360', 'storyline360']

function initAssignees(assignees) {
  return (assignees ?? []).map(a => ({ ...a, baseHours: a.hours }))
}

function initCat(key) {
  return {
    collapsed:         true,
    additionalMinutes: 0,
    adaEnabled:        false,
    tasks: DEFAULT_TASKS[key].map(t => ({
      ...t,
      included:  true,
      assignees: initAssignees(t.assignees),
    })),
    removedStack: [],
    moduleCount:  1,
    additionalVideos: [],
    secondState: {
      collapsed:    true,
      tasks:        DEFAULT_SECOND_STATE_TASKS[key].map(t => ({
        ...t,
        assignees: initAssignees(t.assignees),
      })),
      removedStack: [],
    },
  }
}

const QUESTIONS = [
  'Is the course taught live? If so, how long is it and does that include time for activities and an exam?',
  'If the course is already created what tool was used? Do you have access to the original Rise or Storyline files?',
]

export default function App() {
  const [screen,        setScreen]        = useState('estimator')
  const [companyName,   setCompanyName]   = useState('')
  const [courseName,    setCourseName]    = useState('')
  const [liveHours,     setLiveHours]     = useState('')
  const [questionsOpen, setQuestionsOpen] = useState(false)
  const [selected,    setSelected]    = useState({
    microvideo: false, rise360: false, storyline360: false,
  })
  const [catStates, setCatStates] = useState(() => ({
    microvideo:   initCat('microvideo'),
    rise360:      initCat('rise360'),
    storyline360: initCat('storyline360'),
  }))
  const [marginPct, setMarginPct] = useState(DEFAULT_MARGIN_PCT)

  // ── Category selection ───────────────────────────────────
  function toggleCat(key) {
    setSelected(s => ({ ...s, [key]: !s[key] }))
  }

  // ── Category-level state ─────────────────────────────────
  function updateCat(key, patch) {
    setCatStates(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  // ── Task mutations ───────────────────────────────────────
  function updateTask(catKey, taskId, patch) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        tasks: prev[catKey].tasks.map(t => t.id === taskId ? { ...t, ...patch } : t),
      },
    }))
  }

  function addTask(catKey) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        collapsed: false,
        tasks: [
          ...prev[catKey].tasks,
          {
            id: `new-${Date.now()}`,
            name: 'New subtask',
            type: 'Fixed',
            included: true,
            assignees: [{ person: 'Megan', baseHours: 1, hours: 1 }],
          },
        ],
      },
    }))
  }

  function removeLastTask(catKey) {
    setCatStates(prev => {
      const tasks = prev[catKey].tasks
      if (tasks.length === 0) return prev
      const removed = tasks[tasks.length - 1]
      return {
        ...prev,
        [catKey]: {
          ...prev[catKey],
          tasks:        tasks.slice(0, -1),
          removedStack: [...prev[catKey].removedStack, removed],
        },
      }
    })
  }

  function undoLastRemove(catKey) {
    setCatStates(prev => {
      const stack = prev[catKey].removedStack
      if (stack.length === 0) return prev
      const restored = stack[stack.length - 1]
      return {
        ...prev,
        [catKey]: {
          ...prev[catKey],
          tasks:        [...prev[catKey].tasks, restored],
          removedStack: stack.slice(0, -1),
        },
      }
    })
  }

  // ── Second state mutations ───────────────────────────────
  function updateSecondState(catKey, patch) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: { ...prev[catKey], secondState: { ...prev[catKey].secondState, ...patch } },
    }))
  }

  function updateSecondStateTask(catKey, taskId, patch) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        secondState: {
          ...prev[catKey].secondState,
          tasks: prev[catKey].secondState.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t),
        },
      },
    }))
  }

  function addSecondStateTask(catKey) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        secondState: {
          ...prev[catKey].secondState,
          collapsed: false,
          tasks: [
            ...prev[catKey].secondState.tasks,
            {
              id: `new-s-${Date.now()}`,
              name: 'New subtask',
              type: 'Fixed',
              included: true,
              assignees: [{ person: 'Megan', baseHours: 1, hours: 1 }],
            },
          ],
        },
      },
    }))
  }

  function removeLastSecondStateTask(catKey) {
    setCatStates(prev => {
      const tasks = prev[catKey].secondState.tasks
      if (tasks.length === 0) return prev
      const removed = tasks[tasks.length - 1]
      return {
        ...prev,
        [catKey]: {
          ...prev[catKey],
          secondState: {
            ...prev[catKey].secondState,
            tasks:        tasks.slice(0, -1),
            removedStack: [...prev[catKey].secondState.removedStack, removed],
          },
        },
      }
    })
  }

  function undoLastSecondStateRemove(catKey) {
    setCatStates(prev => {
      const stack = prev[catKey].secondState.removedStack
      if (stack.length === 0) return prev
      const restored = stack[stack.length - 1]
      return {
        ...prev,
        [catKey]: {
          ...prev[catKey],
          secondState: {
            ...prev[catKey].secondState,
            tasks:        [...prev[catKey].secondState.tasks, restored],
            removedStack: stack.slice(0, -1),
          },
        },
      }
    })
  }

  // ── Additional video mutations (microvideo only) ─────────
  function addVideo(catKey) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        additionalVideos: [
          ...prev[catKey].additionalVideos,
          { id: `vid-${Date.now()}`, minutes: DEFAULT_MINUTES[catKey] },
        ],
      },
    }))
  }

  function removeVideo(catKey, videoId) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        additionalVideos: prev[catKey].additionalVideos.filter(v => v.id !== videoId),
      },
    }))
  }

  function updateVideoMinutes(catKey, videoId, mins) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        additionalVideos: prev[catKey].additionalVideos.map(v =>
          v.id === videoId ? { ...v, minutes: mins } : v
        ),
      },
    }))
  }

  // ── Compute totals ───────────────────────────────────────
  const selectedKeys = CAT_KEYS.filter(k => selected[k])

  const memberHours   = { Megan: 0, Michelle: 0, Laurie: 0, 'QA Resource': 0 }
  const categoryCosts = {}

  for (const catKey of selectedKeys) {
    const cat = catStates[catKey]

    if (catKey === 'microvideo') {
      let totalCost = 0
      for (const task of cat.tasks) {
        if (!task.included) continue
        for (const a of task.assignees ?? []) {
          const h = computeAssigneeHoursForTask(a, task, catKey, cat.additionalMinutes)
          if (memberHours[a.person] !== undefined) memberHours[a.person] += h
          totalCost += h * (RATES[a.person] ?? 0)
        }
      }
      for (const video of (cat.additionalVideos ?? [])) {
        const addedMin = video.minutes - DEFAULT_MINUTES[catKey]
        for (const task of (cat.secondState?.tasks ?? [])) {
          if (!task.included) continue
          for (const a of task.assignees ?? []) {
            const h = computeAssigneeHoursForTask(a, task, catKey, addedMin)
            if (memberHours[a.person] !== undefined) memberHours[a.person] += h
            totalCost += h * (RATES[a.person] ?? 0)
          }
        }
      }
      categoryCosts[catKey] = totalCost
    } else {
      const extraModules = (cat.moduleCount ?? 1) - 1
      let mod1BaseSum = 0
      for (const task of cat.tasks) {
        if (!task.included) continue
        for (const a of task.assignees ?? []) {
          const h = computeAssigneeHoursForTask(a, task, catKey, cat.additionalMinutes)
          if (memberHours[a.person] !== undefined) memberHours[a.person] += h
          mod1BaseSum += h * (RATES[a.person] ?? 0)
        }
      }
      let mod2PerModule = 0
      if (extraModules > 0 && cat.secondState) {
        for (const task of cat.secondState.tasks) {
          if (!task.included) continue
          for (const a of task.assignees ?? []) {
            const h = computeAssigneeHoursForTask(a, task, catKey, cat.additionalMinutes)
            if (memberHours[a.person] !== undefined) memberHours[a.person] += h * extraModules
            mod2PerModule += h * (RATES[a.person] ?? 0)
          }
        }
      }
      const combinedBase = mod1BaseSum + mod2PerModule * extraModules
      const adaRate = (cat.adaEnabled && ADA_RATES[catKey] > 0) ? ADA_RATES[catKey] : 0
      categoryCosts[catKey] = combinedBase * (1 + adaRate)
    }
  }

  const internalCost     = selectedKeys.reduce((s, k) => s + (categoryCosts[k] ?? 0), 0)
  const marginMultiplier = 1 / (1 - marginPct / 100)
  const clientPrice      = internalCost * marginMultiplier

  const activeMembers = Object.fromEntries(
    Object.entries(memberHours).filter(([, h]) => h > 0)
  )

  // ── Live training prediction (reference only, does not auto-fill module count) ──
  // Formula: 1 hr live = 40% × 60 = 24 min of eLearning
  const liveNum         = parseFloat(liveHours)
  const hasPrediction   = !isNaN(liveNum) && liveNum > 0
  const predictedMin    = hasPrediction ? Math.round(liveNum * 24) : null
  const predictedWhole  = hasPrediction ? Math.floor(predictedMin / 15) : null
  const predictedRem    = hasPrediction ? (predictedMin % 15) : null

  // ── Screens ──────────────────────────────────────────────
  if (screen === 'preview') {
    return (
      <ExportPreview
        companyName={companyName}
        courseName={courseName}
        selectedKeys={selectedKeys}
        catStates={catStates}
        memberHours={activeMembers}
        internalCost={internalCost}
        clientPrice={clientPrice}
        marginPct={marginPct}
        onBack={() => setScreen('estimator')}
      />
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Cobblestone AI eLearning Estimator</span>
        <span className="screen-label">Estimator</span>
      </header>

      <main className="app-main">

        <div className="project-card">
          <div className="field-group">
            <div>
              <label className="field-label">Company Name</label>
              <input className="field-input" type="text"
                placeholder="e.g. Acme Corp"
                value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Course Name</label>
              <input className="field-input" type="text"
                placeholder="e.g. Workplace Safety Basics"
                value={courseName} onChange={e => setCourseName(e.target.value)} />
            </div>
          </div>

          <div className="questions-panel">
            <button type="button" className="questions-toggle"
              onClick={() => setQuestionsOpen(v => !v)}>
              <span>Questions to ask customer</span>
              <span className="questions-chevron">{questionsOpen ? '▾' : '▸'}</span>
            </button>
            {questionsOpen && (
              <ol className="questions-list">
                {QUESTIONS.map((q, i) => <li key={i}>{q}</li>)}
              </ol>
            )}
          </div>

          <div className="live-training-group">
            <label className="field-label">How many hours of live training</label>
            <div className="live-training-row">
              <input className="field-input live-training-input" type="text" inputMode="decimal"
                placeholder="e.g. 2"
                value={liveHours}
                onChange={e => setLiveHours(e.target.value)} />
              {hasPrediction && (
                <span className="live-training-prediction">
                  ~{predictedMin} min of eLearning &nbsp;·&nbsp;
                  {predictedWhole === 0
                    ? `${predictedRem} min (less than 1 module)`
                    : predictedRem === 0
                      ? `~${predictedWhole} module${predictedWhole !== 1 ? 's' : ''} at 15 min`
                      : `~${predictedWhole} module${predictedWhole !== 1 ? 's' : ''} + ${predictedRem} additional min`}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="categories-section">
          <p className="categories-label">
            Select categories — only checked ones appear below
          </p>
          <div className="category-chips">
            {CAT_KEYS.map(key => (
              <button key={key} type="button"
                className={`cat-chip${selected[key] ? ' cat-chip--selected' : ''}`}
                onClick={() => toggleCat(key)}
              >
                <span className="cat-chip-check">{selected[key] ? '✓' : ''}</span>
                <span className="cat-chip-name">{CAT_LABELS[key]}</span>
                <span className="cat-chip-meta">
                  {selected[key]
                    ? `${DEFAULT_MINUTES[key] + catStates[key].additionalMinutes} min`
                    : 'not shown'}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="blocks">
          {CAT_KEYS.map(key =>
            selected[key] ? (
              <CategoryBlock
                key={key}
                catKey={key}
                label={CAT_LABELS[key]}
                cat={catStates[key]}
                hasAda={key !== 'microvideo'}
                onUpdate={patch                  => updateCat(key, patch)}
                onUpdateTask={(id, patch)        => updateTask(key, id, patch)}
                onAddTask={()                    => addTask(key)}
                onRemoveTask={()                 => removeLastTask(key)}
                onUndoRemove={()                 => undoLastRemove(key)}
                canUndo={catStates[key].removedStack.length > 0}
                onUpdateSecondState={patch                  => updateSecondState(key, patch)}
                onUpdateSecondStateTask={(id, patch)        => updateSecondStateTask(key, id, patch)}
                onAddSecondStateTask={()                    => addSecondStateTask(key)}
                onRemoveSecondStateTask={()                 => removeLastSecondStateTask(key)}
                onUndoSecondStateRemove={()                 => undoLastSecondStateRemove(key)}
                canUndoSecond={catStates[key].secondState.removedStack.length > 0}
                onAddVideo={()                              => addVideo(key)}
                onRemoveVideo={videoId                      => removeVideo(key, videoId)}
                onUpdateVideoMinutes={(videoId, mins)       => updateVideoMinutes(key, videoId, mins)}
              />
            ) : null
          )}
        </div>

        {selectedKeys.length > 0 && (
          <TotalsBar
            memberHours={activeMembers}
            categoryCosts={categoryCosts}
            selectedKeys={selectedKeys}
            internalCost={internalCost}
            clientPrice={clientPrice}
            marginPct={marginPct}
            marginOptions={MARGIN_OPTIONS}
            onMarginChange={setMarginPct}
            onExport={() => setScreen('preview')}
          />
        )}

      </main>
    </div>
  )
}
