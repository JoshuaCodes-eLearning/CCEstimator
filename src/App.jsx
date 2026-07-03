import { useState, useEffect, useRef } from 'react'
import './App.css'
import CategoryBlock       from './components/CategoryBlock'
import TotalsBar           from './components/TotalsBar'
import ExportPreview       from './components/ExportPreview'
import EstimatesModal      from './components/EstimatesModal'
import ConfirmDialog       from './components/ConfirmDialog'
import LoginScreen         from './components/LoginScreen'
import ResetPasswordScreen from './components/ResetPasswordScreen'
import ChangePasswordModal from './components/ChangePasswordModal'
import AppHeader           from './components/AppHeader'
import { DEFAULT_TASKS, DEFAULT_SECOND_STATE_TASKS, DEFAULT_MINUTES, RATES, ADA_RATES, CAT_LABELS, MARGIN_OPTIONS, DEFAULT_MARGIN_PCT } from './config/config'
import { computeAssigneeHoursForTask } from './utils/calc'
import { supabase } from './lib/supabase'
import { buildEstimateRow, estimateDisplayName } from './utils/estimatePayload'

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
  // ── Auth ───────────────────────────────────────────────────
  // session: undefined = "checking on load", null = "signed out", object = "signed in"
  const [session,             setSession]             = useState(undefined)
  const [isRecovery,          setIsRecovery]          = useState(false)
  const [showChangePassword,  setShowChangePassword]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
      setSession(newSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  function handleSignOut() {
    supabase.auth.signOut()
  }

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

  // ── Save Estimate (DB) ────────────────────────────────────
  const [currentEstimateId, setCurrentEstimateId] = useState(null)
  const [saveDialog,  setSaveDialog]  = useState(null) // { type: 'new' } | { type: 'overwrite', existingName }
  const [isSaving,    setIsSaving]    = useState(false)
  const [justSaved,   setJustSaved]   = useState(false)
  const [saveToast,   setSaveToast]   = useState(null) // { message, isError }
  const [navGuard,    setNavGuard]    = useState(null) // null | 'view' — the "unsaved work" warning for View Estimates
  // Serialized snapshot of the meaningful state as of the last load/save —
  // NOT re-queried from the DB. Comparing against this in-memory string is
  // cheap (only computed at the moment of clicking View Estimates/Open) and
  // is what lets an untouched loaded estimate skip the warning entirely.
  const savedSnapshotRef = useRef(null)

  useEffect(() => {
    if (!saveToast) return
    const t = setTimeout(() => setSaveToast(null), 3500)
    return () => clearTimeout(t)
  }, [saveToast])

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

  // ── Save Estimate handlers ────────────────────────────────
  function currentRowPayload() {
    return buildEstimateRow({
      companyName, courseName, selected, selectedKeys, catStates,
      marginPct, liveHours, internalCost, clientPrice,
    })
  }

  function buildSnapshot(cs, sel, company, course, margin, hours) {
    return JSON.stringify({ catStates: cs, selected: sel, companyName: company, courseName: course, marginPct: margin, liveHours: hours })
  }

  function currentSnapshot() {
    return buildSnapshot(catStates, selected, companyName, courseName, marginPct, liveHours)
  }

  // Never saved this session → dirty iff there's a real in-progress estimate
  // (which, since View Estimates/Save don't even render without one, just
  // means a category is selected). Previously saved/loaded → dirty iff the
  // live state has actually diverged from the snapshot taken at that time.
  function hasUnsavedChanges() {
    if (currentEstimateId === null) return selectedKeys.length > 0
    return currentSnapshot() !== savedSnapshotRef.current
  }

  function cancelSaveDialog() {
    setSaveDialog(null)
    setIsSaving(false)
  }

  async function handleSaveClick() {
    if (isSaving) return
    setIsSaving(true)

    if (currentEstimateId === null) {
      setSaveDialog({ type: 'new' })
      return
    }

    const { data: existing, error } = await supabase
      .from('estimates')
      .select('id, company_name')
      .eq('id', currentEstimateId)
      .maybeSingle()

    if (error) {
      setSaveToast({ message: `Couldn't reach the database — ${error.message}`, isError: true })
      setIsSaving(false)
      return
    }

    if (!existing) {
      // Loaded/previous id no longer exists in the DB (e.g. deleted elsewhere) — treat as brand new.
      setSaveDialog({ type: 'new' })
      return
    }

    setSaveDialog({ type: 'overwrite', existingName: estimateDisplayName(existing.company_name) })
  }

  function finishSave(successMessage) {
    setSaveDialog(null)
    setJustSaved(true)
    setSaveToast({ message: successMessage })
    setTimeout(() => { setIsSaving(false); setJustSaved(false) }, 1800)
  }

  function failSave(error) {
    setSaveDialog(null)
    setSaveToast({ message: `Save failed — ${error.message}`, isError: true })
    setIsSaving(false)
  }

  // Shared by the normal Save Estimate dialog AND the silent "Save & Open" /
  // "Save & Continue" paths triggered from the unsaved-changes warnings below
  // — those warnings are themselves the user's confirmation, so no second
  // dialog here, just do the write and update the dirty-tracking snapshot.
  async function insertNewEstimate() {
    const row = { ...currentRowPayload(), is_closed: false, user_id: session?.user?.id ?? null }
    const { data, error } = await supabase.from('estimates').insert(row).select().single()
    if (error) throw error
    setCurrentEstimateId(data.id)
    savedSnapshotRef.current = currentSnapshot()
    return data
  }

  async function overwriteEstimate() {
    const row = currentRowPayload()
    const { data, error } = await supabase
      .from('estimates')
      .update(row)
      .eq('id', currentEstimateId)
      .select()
      .single()
    if (error) throw error
    savedSnapshotRef.current = currentSnapshot()
    return data
  }

  async function performInsert() {
    try {
      const data = await insertNewEstimate()
      finishSave(`Saved: "${estimateDisplayName(data.company_name)}"`)
    } catch (error) {
      failSave(error)
    }
  }

  async function performOverwrite() {
    try {
      const data = await overwriteEstimate()
      finishSave(`Saved: "${estimateDisplayName(data.company_name)}"`)
    } catch (error) {
      failSave(error)
    }
  }

  // ── Unsaved-changes navigation guards ─────────────────────
  function handleViewEstimatesClick() {
    if (hasUnsavedChanges()) setNavGuard('view')
    else setScreen('estimates')
  }

  async function handleSaveAndBrowse() {
    try {
      if (currentEstimateId === null) await insertNewEstimate()
      else await overwriteEstimate()
      setNavGuard(null)
      setScreen('estimates')
    } catch (error) {
      setSaveToast({ message: `Save failed — ${error.message}`, isError: true })
    }
  }

  function handleContinueWithoutSaving() {
    setNavGuard(null)
    setScreen('estimates')
  }

  async function handleSaveAndOpen(row) {
    try {
      if (currentEstimateId === null) await insertNewEstimate()
      else await overwriteEstimate()
      handleLoadEstimate(row)
    } catch (error) {
      setSaveToast({ message: `Save failed — ${error.message}`, isError: true })
    }
  }

  function handleDiscardAndOpen(row) {
    handleLoadEstimate(row)
  }

  // ── View Estimates callbacks (load / rename-sync / delete-sync) ──
  function handleLoadEstimate(row) {
    const state = row.state_json ?? {}
    const nextCatStates = state.catStates ?? catStates
    const nextSelected  = state.selected ?? selected
    // Company/Course come from the top-level columns, not state_json — inline
    // rename in View Estimates only ever updates those columns, so state_json's
    // copy can be stale if it was renamed since the last full Save.
    const nextCompany   = row.company_name ?? state.companyName ?? ''
    const nextCourse    = row.course_name ?? state.courseName ?? ''
    const nextMargin    = state.marginPct ?? DEFAULT_MARGIN_PCT
    const nextLiveHours = state.liveHours ?? ''

    setCatStates(nextCatStates)
    setSelected(nextSelected)
    setCompanyName(nextCompany)
    setCourseName(nextCourse)
    setMarginPct(nextMargin)
    setLiveHours(nextLiveHours)
    setCurrentEstimateId(row.id)
    // Computed from the values just set (not read back from state, which
    // wouldn't reflect these updates until next render) — this becomes the
    // dirty-check baseline for this estimate going forward.
    savedSnapshotRef.current = buildSnapshot(nextCatStates, nextSelected, nextCompany, nextCourse, nextMargin, nextLiveHours)
    setScreen('estimator')
  }

  function handleEstimateRenamed(id, patch) {
    if (id !== currentEstimateId) return
    if ('company_name' in patch) setCompanyName(patch.company_name)
    if ('course_name' in patch) setCourseName(patch.course_name)
  }

  function handleEstimateDeleted(id) {
    if (id === currentEstimateId) setCurrentEstimateId(null)
  }

  // ── Live training prediction (reference only, does not auto-fill module count) ──
  // Formula: 1 hr live = 40% × 60 = 24 min of eLearning
  const liveNum         = parseFloat(liveHours)
  const hasPrediction   = !isNaN(liveNum) && liveNum > 0
  const predictedMin    = hasPrediction ? Math.round(liveNum * 24) : null
  const predictedWhole  = hasPrediction ? Math.floor(predictedMin / 15) : null
  const predictedRem    = hasPrediction ? (predictedMin % 15) : null

  // ── Auth gate ──────────────────────────────────────────────
  // Nothing below this renders until signed in — this is a single-user
  // internal tool, so there's no case where the calculator itself should be
  // usable by someone who isn't Laurie, even if Save were disabled for them.
  if (session === undefined) {
    return (
      <div className="app">
        <header className="app-header">
          <span className="app-title">Cobblestone AI eLearning Estimator</span>
        </header>
      </div>
    )
  }

  if (isRecovery) {
    return <ResetPasswordScreen onDone={() => setIsRecovery(false)} />
  }

  if (!session) {
    return <LoginScreen />
  }

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
        onSignOut={handleSignOut}
        onChangePassword={() => setShowChangePassword(true)}
        changePasswordOpen={showChangePassword}
        onCloseChangePassword={() => setShowChangePassword(false)}
      />
    )
  }

  if (screen === 'estimates') {
    return (
      <EstimatesModal
        onBack={() => setScreen('estimator')}
        onLoad={handleLoadEstimate}
        onEstimateRenamed={handleEstimateRenamed}
        onEstimateDeleted={handleEstimateDeleted}
        hasUnsavedChanges={hasUnsavedChanges()}
        currentEstimateName={estimateDisplayName(companyName)}
        onSaveAndOpen={handleSaveAndOpen}
        onDiscardAndOpen={handleDiscardAndOpen}
        onSignOut={handleSignOut}
        onChangePassword={() => setShowChangePassword(true)}
        changePasswordOpen={showChangePassword}
        onCloseChangePassword={() => setShowChangePassword(false)}
      />
    )
  }

  return (
    <div className="app">
      <AppHeader
        screenLabel="Estimator"
        onSignOut={handleSignOut}
        onChangePassword={() => setShowChangePassword(true)}
      />

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
            onSave={handleSaveClick}
            onViewEstimates={handleViewEstimatesClick}
            onExport={() => setScreen('preview')}
            saveLabel={justSaved ? 'Saved ✓' : 'Save Estimate'}
            saveDisabled={isSaving}
          />
        )}

      </main>

      {saveDialog?.type === 'new' && (
        <ConfirmDialog
          title="Save Estimate"
          message={`Save "${estimateDisplayName(companyName)}" to your estimates?`}
          onDismiss={cancelSaveDialog}
          actions={[
            { label: 'Cancel',   kind: 'secondary', onClick: cancelSaveDialog },
            { label: 'Yes, Save', kind: 'primary',   onClick: performInsert },
          ]}
        />
      )}

      {saveDialog?.type === 'overwrite' && (
        <ConfirmDialog
          title="Save Estimate"
          message={`"${saveDialog.existingName}" already has a saved version. Overwrite it, or save this as a new related estimate?`}
          onDismiss={cancelSaveDialog}
          actions={[
            { label: 'Cancel',       kind: 'secondary', onClick: cancelSaveDialog },
            { label: 'Save As New',  kind: 'related',   onClick: performInsert },
            { label: 'Overwrite',    kind: 'primary',   onClick: performOverwrite },
          ]}
        />
      )}

      {navGuard === 'view' && (
        <ConfirmDialog
          title="Unsaved Changes"
          message={`You're currently working on "${estimateDisplayName(companyName)}". Save it before browsing, or continue without saving?`}
          onDismiss={() => setNavGuard(null)}
          actions={[
            { label: 'Cancel',                  kind: 'secondary', onClick: () => setNavGuard(null) },
            { label: 'Continue Without Saving', kind: 'related',   onClick: handleContinueWithoutSaving },
            { label: 'Save & Continue',         kind: 'primary',   onClick: handleSaveAndBrowse },
          ]}
        />
      )}

      {saveToast && (
        <div className={`save-toast${saveToast.isError ? ' save-toast--error' : ''}`}>
          {saveToast.message}
        </div>
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
