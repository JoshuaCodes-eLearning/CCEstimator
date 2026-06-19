// ============================================================
// CCEstimator — Central Configuration
// All rates, percentages, and default task data live here.
// ============================================================

export const RATES = {
  Megan:        50,
  Michelle:     65,
  Laurie:       75,
  'QA Resource': 50,
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
// Each task: { id, name, type, included?, assignees: [{ person, hours }] }
// included defaults to true — set false to start unchecked.
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
      id: 'mv-4', name: 'Internal meetings, client kickoff and status meetings', type: 'Fixed',
      assignees: [
        { person: 'Laurie',   hours: 2.5 },
        { person: 'Michelle', hours: 2   },
        { person: 'Megan',    hours: 3.5 },
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
      id: 'r-3', name: 'Internal meetings, client kickoff and status meetings', type: 'Fixed',
      assignees: [
        { person: 'Laurie',   hours: 4 },
        { person: 'Megan',    hours: 2 },
        { person: 'Michelle', hours: 2 },
      ],
    },
    {
      id: 'r-5', name: 'HLDD', type: 'Fixed',
      assignees: [{ person: 'Michelle', hours: 2 }],
    },
    {
      id: 'r-6',
      name: 'Storyboards – 1 per lesson, avg. 6 lessons plus Welcome and Summary',
      type: 'Dynamic',
      assignees: [{ person: 'Michelle', hours: 13 }],
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
      name: 'Development: Welcome, Summary, title screen, 3 KC and 5 interaction slides per lesson, 10 quiz questions, revisions, SCORM package',
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
      id: 's-3', name: 'Internal meetings, client kickoff and status meetings', type: 'Fixed',
      assignees: [
        { person: 'Laurie',   hours: 5 },
        { person: 'Megan',    hours: 7 },
        { person: 'Michelle', hours: 3 },
      ],
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

// Second-state template: same tasks, all unchecked by default
export const DEFAULT_SECOND_STATE_TASKS = Object.fromEntries(
  Object.entries(DEFAULT_TASKS).map(([cat, tasks]) => [
    cat,
    tasks.map(t => ({ ...t, included: false })),
  ])
)
