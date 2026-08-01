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
// 2026-07 restructure — Project Management / Project Monitoring hours are
// PLACEHOLDERS pending Laurie's final sign-off (source meeting left these
// explicitly TBD). Storyline's placeholders are built from the two facts the
// source doc treats as settled — existing PM = Laurie 6 (unchanged) plus
// Megan's Project Coordination 15h (confirmed transferred into PM) — and the
// doc's own quoted approximate Monitoring figures (~2h Laurie, ~2h Megan),
// NOT the doc's disowned "interim consolidation" numbers (Laurie 11/Megan 22,
// Laurie 11/Megan 7). Rise 360 and Microvideo were never discussed in that
// meeting at all — their PM/Monitoring placeholders mechanically carry
// forward each category's own prior Internal Meetings / Project Coordination
// / Lessons Learned hours into the new structure (Coordination → PM,
// Internal Meetings + 1h/participant Lessons Learned → Monitoring), with
// Michelle's hours dropped entirely (not redistributed) per the "remove
// Michelle from the PM/Monitoring structure" rule. Flag with Laurie before
// treating any of these as final — same "confirm before final" caveat as the
// existing Rise 360 Lessons Learned assumption below.
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
      type: 'Dynamic', phase: 'development',
      assignees: [{ person: 'Michelle', hours: 10 }],
    },
    {
      id: 'r-10', name: 'Asset Procurement – Images, videos, etc.', type: 'Dynamic', phase: 'development', indent: 1,
      assignees: [{ person: 'Megan', hours: 4 }],
    },
    {
      // Not renamed to "Branding" — this task's scope (modify existing
      // templates/prototypes) doesn't include VO/music selection the way
      // Storyline's Prototype→Branding does. Flag if Laurie wants it renamed
      // for consistency anyway.
      id: 'r-7', name: 'Modify existing templates / prototypes', type: 'Fixed', phase: 'development',
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
      // PLACEHOLDER — existing 1.5h + 3h transferred from retired Project
      // Coordination (r-13), plus Laurie's 5h moved here from Project
      // Monitoring below (Laurie is the Project Manager — her hours belong
      // under Project Management, not the Monitoring sub-task). Michelle's
      // former 1h dropped per the Michelle-removal rule. Confirm with Laurie.
      id: 'r-12', name: 'Project Management – Create schedule, schedule updates, weekly reports, Status meetings, meetings, communication, project kick-off', type: 'Fixed', phase: 'pm', projectManagementCore: true,
      assignees: [
        { person: 'Laurie', hours: 8.5 },
        { person: 'Megan',  hours: 4.5 },
      ],
    },
    {
      // PLACEHOLDER — existing Internal Meetings (Megan 2) plus 1h from
      // retired Lessons Learned (r-9). Laurie removed — her hours moved to
      // Project Management above (she's the PM; Monitoring/communications
      // are Megan's work). Michelle's former 2h + 1.25h dropped entirely.
      // Replaces r-3 (Internal meetings), r-9 (Lessons Learned), r-13
      // (Project coordination — hours moved to Project Management above).
      id: 'r-monitoring', name: 'Project Monitoring – Meetings and communication (includes project kick-off, internal and client meetings, lessons learned)', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
      assignees: [
        { person: 'Megan', hours: 3 },
      ],
    },
    {
      // Michelle, 2h — confirmed intentional exception, same as Storyline's
      // Communications row (see that comment for reasoning).
      id: 'r-comms', name: 'Communications – Email, chat, phone', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
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
      id: 'r-1', name: 'Sales meetings / SOW', type: 'Fixed', phase: 'pm', included: false, forceUnchecked: true,
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
      id: 's-7', name: 'Branding – Prototype, VO selection, music selection', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 5 }],
    },
    {
      id: 's-6',
      name: 'Storyboard – 1 per Module. Includes Welcome, objectives, and Summary. Average of 1 KC and 4 interactions per lesson, 2 assets per slide. One 10 question quiz per Module',
      type: 'Dynamic', phase: 'development',
      assignees: [
        { person: 'Michelle', hours: 9 },
        { person: 'Megan',    hours: 3 },
      ],
    },
    {
      id: 's-10', name: 'Asset Procurement – Images, videos, etc.', type: 'Dynamic', phase: 'development', indent: 1,
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
      // PLACEHOLDER — existing Laurie 6 (unchanged) + Megan 15 transferred
      // from retired Project Coordination (s-13, confirmed transfer per the
      // source meeting), plus Laurie's 2h moved here from Project Monitoring
      // below (Laurie is the Project Manager — her hours belong under
      // Project Management, not the Monitoring sub-task). Confirm final
      // total with Laurie.
      id: 's-12', name: 'Project Management – Create schedule, schedule updates, weekly reports, Status meetings, meetings, communication, project kick-off', type: 'Fixed', phase: 'pm', projectManagementCore: true,
      assignees: [
        { person: 'Laurie', hours: 8  },
        { person: 'Megan',  hours: 15 },
      ],
    },
    {
      // PLACEHOLDER — sourced from the meeting's own quoted approximate
      // figure ("Megan ~2h for kickoff + lessons learned"), NOT the disowned
      // Laurie 11/Megan 7 interim-consolidation numbers. Laurie removed —
      // her hours moved to Project Management above (she's the PM;
      // Monitoring/communications are Megan's work). Replaces s-3 (Internal
      // meetings), s-9 (Lessons Learned), s-13 (Project coordination — hours
      // moved to Project Management above). Michelle removed from the
      // default participant list per the meeting.
      id: 's-monitoring', name: 'Project Monitoring – Meetings and communication (includes project kick-off, internal and client meetings, lessons learned)', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
      assignees: [
        { person: 'Megan', hours: 2 },
      ],
    },
    {
      // Michelle, 2h — a deliberate exception to the "remove Michelle from
      // PM/Monitoring" rule; confirmed intentional (Communications is her
      // responsibility specifically, unlike the meeting-heavy Monitoring work).
      id: 's-comms', name: 'Communications – Email, chat, phone', type: 'Fixed', phase: 'pm', projectManagementCore: true, indent: 1,
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
      id: 's-1', name: 'Sales meetings / SOW', type: 'Fixed', phase: 'pm', included: false, forceUnchecked: true,
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
// Project Monitoring's Megan hours reduced (same -0.5h delta pattern the old
// Internal Meetings row used) since its one-time Lessons Learned component
// shouldn't repeat per additional module — PLACEHOLDER, same caveat as above.
// Laurie carries no Monitoring hours (moved to Project Management — see the
// task definitions above), so there's nothing of hers to reduce here.
export const DEFAULT_SECOND_STATE_TASKS = {
  microvideo: makeSecondState(DEFAULT_TASKS.microvideo),
  rise360: makeSecondState(DEFAULT_TASKS.rise360, {
    removedIds: ['r-7'],
    modifyHours: {
      'r-2':          { Michelle: 1 },
      'r-monitoring': { Megan: 2.5 },
    },
  }),
  storyline360: makeSecondState(DEFAULT_TASKS.storyline360, {
    modifyHours: {
      's-2':          { Michelle: 1 },
      's-monitoring': { Megan: 1.5 },
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
//                      (words/1000) × VALIDATOR_WORD_RATES[validatorLanguage].
//                      words is Laurie-entered, starts at 0.
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
      // PLACEHOLDER — Michelle's hours here are assumed (0.5h, matching the
      // other Validate/Validation tasks' team-oversight portion), not stated
      // in the source doc. Confirm with Laurie.
      id: 'r-loc-validate', name: 'Validate – Validator reviews, flat rate per 1000 words (Fiverr)', type: 'Fixed', phase: 'qa',
      assignees: [{ person: 'Michelle', hours: 0.5 }], validatorWords: true, words: 0,
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
      // PLACEHOLDER — Michelle's hours here are assumed (0.5h, matching
      // Validation #2's team-oversight portion below), not stated in the
      // source doc. Confirm with Laurie.
      id: 's-loc-validate1', name: 'Validation #1 – Validator reviews, flat rate per 1000 words, then import validated text changes', type: 'Fixed', phase: 'qa',
      assignees: [{ person: 'Michelle', hours: 0.5 }], validatorWords: true, words: 0,
    },
    {
      id: 's-loc-3', name: 'Clone the course – Copy text from one Storyline to its clone, making text adjustments, 15 minutes per slide', type: 'PerUnit', phase: 'development',
      unitMinutes: 15, unitLabel: 'slide', quantity: 0,
      assignees: [{ person: 'Megan' }],
    },
    {
      id: 's-loc-4', name: 'Add narration – Added slide by slide by pasting validated text into each slide/layer (Insert Audio/Text to Speech)', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.5 }],
    },
    {
      id: 's-loc-validate2', name: 'Validation #2 – Publish new course to Review for validator to check narration is synced to animations (over Teams)', type: 'Fixed', phase: 'qa',
      assignees: [
        { person: 'Michelle',   hours: 0.5 },
        { person: 'QA Spanish', hours: 0.5 },
      ],
      validatorAssigneeIndex: 1,
    },
    {
      id: 's-loc-6', name: 'Publish to Scorm – Send zip file and Storyline file to client', type: 'Fixed', phase: 'development',
      assignees: [{ person: 'Megan', hours: 0.25 }],
    },
  ],
}
