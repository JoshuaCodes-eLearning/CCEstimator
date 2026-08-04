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
import { DEFAULT_TASKS, DEFAULT_SECOND_STATE_TASKS, LOCALIZATION_TASKS, LOCALIZATION_PM_CORE_TASKS, LOCALIZATION_PM_CORE_SECOND_STATE_TASKS, DEFAULT_MINUTES, RATES, ADA_RATES, VALIDATOR_WORD_RATES, CAT_LABELS, MARGIN_OPTIONS, DEFAULT_MARGIN_PCT } from './config/config'
import { computeAssigneeHoursForTask, computeHours, expenseCostForCategory, validatorWordsCost, visibleNormalTasks, visibleSecondStateTasks, computePhaseTotals, assigneeRate } from './utils/calc'
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
      included:  t.forceUnchecked ? false : true,
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
    // Localization add-on (added 2026-08) — off by default; mode stays null
    // until Laurie picks Existing/New Course. validatorLanguage defaults to
    // Spanish (matches the hardcoded default validator seat in
    // LOCALIZATION_TASKS) rather than requiring an explicit first pick.
    // Applies once per category regardless of module/video count, same as
    // ADA/WellSaid.
    localizationEnabled: false,
    localizationMode:    null, // null | 'existing' | 'new'
    validatorLanguage:   'spanish', // 'spanish' | 'french'
    localization: {
      tasks: LOCALIZATION_TASKS[key].map(t => ({
        ...t,
        included:  true,
        assignees: initAssignees(t.assignees),
      })),
    },
    // Old (localization) hours for Project Management/Monitoring/Comms —
    // Rise 360 and Storyline 360 only (added 2026-08). Null for Microvideo
    // (and anything else without an entry in LOCALIZATION_PM_CORE_TASKS),
    // which visibleNormalTasks()/visibleSecondStateTasks() in calc.js treat
    // as "no override, use the legacy projectManagementCore filter instead".
    localizationPmCore: LOCALIZATION_PM_CORE_TASKS[key]?.length ? {
      tasks: LOCALIZATION_PM_CORE_TASKS[key].map(t => ({
        ...t,
        included:  true,
        assignees: initAssignees(t.assignees),
      })),
      secondStateTasks: LOCALIZATION_PM_CORE_SECOND_STATE_TASKS[key].map(t => ({
        ...t,
        assignees: initAssignees(t.assignees),
      })),
    } : null,
  }
}

// Old saved estimates predate the WellSaid task and won't have it in their
// stored catStates — add it back in (unchecked) so it's still toggleable
// after reopening. Scoped narrowly to this one task id, not a general
// migration, so it can't reintroduce any other default task Laurie removed.
function backfillWellsaid(nextCatStates) {
  const result = { ...nextCatStates }
  for (const key of CAT_KEYS) {
    const cat = result[key]
    if (!cat) continue
    const defaultWellsaid       = DEFAULT_TASKS[key].find(t => t.type === 'Expense')
    const defaultSecondWellsaid = DEFAULT_SECOND_STATE_TASKS[key].find(t => t.type === 'Expense')
    if (!defaultWellsaid) continue
    const hasWellsaid       = cat.tasks?.some(t => t.type === 'Expense')
    const secondHasWellsaid = cat.secondState?.tasks?.some(t => t.type === 'Expense')
    if (hasWellsaid && secondHasWellsaid) continue
    result[key] = {
      ...cat,
      tasks: hasWellsaid
        ? cat.tasks
        : [...cat.tasks, { ...defaultWellsaid, assignees: initAssignees(defaultWellsaid.assignees) }],
      secondState: {
        ...cat.secondState,
        tasks: secondHasWellsaid
          ? cat.secondState.tasks
          : [...(cat.secondState?.tasks ?? []), { ...defaultSecondWellsaid, assignees: initAssignees(defaultSecondWellsaid.assignees) }],
      },
    }
  }
  return result
}

// Old saved estimates predate the Localization add-on entirely — add it back
// in (disabled, empty task list) so the category still renders correctly
// after reopening. Same narrow, per-category pattern as backfillWellsaid().
function backfillLocalization(nextCatStates) {
  const result = { ...nextCatStates }
  for (const key of CAT_KEYS) {
    const cat = result[key]
    if (!cat || cat.localization) continue
    result[key] = {
      ...cat,
      localizationEnabled: cat.localizationEnabled ?? false,
      localizationMode:    cat.localizationMode ?? null,
      validatorLanguage:   cat.validatorLanguage ?? 'spanish',
      localization: {
        tasks: LOCALIZATION_TASKS[key].map(t => ({
          ...t,
          included:  true,
          assignees: initAssignees(t.assignees),
        })),
      },
    }
  }
  return result
}

// Old saved estimates predate the customizable Flat Rate / Hourly Rate
// validator fields (added 2026-08) — without this, r-loc-validate/
// s-loc-validate1's flatRate and s-loc-validate2's validator hourlyRate stay
// undefined, so their rate inputs simply don't render (SubtaskRow only shows
// them when the field is present) until backfilled. Seeds sensible defaults
// from the category's own validatorLanguage at save time. Rise/Storyline
// only, same scope as the rate-customization feature itself.
function backfillValidatorRates(nextCatStates) {
  const result = { ...nextCatStates }
  for (const key of ['rise360', 'storyline360']) {
    const cat = result[key]
    if (!cat?.localization?.tasks) continue
    const lang = cat.validatorLanguage ?? 'spanish'
    const validatorName = lang === 'french' ? 'QA French' : 'QA Spanish'
    result[key] = {
      ...cat,
      localization: {
        ...cat.localization,
        tasks: cat.localization.tasks.map(t => {
          if (t.validatorWords && t.flatRate === undefined) {
            return { ...t, flatRate: VALIDATOR_WORD_RATES[lang] ?? 0 }
          }
          if (t.validatorAssigneeIndex !== undefined) {
            const idx = t.validatorAssigneeIndex
            const seat = t.assignees?.[idx]
            if (seat && seat.hourlyRate === undefined) {
              return {
                ...t,
                assignees: t.assignees.map((a, i) =>
                  i === idx ? { ...a, hourlyRate: RATES[a.person ?? validatorName] ?? 0 } : a
                ),
              }
            }
          }
          return t
        }),
      },
    }
  }
  return result
}

// Old saved estimates predate the Localization PM-core hours split (2026-08)
// entirely — add the old-hours Project Management/Monitoring/Comms sub-state
// back in so Existing Course mode (and New Course's extra Localization-section
// rows) render with the right numbers after reopening. Same narrow,
// per-category pattern as backfillLocalization(); null for Microvideo, same
// as a freshly-initCat'd category.
function backfillLocalizationPmCore(nextCatStates) {
  const result = { ...nextCatStates }
  for (const key of CAT_KEYS) {
    const cat = result[key]
    if (!cat || cat.localizationPmCore !== undefined) continue
    result[key] = {
      ...cat,
      localizationPmCore: LOCALIZATION_PM_CORE_TASKS[key]?.length ? {
        tasks: LOCALIZATION_PM_CORE_TASKS[key].map(t => ({
          ...t,
          included:  true,
          assignees: initAssignees(t.assignees),
        })),
        secondStateTasks: LOCALIZATION_PM_CORE_SECOND_STATE_TASKS[key].map(t => ({
          ...t,
          assignees: initAssignees(t.assignees),
        })),
      } : null,
    }
  }
  return result
}

// Self-heals a legacy limbo state from before the Localization toggle
// auto-defaulted its mode (see CategoryBlock.jsx's toggle onClick) — an
// estimate saved between when Localization shipped and that fix could have
// localizationEnabled: true with localizationMode still null, which used to
// mean localization silently counted in the exported Word doc/preview
// (gated only on the toggle) while the live screen correctly showed nothing
// (gated on toggle + mode) — a real cost discrepancy between the two. Now
// that both are gated on toggle + mode, resolving the missing mode here
// keeps a reopened estimate showing/costing exactly what re-toggling it on
// today would.
function backfillLocalizationMode(nextCatStates) {
  const result = { ...nextCatStates }
  for (const key of CAT_KEYS) {
    const cat = result[key]
    if (!cat || !cat.localizationEnabled || cat.localizationMode) continue
    result[key] = { ...cat, localizationMode: 'existing' }
  }
  return result
}

// Old saved estimates predate the `phase` field (added 2026-07) entirely —
// without it, computePhaseTotals() dumps 100% of that estimate's cost into
// "Development" (its documented fallback for untagged tasks), even though
// the estimate really did have Design/QA/PM work in it. Most pre-restructure
// task ids are unchanged (only renamed — QA 1/2, Image Procurement, etc.),
// so their real phase can be recovered by id from the current config. A
// handful of ids were retired entirely in the 2026-08 restructure (Lessons
// Learned / Internal Meetings / Project Coordination, folded into the new
// Project Monitoring task) and no longer exist anywhere to look up — those
// were always project-management work, so they're mapped straight to 'pm'
// rather than falling through to the generic development default.
const LEGACY_PM_TASK_IDS = [
  'mv-8', 'mv-4', 'mv-11',
  'r-9',  'r-3',  'r-13',
  's-9',  's-3',  's-13',
]

function phaseForLegacyTask(task, key) {
  if (task.phase) return task.phase
  if (LEGACY_PM_TASK_IDS.includes(task.id)) return 'pm'
  return DEFAULT_TASKS[key].find(t => t.id === task.id)?.phase
    ?? DEFAULT_SECOND_STATE_TASKS[key].find(t => t.id === task.id)?.phase
    ?? LOCALIZATION_TASKS[key].find(t => t.id === task.id)?.phase
    ?? null // truly custom/unrecognized (a user's own "+ Add subtask" row) —
             // left untagged, same as it is today; computePhaseTotals()'s own
             // 'development' fallback still applies to these.
}

function backfillPhase(nextCatStates) {
  const result = { ...nextCatStates }
  for (const key of CAT_KEYS) {
    const cat = result[key]
    if (!cat) continue
    const fixTasks = tasks => (tasks ?? []).map(t => {
      const phase = phaseForLegacyTask(t, key)
      return phase && phase !== t.phase ? { ...t, phase } : t
    })
    result[key] = {
      ...cat,
      tasks:       fixTasks(cat.tasks),
      secondState: { ...cat.secondState, tasks: fixTasks(cat.secondState?.tasks) },
      localization: cat.localization
        ? { ...cat.localization, tasks: fixTasks(cat.localization.tasks) }
        : cat.localization,
    }
  }
  return result
}

// All of these live under one "Questions to ask customer" panel — they're a
// reminder script for Laurie's discovery call, not separate form sections.
// Answer input type matches the question: free text for open/multi-part
// questions, a number field for the one purely-numeric question, a Yes/No
// dropdown for the one binary question.

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
  const [clientName,    setClientName]    = useState('')
  const [courseName,    setCourseName]    = useState('')
  const [liveHours,     setLiveHours]     = useState('')
  const [questionsOpen, setQuestionsOpen] = useState(false)
  const [liveCourseAnswer,  setLiveCourseAnswer]  = useState('')
  const [existingToolAnswer, setExistingToolAnswer] = useState('')
  const [hasPptsWebinars, setHasPptsWebinars] = useState('')
  const [elearningLiked,  setElearningLiked]  = useState('')
  // Creation date of the currently loaded estimate (from the DB row's
  // created_at) — null for a never-saved estimate, in which case export
  // falls back to "today". Immutable across re-saves, unlike updated_at.
  const [loadedCreatedAt, setLoadedCreatedAt] = useState(null)
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

  // ── Localization mutations ────────────────────────────────
  function updateLocalizationTask(catKey, taskId, patch) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        localization: {
          ...prev[catKey].localization,
          tasks: prev[catKey].localization.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t),
        },
      },
    }))
  }

  // Old-hours PM/Monitoring/Comms tasks (Rise/Storyline only, see
  // LOCALIZATION_PM_CORE_TASKS in config.js) live in their own sub-state
  // rather than cat.tasks/cat.localization.tasks — they need their own
  // update handlers so edits land in the right array regardless of which
  // visual role (Existing Course replacement vs. New Course's extra
  // Localization-section rows) they're currently playing.
  function updateLocalizationPmCoreTask(catKey, taskId, patch) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        localizationPmCore: {
          ...prev[catKey].localizationPmCore,
          tasks: prev[catKey].localizationPmCore.tasks.map(t => t.id === taskId ? { ...t, ...patch } : t),
        },
      },
    }))
  }

  function updateLocalizationPmCoreSecondStateTask(catKey, taskId, patch) {
    setCatStates(prev => ({
      ...prev,
      [catKey]: {
        ...prev[catKey],
        localizationPmCore: {
          ...prev[catKey].localizationPmCore,
          secondStateTasks: prev[catKey].localizationPmCore.secondStateTasks.map(t => t.id === taskId ? { ...t, ...patch } : t),
        },
      },
    }))
  }

  function setLocalizationLanguage(catKey, language) {
    setCatStates(prev => {
      const cat = prev[catKey]
      const validatorName = language === 'spanish' ? 'QA Spanish' : language === 'french' ? 'QA French' : null
      const newFlatRate   = VALIDATOR_WORD_RATES[language] ?? 0
      const newHourlyRate = RATES[validatorName] ?? 0
      return {
        ...prev,
        [catKey]: {
          ...cat,
          validatorLanguage: language,
          localization: {
            ...cat.localization,
            // Keep every validator seat in sync with the category's single
            // language choice — the validator is always a plain assignee
            // under the hood, so nothing else needs to know this happened.
            // Customizable Flat Rate/Hourly Rate (added 2026-08) reset to the
            // new language's table default too — switching language swaps the
            // whole Fiverr resource, so a rate Laurie typed in for the old
            // one shouldn't silently carry over onto the new one.
            tasks: cat.localization.tasks.map(t => {
              if (!validatorName) return t
              if (t.validatorWords && t.flatRate !== undefined) {
                return { ...t, flatRate: newFlatRate }
              }
              if (t.validatorAssigneeIndex !== undefined) {
                return {
                  ...t,
                  assignees: t.assignees.map((a, i) =>
                    i === t.validatorAssigneeIndex
                      ? { ...a, person: validatorName, ...(a.hourlyRate !== undefined ? { hourlyRate: newHourlyRate } : {}) }
                      : a
                  ),
                }
              }
              return t
            }),
          },
        },
      }
    })
  }

  // ── Compute totals ───────────────────────────────────────
  const selectedKeys = CAT_KEYS.filter(k => selected[k])

  const memberHours    = { Megan: 0, Michelle: 0, Laurie: 0, 'QA Resource': 0, 'QA Spanish': 0, 'QA French': 0 }
  // Real dollar cost per member, tracked alongside memberHours — needed
  // because a validator seat's hourlyRate (added 2026-08) can override the
  // shared RATES table per task instance, so "hours × RATES[name]" is no
  // longer reliably the true cost for that member. memberCost is the single
  // source of truth for both the displayed effective $/hr (cost/hours) and
  // the dollar subtotal wherever per-member rate is shown (export docs).
  const memberCost     = { Megan: 0, Michelle: 0, Laurie: 0, 'QA Resource': 0, 'QA Spanish': 0, 'QA French': 0 }
  // Flat per-1000-words validator fees (Rise's Validate, Storyline's
  // Validation #1) have no assignee hours — tracked separately so "Hours per
  // team member" can still surface this real cost against the QA person it's
  // actually paid to, instead of it only showing up buried in the category total.
  const memberWordCost = { 'QA Spanish': 0, 'QA French': 0 }
  const categoryCosts  = {}

  function validatorNameFor(cat) {
    return cat.validatorLanguage === 'french' ? 'QA French'
      : cat.validatorLanguage === 'spanish' ? 'QA Spanish'
      : null
  }

  for (const catKey of selectedKeys) {
    const cat = catStates[catKey]
    const normalTasks = visibleNormalTasks(cat)
    const secondTasks = visibleSecondStateTasks(cat)

    if (catKey === 'microvideo') {
      let totalCost = 0
      for (const task of normalTasks) {
        if (!task.included) continue
        if (task.type === 'PerUnit') {
          const h = computeHours(task, catKey, cat.additionalMinutes)
          const person = task.assignees?.[0]?.person
          const c = h * (RATES[person] ?? 0)
          if (memberHours[person] !== undefined) memberHours[person] += h
          if (memberCost[person] !== undefined) memberCost[person] += c
          totalCost += c
          continue
        }
        for (const a of task.assignees ?? []) {
          const h = computeAssigneeHoursForTask(a, task, catKey, cat.additionalMinutes)
          const c = h * assigneeRate(a)
          if (memberHours[a.person] !== undefined) memberHours[a.person] += h
          if (memberCost[a.person] !== undefined) memberCost[a.person] += c
          totalCost += c
        }
        if (task.validatorWords) {
          const wc = validatorWordsCost(task, cat)
          totalCost += wc
          const validatorName = validatorNameFor(cat)
          if (validatorName) memberWordCost[validatorName] += wc
        }
      }
      for (const video of (cat.additionalVideos ?? [])) {
        const addedMin = video.minutes - DEFAULT_MINUTES[catKey]
        for (const task of secondTasks) {
          if (!task.included) continue
          for (const a of task.assignees ?? []) {
            const h = computeAssigneeHoursForTask(a, task, catKey, addedMin)
            const c = h * assigneeRate(a)
            if (memberHours[a.person] !== undefined) memberHours[a.person] += h
            if (memberCost[a.person] !== undefined) memberCost[a.person] += c
            totalCost += c
          }
        }
      }
      categoryCosts[catKey] = totalCost + expenseCostForCategory(cat)
    } else {
      const extraModules = (cat.moduleCount ?? 1) - 1
      // mod1BaseSum: every checked task's cost (incl. localization) — the
      // number shown as the category's subtotal. adaEligibleSum: the same,
      // minus anything tagged isLocalization — the only base ADA's % ever
      // multiplies, so the localization add-on stays exempt from it.
      let mod1BaseSum   = 0
      let adaEligibleSum = 0
      for (const task of normalTasks) {
        if (!task.included) continue
        if (task.type === 'PerUnit') {
          const h = computeHours(task, catKey, cat.additionalMinutes)
          const person = task.assignees?.[0]?.person
          if (memberHours[person] !== undefined) memberHours[person] += h
          const c = h * (RATES[person] ?? 0)
          if (memberCost[person] !== undefined) memberCost[person] += c
          mod1BaseSum += c
          if (!task.isLocalization) adaEligibleSum += c
          continue
        }
        for (const a of task.assignees ?? []) {
          const h = computeAssigneeHoursForTask(a, task, catKey, cat.additionalMinutes)
          if (memberHours[a.person] !== undefined) memberHours[a.person] += h
          const c = h * assigneeRate(a)
          if (memberCost[a.person] !== undefined) memberCost[a.person] += c
          mod1BaseSum += c
          if (!task.isLocalization) adaEligibleSum += c
        }
        if (task.validatorWords) {
          const wc = validatorWordsCost(task, cat)
          mod1BaseSum += wc
          const validatorName = validatorNameFor(cat)
          if (validatorName) memberWordCost[validatorName] += wc
        }
      }
      let mod2PerModule = 0
      if (extraModules > 0 && cat.secondState) {
        for (const task of secondTasks) {
          if (!task.included) continue
          for (const a of task.assignees ?? []) {
            const h = computeAssigneeHoursForTask(a, task, catKey, cat.additionalMinutes)
            const c = h * assigneeRate(a)
            if (memberHours[a.person] !== undefined) memberHours[a.person] += h * extraModules
            if (memberCost[a.person] !== undefined) memberCost[a.person] += c * extraModules
            mod2PerModule += c
          }
        }
      }
      const combinedBase        = mod1BaseSum + mod2PerModule * extraModules
      const adaEligibleCombined = adaEligibleSum + mod2PerModule * extraModules
      const adaRate = (cat.adaEnabled && ADA_RATES[catKey] > 0) ? ADA_RATES[catKey] : 0
      categoryCosts[catKey] = combinedBase + adaEligibleCombined * adaRate + expenseCostForCategory(cat)
    }
  }

  const internalCost     = selectedKeys.reduce((s, k) => s + (categoryCosts[k] ?? 0), 0)
  const marginMultiplier = 1 / (1 - marginPct / 100)
  const clientPrice      = internalCost * marginMultiplier
  const phaseTotals       = computePhaseTotals(selectedKeys, catStates)

  const activeMembers = Object.fromEntries(
    Object.entries(memberHours).filter(([, h]) => h > 0)
  )
  const activeWordCosts = Object.fromEntries(
    Object.entries(memberWordCost).filter(([, c]) => c > 0)
  )
  // Same active-only filter as activeMembers, keyed identically — the export
  // paths pair these up by name to derive each member's true effective $/hr
  // (memberCost/memberHours) instead of a static RATES lookup.
  const activeMemberCosts = Object.fromEntries(
    Object.entries(memberHours).filter(([, h]) => h > 0).map(([name]) => [name, memberCost[name] ?? 0])
  )

  // ── Save Estimate handlers ────────────────────────────────
  function currentRowPayload() {
    return buildEstimateRow({
      companyName, clientName, courseName, selected, selectedKeys, catStates,
      marginPct, liveHours, internalCost, clientPrice,
      hasPptsWebinars, elearningLiked, liveCourseAnswer, existingToolAnswer,
    })
  }

  function buildSnapshot(state) {
    return JSON.stringify(state)
  }

  function currentSnapshot() {
    return buildSnapshot({
      catStates, selected, companyName, clientName, courseName, marginPct, liveHours,
      hasPptsWebinars, elearningLiked, liveCourseAnswer, existingToolAnswer,
    })
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
    const row = { ...currentRowPayload(), is_closed: false, is_won: false, user_id: session?.user?.id ?? null }
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
    const nextCatStates = backfillPhase(backfillLocalizationMode(backfillLocalizationPmCore(backfillValidatorRates(backfillLocalization(backfillWellsaid(state.catStates ?? catStates))))))
    const nextSelected  = state.selected ?? selected
    // Company/Course/Client come from the top-level columns, not state_json —
    // inline rename in View Estimates only ever updates those columns, so
    // state_json's copy can be stale if it was renamed since the last full Save.
    const nextCompany   = row.company_name ?? state.companyName ?? ''
    const nextClient    = row.client_name ?? state.clientName ?? ''
    const nextCourse    = row.course_name ?? state.courseName ?? ''
    const nextMargin    = state.marginPct ?? DEFAULT_MARGIN_PCT
    const nextLiveHours = state.liveHours ?? ''
    const nextPpts      = state.hasPptsWebinars ?? ''
    const nextElearning = state.elearningLiked ?? ''
    const nextLiveCourseAnswer  = state.liveCourseAnswer ?? ''
    const nextExistingToolAnswer = state.existingToolAnswer ?? ''

    setCatStates(nextCatStates)
    setSelected(nextSelected)
    setCompanyName(nextCompany)
    setClientName(nextClient)
    setCourseName(nextCourse)
    setMarginPct(nextMargin)
    setLiveHours(nextLiveHours)
    setHasPptsWebinars(nextPpts)
    setElearningLiked(nextElearning)
    setLiveCourseAnswer(nextLiveCourseAnswer)
    setExistingToolAnswer(nextExistingToolAnswer)
    setLoadedCreatedAt(row.created_at ?? null)
    setCurrentEstimateId(row.id)
    // Computed from the values just set (not read back from state, which
    // wouldn't reflect these updates until next render) — this becomes the
    // dirty-check baseline for this estimate going forward.
    savedSnapshotRef.current = buildSnapshot({
      catStates: nextCatStates, selected: nextSelected, companyName: nextCompany,
      clientName: nextClient, courseName: nextCourse, marginPct: nextMargin,
      liveHours: nextLiveHours, hasPptsWebinars: nextPpts, elearningLiked: nextElearning,
      liveCourseAnswer: nextLiveCourseAnswer, existingToolAnswer: nextExistingToolAnswer,
    })
    setScreen('estimator')
  }

  function handleEstimateRenamed(id, patch) {
    if (id !== currentEstimateId) return
    if ('company_name' in patch) setCompanyName(patch.company_name)
    if ('client_name' in patch) setClientName(patch.client_name)
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
        clientName={clientName}
        courseName={courseName}
        estimateDate={loadedCreatedAt ? new Date(loadedCreatedAt) : new Date()}
        selectedKeys={selectedKeys}
        catStates={catStates}
        memberHours={activeMembers}
        memberWordCost={activeWordCosts}
        memberCost={activeMemberCosts}
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
        onViewEstimates={handleViewEstimatesClick}
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
              <label className="field-label">Client Name</label>
              <input className="field-input" type="text"
                placeholder="e.g. Jane Smith"
                value={clientName} onChange={e => setClientName(e.target.value)} />
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
                <li>
                  <p className="qbank-question">
                    Is the course taught live? If so, how long is it and does that include time for activities and an exam?
                  </p>
                  <input className="field-input" type="text"
                    placeholder="Notes from the call…"
                    value={liveCourseAnswer} onChange={e => setLiveCourseAnswer(e.target.value)} />
                </li>
                <li>
                  <p className="qbank-question">How many hours of live training?</p>
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
                </li>
                <li>
                  <p className="qbank-question">
                    If the course is already created what tool was used? Do you have access to the original Rise or Storyline files?
                  </p>
                  <input className="field-input" type="text"
                    placeholder="Notes from the call…"
                    value={existingToolAnswer} onChange={e => setExistingToolAnswer(e.target.value)} />
                </li>
                <li>
                  <p className="qbank-question">Do you have PPTs and Webinars we can use for estimate?</p>
                  <select className="field-select"
                    value={hasPptsWebinars} onChange={e => setHasPptsWebinars(e.target.value)}>
                    <option value="">Select…</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </li>
                <li>
                  <p className="qbank-question">What eLearning have you seen that you have liked?</p>
                  <input className="field-input" type="text"
                    placeholder="e.g. examples client shared"
                    value={elearningLiked} onChange={e => setElearningLiked(e.target.value)} />
                </li>
              </ol>
            )}
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
                onUpdateLocalizationTask={(id, patch)        => updateLocalizationTask(key, id, patch)}
                onUpdateLocalizationPmCoreTask={(id, patch)  => updateLocalizationPmCoreTask(key, id, patch)}
                onUpdateLocalizationPmCoreSecondStateTask={(id, patch) => updateLocalizationPmCoreSecondStateTask(key, id, patch)}
                onLocalizationLanguageChange={lang          => setLocalizationLanguage(key, lang)}
              />
            ) : null
          )}
        </div>

        {selectedKeys.length > 0 && (
          <TotalsBar
            memberHours={activeMembers}
            memberWordCost={activeWordCosts}
            categoryCosts={categoryCosts}
            phaseTotals={phaseTotals}
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
            { label: 'Yes, Save', kind: 'primary',   onClick: performInsert },
            { label: 'Cancel',    kind: 'secondary', onClick: cancelSaveDialog },
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
