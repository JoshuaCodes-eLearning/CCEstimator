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

// ============================================================
// DEFAULT TASK DATA
// { id, name, type, included?, indent?, assignees: [{ person, hours }] }
// included defaults true — set false to start unchecked.
// indent: true — visually nested under the row above it (used for Internal meetings under PM).
// type: 'Fixed' | 'Dynamic'
// ============================================================

export const DEFAULT_TASKS = {

  // ── MICROVIDEO (5 min default) ───────────────────────────
  microvideo: [
    {
      id: 'mv-2', name: 'Discovery', type: 'Fixed',
      assignees: [{ person: 'Michelle', hours: 1 }],
    },
    {
      id: 'mv-hldd', name: 'HLDD', type: 'Fixed',
      assignees: [{ person: 'Michelle', hours: 1 }],
    },
    {
      id: 'mv-6', name: 'Storyboard', type: 'Dynamic',
      assignees: [
        { person: 'Michelle', hours: 6  },
        { person: 'Megan',    hours: 10 },
      ],
    },
    {
      id: 'mv-ip', name: 'Image procurement', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 4 }],
    },
    {
      id: 'mv-5',
      name: 'Development: title, outro, AI narration, record screens, captions (VTT), QA/revisions, annotations, callouts, zooms',
      type: 'Dynamic',
      assignees: [{ person: 'Megan', hours: 8 }],
    },
    {
      id: 'mv-vo', name: 'Voice-over / Narration / VTT / Music', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 2.5 }],
    },
    {
      id: 'mv-qa1', name: 'QA 1', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 0.5 }],
    },
    {
      id: 'mv-qa2', name: 'QA 2', type: 'Fixed',
      assignees: [{ person: 'QA Resource', hours: 2 }],
    },
    {
      id: 'mv-8', name: 'Lessons-learned meeting', type: 'Fixed',
      assignees: [
        { person: 'Laurie',   hours: 2    },
        { person: 'Michelle', hours: 1.25 },
        { person: 'Megan',    hours: 1.25 },
      ],
    },
    {
      id: 'mv-10', name: 'Project management', type: 'Fixed',
      assignees: [{ person: 'Laurie', hours: 9 }],
    },
    {
      id: 'mv-4', name: 'Internal meetings, client kickoff and status meetings', type: 'Fixed',
      indent: true,
      assignees: [
        { person: 'Laurie',   hours: 2.5 },
        { person: 'Michelle', hours: 2   },
        { person: 'Megan',    hours: 3.5 },
      ],
    },
    {
      id: 'mv-11', name: 'Project coordination', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 6 }],
    },
    {
      id: 'mv-12', name: 'Logo stinger', type: 'Fixed', included: false,
      assignees: [{ person: 'Megan', hours: 2 }],
    },
    {
      id: 'mv-veo', name: 'Up to 5 min of VEO3 / Vyond scenarios', type: 'Dynamic', included: false,
      assignees: [{ person: 'Michelle', hours: 6 }],
    },
    {
      id: 'mv-img', name: 'Up to 5 custom AI images', type: 'Fixed', included: false,
      assignees: [{ person: 'Michelle', hours: 3 }],
    },
    {
      id: 'mv-1', name: 'Sales meetings / SOW', type: 'Fixed', included: false,
      assignees: [{ person: 'Laurie', hours: 3 }],
    },
  ],

  // ── RISE 360 (15 min default) ────────────────────────────
  rise360: [
    {
      id: 'r-2', name: 'Discovery', type: 'Fixed',
      assignees: [{ person: 'Michelle', hours: 2 }],
    },
    {
      id: 'r-5', name: 'HLDD', type: 'Fixed',
      assignees: [{ person: 'Michelle', hours: 2 }],
    },
    {
      id: 'r-6',
      name: 'Storyboard – 1 per Module. Includes Welcome, objectives, and Summary. Average of 1 KC and 4 interactions per lesson. One 10 question quiz per Module',
      type: 'Dynamic',
      assignees: [{ person: 'Michelle', hours: 10 }],
    },
    {
      id: 'r-10', name: 'Image procurement', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 4 }],
    },
    {
      id: 'r-7', name: 'Modify existing templates / prototypes', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 1.5 }],
    },
    {
      id: 'r-8',
      name: 'Development: Includes revisions and SCORM package',
      type: 'Dynamic',
      assignees: [{ person: 'Megan', hours: 10 }],
    },
    {
      id: 'r-qa1', name: 'QA 1', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 2 }],
    },
    {
      id: 'r-qa2', name: 'QA 2', type: 'Fixed',
      assignees: [{ person: 'QA Resource', hours: 3 }],
    },
    {
      // Note: source doc reads "Laurie 3.25, Megan 1.25, Laurie 1.25" — third person assumed Michelle (likely typo)
      id: 'r-9', name: 'Lessons Learned', type: 'Fixed',
      assignees: [
        { person: 'Laurie',   hours: 3.25 },
        { person: 'Megan',    hours: 1.25 },
        { person: 'Michelle', hours: 1.25 },
      ],
    },
    {
      id: 'r-12', name: 'Project management', type: 'Fixed',
      assignees: [
        { person: 'Laurie',   hours: 3.5 },
        { person: 'Michelle', hours: 1   },
        { person: 'Megan',    hours: 1.5 },
      ],
    },
    {
      id: 'r-3', name: 'Internal meetings, client kickoff and status meetings', type: 'Fixed',
      indent: true,
      assignees: [
        { person: 'Laurie',   hours: 4 },
        { person: 'Megan',    hours: 2 },
        { person: 'Michelle', hours: 2 },
      ],
    },
    {
      id: 'r-13', name: 'Project coordination', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 3 }],
    },
    {
      id: 'r-14', name: 'Up to 5 min of VEO3 / Vyond scenarios', type: 'Dynamic', included: false,
      assignees: [{ person: 'Michelle', hours: 6 }],
    },
    {
      id: 'r-15', name: 'Up to 5 custom AI images', type: 'Fixed', included: false,
      assignees: [{ person: 'Michelle', hours: 3 }],
    },
    {
      id: 'r-1', name: 'Sales meetings / SOW', type: 'Fixed', included: false,
      assignees: [{ person: 'Laurie', hours: 3 }],
    },
  ],

  // ── STORYLINE 360 (15 min default) ──────────────────────
  storyline360: [
    {
      id: 's-2', name: 'Discovery', type: 'Fixed',
      assignees: [{ person: 'Michelle', hours: 2 }],
    },
    {
      id: 's-5', name: 'HLDD', type: 'Fixed',
      assignees: [{ person: 'Michelle', hours: 4 }],
    },
    {
      id: 's-6', name: 'Storyboard', type: 'Dynamic',
      assignees: [
        { person: 'Michelle', hours: 9 },
        { person: 'Megan',    hours: 3 },
      ],
    },
    {
      id: 's-10', name: 'Image procurement', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 5 }],
    },
    {
      id: 's-7', name: 'Prototype', type: 'Fixed',
      assignees: [
        { person: 'Megan',    hours: 4 },
        { person: 'Michelle', hours: 1 },
      ],
    },
    {
      id: 's-8',
      name: 'Development: 3 KC and 3 interaction slides per lesson, Welcome, Summary, title screens, 10 quiz questions, animation on 90% of slides, captions, SCORM package, upload all sources, revisions',
      type: 'Dynamic',
      assignees: [
        { person: 'Megan',    hours: 20 },
        { person: 'Michelle', hours: 3  },
      ],
    },
    {
      id: 's-narr', name: 'Narration / VTT', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 2.5 }],
    },
    {
      id: 's-qa1', name: 'QA 1', type: 'Fixed',
      assignees: [{ person: 'Megan', hours: 4 }],
    },
    {
      id: 's-qa2', name: 'QA 2', type: 'Fixed',
      assignees: [{ person: 'QA Resource', hours: 3 }],
    },
    {
      id: 's-9', name: 'Lessons Learned', type: 'Fixed',
      assignees: [
        { person: 'Megan',    hours: 2.5  },
        { person: 'Michelle', hours: 1.25 },
        { person: 'Laurie',   hours: 2    },
      ],
    },
    {
      id: 's-12', name: 'Project management', type: 'Fixed',
      assignees: [{ person: 'Laurie', hours: 6 }],
    },
    {
      id: 's-3', name: 'Internal meetings, client kickoff and status meetings', type: 'Fixed',
      indent: true,
      assignees: [
        { person: 'Laurie',   hours: 5 },
        { person: 'Megan',    hours: 7 },
        { person: 'Michelle', hours: 3 },
      ],
    },
    {
      id: 's-13', name: 'Project coordination', type: 'Fixed',
      assignees: [
        { person: 'Megan',    hours: 15 },
        { person: 'Michelle', hours: 2  },
      ],
    },
    {
      id: 's-logo', name: 'Logo Stinger', type: 'Fixed', included: false,
      assignees: [{ person: 'Megan', hours: 2 }],
    },
    {
      id: 's-14', name: 'Up to 5 min of VEO3 / Vyond scenarios', type: 'Dynamic', included: false,
      assignees: [{ person: 'Michelle', hours: 6 }],
    },
    {
      id: 's-15', name: 'Up to 5 min of software simulations', type: 'Dynamic', included: false,
      assignees: [{ person: 'Michelle', hours: 6 }],
    },
    {
      id: 's-16', name: 'Up to 5 custom images', type: 'Fixed', included: false,
      assignees: [{ person: 'Megan', hours: 3 }],
    },
    {
      id: 's-1', name: 'Sales meetings / SOW', type: 'Fixed', included: false,
      assignees: [{ person: 'Laurie', hours: 3 }],
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
      included: false,
      assignees: t.assignees.map(a => ({
        ...a,
        hours: modifyHours[t.id]?.[a.person] ?? a.hours,
      })),
    }))
}

// Second-state templates (Modules 2–N for Rise/Storyline; Additional Video Template for Microvideo).
// Rise & Storyline: remove Modify Templates and Lessons Learned; Discovery → 1 h; Internal meetings −0.5 h per person.
export const DEFAULT_SECOND_STATE_TASKS = {
  microvideo: makeSecondState(DEFAULT_TASKS.microvideo),
  rise360: makeSecondState(DEFAULT_TASKS.rise360, {
    removedIds: ['r-7', 'r-9'],
    modifyHours: {
      'r-2': { Michelle: 1 },
      'r-3': { Laurie: 3.5, Megan: 1.5, Michelle: 1.5 },
    },
  }),
  storyline360: makeSecondState(DEFAULT_TASKS.storyline360, {
    removedIds: ['s-9'],
    modifyHours: {
      's-2': { Michelle: 1 },
      's-3': { Laurie: 4.5, Megan: 6.5, Michelle: 2.5 },
    },
  }),
}
