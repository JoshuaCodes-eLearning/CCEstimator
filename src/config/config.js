// ============================================================
// CCEstimator — Central Configuration
// All rates, percentages, and default task data live here.
// ============================================================

export const RATES = {
  Megan:         50,
  Michelle:      65,
  Laurie:        75,
  'QA Resource': 50,
  'J.K.':        30,
  // Localization validators (added 2026-08) — real named resources, same as
  // anyone else in this table. "QA Spanish"/"QA French" are the two people
  // behind "Validator #1/#2" in Laurie's localization docs.
  'QA Spanish':  8,
  'QA French':   55,
}

// Localization validators' flat per-1000-words fee (added 2026-08) — kept
// separate from RATES since Fiverr-style word-count validation is priced per
// word, not per hour, even though QA Spanish/QA French are also real hourly
// people in RATES above for the hours-based validation steps (e.g.
// Storyline's Validation #2). Selected via each category's single
// validatorLanguage.
export const VALIDATOR_WORD_RATES = {
  spanish: 10,
  french:  55,
}

export const ADA_RATES = {
  microvideo:   0,
  rise360:      0.10,
  storyline360: 0.10,
}

export const MARGIN_OPTIONS     = [40, 45, 50]
export const DEFAULT_MARGIN_PCT = 50

export const CAT_LABELS = {
  microvideo:   'Microvideo',
  rise360:      'Rise 360',
  storyline360: 'Storyline 360',
}

export const DEFAULT_MINUTES = {
  microvideo:   5,
  rise360:      15,
  storyline360: 15,
}

// Phase buckets (added 2026-07 restructure) — every cost-bearing task maps to
// exactly one of these so Phase Totals reconciles to the same grand total as
// the existing member-hours totals. Tasks missing a `phase` (old saved
// estimates from before this existed, or a user's own "+ Add subtask" row)
// fall back to 'development' in computePhaseTotals() — see calc.js.
export const PHASE_LABELS = {
  design:      'Design',
  development: 'Development',
  qa:          'Quality Assurance',
  pm:          'Project Management',
}

export const PHASE_COLORS = {
  design:      '#3B82F6', // blue
  development: '#8B5CF6', // purple
  qa:          '#F59E0B', // amber
  pm:          '#10B981', // green
}

// ============================================================
// DEFAULT TASK DATA
// { id, name, type, phase, included?, indent?, assignees: [{ person, hours }] }
// included defaults true — set false to start unchecked.
// indent: 1|2 — visually nested under the row(s) above it, one level per
// step of numeric depth (Asset Procurement under Storyboard, Narration
// under Development, Project Monitoring under Project Management — all
// indent: 1). Communications is indent: 1 too (2026-08: reduced from 2) —
// it's a sibling of Project Monitoring under Project Management, not nested
// a level further inside it.
// type: 'Fixed' | 'Dynamic' | 'Expense'
// 'Expense' — a flat-dollar line item with no hours/assignees (flatCost +
// months fields instead — cost = flatCost × months, months defaults to 1).
// forceUnchecked: true — overrides initCat()'s normal "module 1
// always starts checked" rule (see App.jsx initCat) so this starts unchecked
// everywhere, module 1 included. Used for WellSaid and the optional
// bottom-of-list tasks (Logo Stinger, VEO3/Vyond, custom images/software
// sims, Sales meetings/SOW) — those already have included: false, which
// alone only controls the second-state default; forceUnchecked extends
// that to module 1 too.
//
// 2026-07 restructure — Project Management / Project Monitoring hours were
// originally PLACEHOLDERS pending final sign-off. Rise 360 and Storyline 360
// were CONFIRMED 2026-08: Project Management = Laurie 2 / Megan 2 / Michelle 1,
// Project Monitoring = Megan 4 / Michelle 1, Communications = Michelle 2 (all
// three, both categories). Microvideo was never part of that confirmation —
// its PM/Monitoring hours below are still the original placeholder, mechanically
// carried forward from its prior Internal Meetings / Project Coordination /
// Lessons Learned hours (Coordination → PM, Internal Meetings + 1h/participant
// Lessons Learned → Monitoring), Michelle dropped entirely per the "remove
// Michelle from the PM/Monitoring structure" rule that predated the 2026-08
// confirmation. Flag with Laurie before treating Microvideo's numbers as final.
//
// 2026-08 UPDATE — these three tasks now carry TWO separate hour sets for
// Rise 360 and Storyline 360 (Microvideo untouched — still the numbers above).
// The 2026-08-confirmed numbers above turned out to be the LOCALIZATION-only
// figures; a corrected, higher set of hours is the real default everywhere
// else. r-12/r-monitoring/r-comms and s-12/s-monitoring/s-comms below now hold
// the new default: Project Management = Laurie 6 / Megan 5 / Michelle 1,
// Project Monitoring = Megan 15 / Michelle 3, Communications = Michelle 2
// (unchanged). This default applies whenever a category is NOT in
// Localization + Existing Course mode — i.e. no Localization at all, or
// Localization + New Course. The original (smaller) numbers documented above
// still exist, unchanged, as LOCALIZATION_PM_CORE_TASKS further down this
// file — see that block's comment for how the two sets are actually used.
// ============================================================

export const DEFAULT_TASKS = {

  // ── MICROVIDEO (5 min default) ───────────────────────────
  microvideo: [
    {
      id: 'mv-2', name: 'Discovery', type: 'Fixed', phase: 'design',
      assignees: [{ person: 'Michelle', hours: 1 }],
    },
    {
      id: 'mv-hldd', name: 'High-Level Design Document (HLDD)', type: 'Dynamic', phase: 'design',
      assignees: [{ person: 'Michelle', hours: 1 }],
    },
    {
      id: 'mv-6', name: 'Storyboard', type: 'Dynamic', phase: 'development',
      assignees: [
        { person: 'Michelle', hours: 6  },
        { person: 'Megan',    hours: 10 },
      ],
    },
    {
      id: 'mv-ip', name: 'Asset Procurement – Images, videos, etc.', type: 'Dynamic', phase: 'development', indent: 1,
      assignees: [{ person: 'Megan', hours: 4 }],
    },
    {
      id: 'mv-5',
      name: 'Development: title, outro, AI narration, record screens, captions (VTT), QA/revisions, annotations, callouts, zooms',
      type: 'Dynamic', phase: 'development',
      assignees: [{ person: 'Megan', hours: 8 }],
    },
    {
      id: 'mv-vo', name: 'Narration – Acquire voice-over, download/edit VTT files, and select music', type: 'Fixed', phase: 'development', indent: 1,
      assignees: [{ person: 'Megan', hours: 2.5 }],
    },
    {
      id: 'mv-qa1', name: 'Quality Assurance Round 1', type: 'Fixed', phase: 'qa',
      assignees: [{ person: 'Megan', hours: 0.5 }],
    },
    {
      id: 'mv-qa2', name: 'Quality Assurance Round 2', type: 'Fixed', phase: 'qa',
      assignees: [{ person: 'QA Resource', hours: 2 }],
    },
    {
      // PLACEHOLDER — existing Laurie 9 + Megan 6 transferred from retired
      // Project Coordination (mv-11), plus Laurie's 3.5h moved here from
      // Project Monitoring below (Laurie is the Project Manager — her hours
      // belong under Project Management, not the Monitoring sub-task).
      // Confirm with Laurie.
      id: 'mv-10', name: 'Project Management – Create schedule, schedule updates, weekly reports, Status meetings, meetings, communication, project kick-off', type: 'Fixed', phase: 'pm', projectManagementCore: true,
      assignees: [
        { person: 'Laurie', hours: 12.5 },
        { person: 'Megan',  hours: 6    },
      ],
    },
    {
      // PLACEHOLDER — existing Internal Meetings (Megan 3.5) plus 1h from
      // retired Lessons Learned (mv-8). Laurie removed — her hours moved to
      // Project Management above (she's the PM; Monitoring/communications
      // are Megan's work). Michelle's former 2h + 1.25h dropped entirely per
      // the Michelle-removal rule. Replaces mv-4 (Internal meetings), mv-8
      // (Lessons-learned), mv-11 (Project coordination — hours moved to
      // Project Management above).
      id: 'mv-monitoring', name: 'Project Monitoring – Meetings and communication (includes project kick-off, internal and client meetings, lessons learned)', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
      assignees: [
        { person: 'Megan', hours: 4.5 },
      ],
    },
    {
      // Michelle, 2h — confirmed intentional exception, same as Storyline's
      // Communications row (see that comment for reasoning).
      id: 'mv-comms', name: 'Communications – Email, chat, phone', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
      assignees: [
        { person: 'Michelle', hours: 2 },
      ],
    },
    {
      id: 'mv-12', name: 'Logo stinger', type: 'Fixed', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Megan', hours: 2 }],
    },
    {
      id: 'mv-veo', name: 'Up to 5 min of VEO3 / Vyond scenarios', type: 'Dynamic', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Michelle', hours: 6 }],
    },
    {
      id: 'mv-img', name: 'Up to 5 custom AI images', type: 'Fixed', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Michelle', hours: 3 }],
    },
    {
      id: 'mv-1', name: 'Sales meetings / SOW', type: 'Fixed', phase: 'pm', included: false, forceUnchecked: true,
      assignees: [{ person: 'Laurie', hours: 3 }],
    },
    {
      id: 'mv-wellsaid', name: 'WellSaid', type: 'Expense', phase: 'development',
      included: false, forceUnchecked: true, flatCost: 1000, months: 1, assignees: [],
    },
  ],

  // ── RISE 360 (15 min default) ────────────────────────────
  rise360: [
    {
      id: 'r-2', name: 'Discovery', type: 'Fixed', phase: 'design',
      assignees: [{ person: 'Michelle', hours: 2 }],
    },
    {
      id: 'r-5', name: 'High-Level Design Document (HLDD)', type: 'Dynamic', phase: 'design',
      assignees: [{ person: 'Michelle', hours: 2 }],
    },
    {
      id: 'r-6',
      name: 'Storyboard – 1 per Module. Includes Welcome, objectives, and Summary. Average of 1 KC and 4 interactions per lesson. One 10 question quiz per Module',
      type: 'Dynamic', phase: 'design',
      assignees: [{ person: 'Michelle', hours: 10 }],
    },
    {
      // Moved under Design (2026-08), alongside Storyboard/Branding above.
      id: 'r-10', name: 'Asset Procurement – Images, videos, etc.', type: 'Dynamic', phase: 'design', indent: 1,
      assignees: [{ person: 'Megan', hours: 4 }],
    },
    {
      // Not renamed to "Branding" — this task's scope (modify existing
      // templates/prototypes) doesn't include VO/music selection the way
      // Storyline's Prototype→Branding does. Flag if Laurie wants it renamed
      // for consistency anyway. Moved under Design (2026-08), alongside
      // Storyboard/Asset Procurement below.
      id: 'r-7', name: 'Modify existing templates / prototypes', type: 'Fixed', phase: 'design',
      assignees: [{ person: 'Megan', hours: 1.5 }],
    },
    {
      id: 'r-8',
      name: 'Development: Includes revisions and SCORM package',
      type: 'Dynamic', phase: 'development',
      assignees: [{ person: 'Megan', hours: 10 }],
    },
    {
      id: 'r-qa1', name: 'Quality Assurance Round 1', type: 'Fixed', phase: 'qa',
      assignees: [{ person: 'Megan', hours: 2 }],
    },
    {
      id: 'r-qa2', name: 'Quality Assurance Round 2', type: 'Fixed', phase: 'qa',
      assignees: [{ person: 'QA Resource', hours: 3 }],
    },
    {
      // 2026-08 (2nd pass) — renamed per Laurie's meeting recording; hours
      // updated (Laurie 6→2). Used whenever this category is NOT in
      // Localization + Existing Course mode.
      id: 'r-12', name: 'Project Management - create schedule, schedule updates, weekly reports', type: 'Fixed', phase: 'pm', projectManagementCore: true,
      assignees: [
        { person: 'Laurie',   hours: 2 },
        { person: 'Megan',    hours: 5 },
        { person: 'Michelle', hours: 1 },
      ],
    },
    {
      // Renamed from "Project Monitoring" to "Meetings" (2026-08 2nd pass) —
      // Laurie now also carries hours here (4h, new), alongside Megan/Michelle
      // (unchanged).
      id: 'r-monitoring', name: 'Meetings- project kick-off, discovery, internal, and client meetings, sales meetings, lessons learned meetings', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
      assignees: [
        { person: 'Megan',    hours: 15 },
        { person: 'Michelle', hours: 3 },
        { person: 'Laurie',   hours: 4 },
      ],
    },
    {
      // Michelle, 2h — confirmed intentional exception, same as Storyline's
      // Communications row (see that comment for reasoning).
      id: 'r-comms', name: 'Communications - email, chat, phone', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
      assignees: [
        { person: 'Michelle', hours: 2 },
      ],
    },
    {
      id: 'r-14', name: 'Up to 5 min of VEO3 / Vyond scenarios', type: 'Dynamic', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Michelle', hours: 6 }],
    },
    {
      id: 'r-15', name: 'Up to 5 custom AI images', type: 'Fixed', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Michelle', hours: 3 }],
    },
    {
      id: 'r-1', name: 'Sales meeting/Discovery Calls', type: 'Fixed', phase: 'pm', included: false, forceUnchecked: true,
      assignees: [{ person: 'Laurie', hours: 3 }],
    },
    {
      id: 'r-wellsaid', name: 'WellSaid', type: 'Expense', phase: 'development',
      included: false, forceUnchecked: true, flatCost: 1000, months: 1, assignees: [],
    },
  ],

  // ── STORYLINE 360 (15 min default) ──────────────────────
  storyline360: [
    {
      id: 's-2', name: 'Discovery', type: 'Fixed', phase: 'design',
      assignees: [{ person: 'Michelle', hours: 2 }],
    },
    {
      id: 's-5', name: 'High-Level Design Document (HLDD)', type: 'Dynamic', phase: 'design',
      assignees: [{ person: 'Michelle', hours: 4 }],
    },
    {
      // Renamed from "Prototype" — combines Prototype, VO selection, and
      // music selection. Michelle removed as a default resource (her former
      // 1h folded into Megan's new 5h — see config header note). Stinger/outro
      // deliberately left out of the description — confirmed to stay a
      // separate standalone optional task (s-logo), not folded in here.
      // Moved under Design (2026-08), alongside Storyboard/Asset Procurement.
      id: 's-7', name: 'Branding – Prototype, VO selection, music selection', type: 'Fixed', phase: 'design',
      assignees: [{ person: 'Megan', hours: 5 }],
    },
    {
      id: 's-6',
      name: 'Storyboard – 1 per Module. Includes Welcome, objectives, and Summary. Average of 1 KC and 4 interactions per lesson, 2 assets per slide. One 10 question quiz per Module',
      type: 'Dynamic', phase: 'design',
      assignees: [
        { person: 'Michelle', hours: 9 },
        { person: 'Megan',    hours: 3 },
      ],
    },
    {
      id: 's-10', name: 'Asset Procurement – Images, videos, etc.', type: 'Dynamic', phase: 'design', indent: 1,
      assignees: [{ person: 'Megan', hours: 5 }],
    },
    {
      id: 's-8',
      name: 'Development: 3 KC and 3 interaction slides per lesson, Welcome, Summary, title screens, 2 assets per slide, 10 quiz questions, animation on slides, captions, SCORM package, upload all sources, revisions',
      type: 'Dynamic', phase: 'development',
      assignees: [
        { person: 'Megan',    hours: 20 },
        { person: 'Michelle', hours: 3  },
      ],
    },
    {
      id: 's-narr', name: 'Narration – Acquire VO, download/edit VTT files', type: 'Fixed', phase: 'development', indent: 1,
      assignees: [{ person: 'Megan', hours: 2.5 }],
    },
    {
      id: 's-qa1', name: 'Quality Assurance Round 1', type: 'Fixed', phase: 'qa',
      assignees: [{ person: 'Megan', hours: 4 }],
    },
    {
      id: 's-qa2', name: 'Quality Assurance Round 2', type: 'Fixed', phase: 'qa',
      assignees: [{ person: 'QA Resource', hours: 3 }],
    },
    {
      // 2026-08 (2nd pass) — renamed per Laurie's meeting recording; hours
      // updated (Laurie 6→2). Used whenever this category is NOT in
      // Localization + Existing Course mode.
      id: 's-12', name: 'Project Management - create schedule, schedule updates, weekly reports', type: 'Fixed', phase: 'pm', projectManagementCore: true,
      assignees: [
        { person: 'Laurie',   hours: 2 },
        { person: 'Megan',    hours: 5 },
        { person: 'Michelle', hours: 1 },
      ],
    },
    {
      // Renamed from "Project Monitoring" to "Meetings" (2026-08 2nd pass) —
      // Laurie now also carries hours here (4h, new), alongside Megan/Michelle
      // (unchanged).
      id: 's-monitoring', name: 'Meetings- project kick-off, discovery, internal, and client meetings, sales meetings, lessons learned meetings', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
      assignees: [
        { person: 'Megan',    hours: 15 },
        { person: 'Michelle', hours: 3 },
        { person: 'Laurie',   hours: 4 },
      ],
    },
    {
      // Michelle, 2h — a deliberate exception to the "remove Michelle from
      // PM/Monitoring" rule; confirmed intentional (Communications is her
      // responsibility specifically, unlike the meeting-heavy Monitoring work).
      id: 's-comms', name: 'Communications - email, chat, phone', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
      assignees: [
        { person: 'Michelle', hours: 2 },
      ],
    },
    {
      id: 's-logo', name: 'Logo Stinger', type: 'Fixed', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Megan', hours: 2 }],
    },
    {
      id: 's-14', name: 'Up to 5 min of VEO3 / Vyond scenarios', type: 'Dynamic', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Michelle', hours: 6 }],
    },
    {
      id: 's-15', name: 'Up to 5 min of software simulations', type: 'Dynamic', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Michelle', hours: 6 }],
    },
    {
      id: 's-16', name: 'Up to 5 custom images', type: 'Fixed', phase: 'development', included: false, forceUnchecked: true,
      assignees: [{ person: 'Megan', hours: 3 }],
    },
    {
      id: 's-1', name: 'Sales meeting/Discovery Calls', type: 'Fixed', phase: 'pm', included: false, forceUnchecked: true,
      assignees: [{ person: 'Laurie', hours: 3 }],
    },
    {
      id: 's-wellsaid', name: 'WellSaid', type: 'Expense', phase: 'development',
      included: false, forceUnchecked: true, flatCost: 1000, months: 1, assignees: [],
    },
  ],
}

// Generates a second-state task list from a primary list with optional overrides.
// removedIds: task ids to exclude entirely from the second state.
// modifyHours: { [taskId]: { [person]: newHours } } — overrides specific assignee hours.
function makeSecondState(tasks, { removedIds = [], modifyHours = {} } = {}) {
  return tasks
    .filter(t => !removedIds.includes(t.id))
    .map(t => ({
      ...t,
      included: t.included !== false,
      assignees: t.assignees.map(a => ({
        ...a,
        hours: modifyHours[t.id]?.[a.person] ?? a.hours,
      })),
    }))
}

// Second-state templates (Modules 2–N for Rise/Storyline; Additional Video Template for Microvideo).
// Rise & Storyline: remove Modify Templates (rise only); Discovery → 1 h;
// Project Monitoring's Megan hours reduced by the same -0.5h delta (now 15h →
// 14.5h, rescaled 2026-08 alongside the new default PM/Monitoring/Comms hours
// above — the delta itself is unchanged) since its one-time Lessons Learned
// component shouldn't repeat per additional module. Michelle's hours on
// Project Monitoring are unrelated to that one-time component, so they carry
// over unreduced. Laurie carries no Monitoring hours (moved to Project
// Management — see the task definitions above), so there's nothing of hers to
// reduce here.
export const DEFAULT_SECOND_STATE_TASKS = {
  microvideo: makeSecondState(DEFAULT_TASKS.microvideo),
  rise360: makeSecondState(DEFAULT_TASKS.rise360, {
    removedIds: ['r-7'],
    modifyHours: {
      'r-2':          { Michelle: 1 },
      'r-monitoring': { Megan: 14.5 },
    },
  }),
  storyline360: makeSecondState(DEFAULT_TASKS.storyline360, {
    modifyHours: {
      's-2':          { Michelle: 1 },
      's-monitoring': { Megan: 14.5 },
    },
  }),
}

// ============================================================
// LOCALIZATION TASKS (added 2026-08)
// One per-category task list for the Localization add-on toggle (see
// CategoryBlock.jsx) — applies once per category regardless of module/video
// count, same as WellSaid/ADA. Task shapes:
//   type: 'Fixed'    — normal hours × RATES, unchanged from the rest of the app.
//   type: 'PerUnit'  — quantity-multiplied hours: unitMinutes/60 × quantity
//                      (quantity is Laurie-entered, starts at 0), cost = that
//                      × the single assignee's RATES entry.
//   validatorAssigneeIndex — marks which entry in this Fixed task's own
//                      assignees array is the validator seat; App.jsx keeps
//                      that assignee's person in sync with the category's
//                      validatorLanguage ('QA Spanish' for spanish, 'QA
//                      French' for french) whenever the dropdown changes.
//   validatorWords: true — a dollar-only line (no assignees/hours): cost =
//                      (words/1000) × (task.flatRate ?? VALIDATOR_WORD_RATES[validatorLanguage]).
//                      words is Laurie-entered, starts at 0.
//   flatRate (added 2026-08) — customizable per-1000-words rate, editable
//                      right on a validatorWords task's row ("Flat Rate").
//                      Overrides VALIDATOR_WORD_RATES for that task instance —
//                      these QA people are Fiverr resources that could be
//                      replaced, so the rate is whatever Laurie sets it to.
//   hourlyRate on an assignee (added 2026-08) — customizable $/hr for a
//                      validator-seat assignee ("Hourly Rate"), overrides
//                      RATES[person] for that assignee only. See assigneeRate()
//                      in calc.js, the single place this override is applied.
// Validate/Validation-numbered tasks are tagged phase: 'qa' (they're
// literally quality-review steps); every other localization task is
// phase: 'development' (the "everything else is development" fallback rule).
// ============================================================

export const LOCALIZATION_TASKS = {

  // ── MICROVIDEO ────────────────────────────────────────────
  // PLACEHOLDER — tasks 1-3 have no assignee at all in Laurie's document
  // ("Default 15 min" with no name). Defaulted to Megan, the primary
  // hands-on producer for every other Microvideo task — confirm with Laurie.
  microvideo: [
    {
      id: 'mv-loc-1', name: 'Translate slide text – Using Canva/Vyond localization feature translate slide text', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
    {
      id: 'mv-loc-2', name: 'Get transcription – Upload to Stream to get transcript', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
    {
      id: 'mv-loc-3', name: 'Get narration – Use WellSaid or Murf to get narration and add narration to video in Canva/Vyond', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
    {
      // PLACEHOLDER — validator hours not stated ("+ ? for validator"),
      // mirrored from Storyline's Validation #2 symmetry (0.5h each side).
      id: 'mv-loc-validate', name: 'Validate – Publish video to Articulate Review for validator to check onscreen text and narration sync', type: 'Fixed', phase: 'qa',
      assignees: [
        { person: 'Megan',      hours: 0.5 },
        { person: 'QA Spanish', hours: 0.5 },
      ],
      validatorAssigneeIndex: 1,
    },
  ],

  // ── RISE 360 ──────────────────────────────────────────────
  rise360: [
    {
      id: 'r-loc-1', name: 'Organize images in OneDrive', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
    {
      id: 'r-loc-2', name: 'Translate images/PDFs/GIFs/VTT files – Use ChatGPT to translate, 2 minutes per item', type: 'PerUnit', phase: 'development',
      unitMinutes: 2, unitLabel: 'item', quantity: 0,
      assignees: [{ person: 'Michelle' }],
    },
    {
      id: 'r-loc-3', name: 'Update Rise to new language and add images', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
    {
      // Michelle removed (2026-08) — "only keep the validator" per Laurie;
      // the validator's cost is the flat per-1000-words fee below (no
      // assignee needed for it), not a team-member oversight hour.
      // flatRate (added 2026-08) — customizable per-1000-words rate, editable
      // right on this row ("Flat Rate"); seeded from VALIDATOR_WORD_RATES at
      // the default (spanish) language so the box starts pre-filled with a
      // sensible number instead of blank/zero.
      id: 'r-loc-validate', name: 'Validate – Validator reviews, flat rate per 1000 words (Fiverr)', type: 'Fixed', phase: 'qa',
      assignees: [], validatorWords: true, words: 1000, flatRate: VALIDATOR_WORD_RATES.spanish,
    },
    {
      id: 'r-loc-5', name: 'Update course per validator', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
    {
      id: 'r-loc-6', name: 'Client reviews then update Rise – After client reviews, update validated course with new images and text', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.5 }],
    },
    {
      id: 'r-loc-7', name: 'Send Scorm file and email client – Publish to LMS or send copy of course to client', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Michelle', hours: 0.08 }],
    },
  ],

  // ── STORYLINE 360 ─────────────────────────────────────────
  storyline360: [
    {
      id: 's-loc-1', name: 'Localize – Using Storyline localization feature, translate all text and upload to Articulate Review for validation', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
    {
      // Michelle removed (2026-08) — "only keep the validator" per Laurie,
      // same as Rise's Validate task above. flatRate (added 2026-08) —
      // customizable per-1000-words rate, editable right on this row.
      id: 's-loc-validate1', name: 'Validation #1 – Validator reviews, flat rate per 1000 words, then import validated text changes', type: 'Fixed', phase: 'qa',
      assignees: [], validatorWords: true, words: 1000, flatRate: VALIDATOR_WORD_RATES.spanish,
    },
    {
      id: 's-loc-3', name: 'Clone the course – Copy text from one Storyline to its clone, making text adjustments, 15 minutes per slide', type: 'PerUnit', phase: 'development',
      unitMinutes: 15, unitLabel: 'slide', quantity: 6,
      assignees: [{ person: 'Megan' }],
    },
    {
      id: 's-loc-4', name: 'Add narration – Added slide by slide by pasting validated text into each slide/layer (Insert Audio/Text to Speech)', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.5 }],
    },
    {
      // hourlyRate (added 2026-08) — customizable $/hr for the validator seat,
      // editable right on this row ("Hourly Rate"); seeded from RATES at the
      // default (spanish → QA Spanish) language.
      id: 's-loc-validate2', name: 'Validation #2 – Publish new course to Review for validator to check narration is synced to animations (over Teams)', type: 'Fixed', phase: 'qa',
      assignees: [
        { person: 'Michelle',   hours: 0.5 },
        { person: 'QA Spanish', hours: 0.5, hourlyRate: RATES['QA Spanish'] },
      ],
      validatorAssigneeIndex: 1,
    },
    {
      id: 's-loc-6', name: 'Publish to Scorm – Send zip file and Storyline file to client', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
  ],
}

// ============================================================
// LOCALIZATION PM-CORE TASKS (added 2026-08)
// Rise 360 and Storyline 360 only — Microvideo's PM/Monitoring/Comms hours
// were never part of the 2026-08 hours split (still one set, in DEFAULT_TASKS
// above). The original 2026-08-confirmed Project Management / Project
// Monitoring / Communications hours (Laurie 2/Megan 2/Michelle 1, Megan
// 4/Michelle 1, Michelle 2) turned out to be Localization-specific, not the
// general default — DEFAULT_TASKS' r-12/r-monitoring/r-comms and
// s-12/s-monitoring/s-comms now hold the real (higher) default instead. This
// block holds that original, smaller hour set, used two different ways
// depending on a category's Localization mode (see visibleNormalTasks() /
// localizationSectionTasks() in calc.js, which implement both):
//   - Existing Course: these tasks REPLACE the normal PM/Monitoring/Comms rows
//     entirely (Existing Course already narrows the visible list to just the
//     PM-core tasks) — same "Project Management" phase section as always,
//     just these hours instead of the new default.
//   - New Course: the normal list is untouched (full task list, new default
//     hours) — these three additionally appear as their own rows at the very
//     top of the Localization section, tagged isLocalization so they render/
//     cost as a pass-through (never scaled by module count, never ADA'd),
//     same treatment as every other Localization task.
// pmCoreLocalization: true marks these for the update-dispatch routing in
// CategoryBlock.jsx (a third case alongside the plain-task and
// localization-task handlers already there) — needed because these tasks
// don't live in cat.tasks or cat.localization.tasks, but in their own
// cat.localizationPmCore sub-state (see App.jsx initCat), so edits must be
// routed to their own update handler regardless of which visual role
// (normal-section replacement vs. Localization-section extra row) they're
// currently playing.
// ============================================================

// 2026-08 (2nd pass): renamed to match the new default names above, and
// Laurie's hours changed — 2h → 1h under Project Management, plus a new 1h
// under Meetings (previously 0). Megan/Michelle hours on all three tasks are
// unchanged ("keep the hours the same" per Laurie, except for Laurie).
export const LOCALIZATION_PM_CORE_TASKS = {
  rise360: [
    {
      id: 'r-loc-pm', name: 'Project Management - create schedule, schedule updates, weekly reports', type: 'Fixed', phase: 'pm', projectManagementCore: true, pmCoreLocalization: true,
      assignees: [
        { person: 'Laurie',   hours: 1 },
        { person: 'Megan',    hours: 2 },
        { person: 'Michelle', hours: 1 },
      ],
    },
    {
      id: 'r-loc-monitoring', name: 'Meetings- project kick-off, discovery, internal, and client meetings, sales meetings, lessons learned meetings', type: 'Fixed', phase: 'pm', projectManagementCore: true, pmCoreLocalization: true, indent: 1,
      assignees: [
        { person: 'Megan',    hours: 4 },
        { person: 'Michelle', hours: 1 },
        { person: 'Laurie',   hours: 1 },
      ],
    },
    {
      id: 'r-loc-comms', name: 'Communications - email, chat, phone', type: 'Fixed', phase: 'pm', projectManagementCore: true, pmCoreLocalization: true, indent: 1,
      assignees: [
        { person: 'Michelle', hours: 2 },
      ],
    },
  ],
  storyline360: [
    {
      id: 's-loc-pm', name: 'Project Management - create schedule, schedule updates, weekly reports', type: 'Fixed', phase: 'pm', projectManagementCore: true, pmCoreLocalization: true,
      assignees: [
        { person: 'Laurie',   hours: 1 },
        { person: 'Megan',    hours: 2 },
        { person: 'Michelle', hours: 1 },
      ],
    },
    {
      id: 's-loc-monitoring', name: 'Meetings- project kick-off, discovery, internal, and client meetings, sales meetings, lessons learned meetings', type: 'Fixed', phase: 'pm', projectManagementCore: true, pmCoreLocalization: true, indent: 1,
      assignees: [
        { person: 'Megan',    hours: 4 },
        { person: 'Michelle', hours: 1 },
        { person: 'Laurie',   hours: 1 },
      ],
    },
    {
      id: 's-loc-comms', name: 'Communications - email, chat, phone', type: 'Fixed', phase: 'pm', projectManagementCore: true, pmCoreLocalization: true, indent: 1,
      assignees: [
        { person: 'Michelle', hours: 2 },
      ],
    },
  ],
}

// Second-state (modules 2-N) variant of the above, for Existing Course mode's
// multi-module estimates — same -0.5h Megan/Monitoring delta as
// DEFAULT_SECOND_STATE_TASKS, applied to this smaller baseline (4h → 3.5h,
// unchanged from before the 2026-08 default-hours split, since this baseline
// itself didn't change).
export const LOCALIZATION_PM_CORE_SECOND_STATE_TASKS = {
  rise360: makeSecondState(LOCALIZATION_PM_CORE_TASKS.rise360, {
    modifyHours: { 'r-loc-monitoring': { Megan: 3.5 } },
  }),
  storyline360: makeSecondState(LOCALIZATION_PM_CORE_TASKS.storyline360, {
    modifyHours: { 's-loc-monitoring': { Megan: 3.5 } },
  }),
}
