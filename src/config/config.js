// ============================================================
// CCEstimator — Central Configuration
// All rates, percentages, and default task data live here.
// Change a value here and it updates everywhere in the app.
// ============================================================

// Laurie's rate CONFIRMED at $75
export const RATES = {
  Megan: 50,
  Michelle: 65,
  Laurie: 75,
};

// ADA uplift applied to category subtotal (not hours)
export const ADA_RATES = {
  microvideo: 0,      // No ADA option for Microvideo
  rise360: 0.10,      // +10%
  storyline360: 0.10, // +10% (same as Rise 360)
};

// Profit margin options (as % of client price). Default is 50%.
// Client price = internal cost / (1 - margin/100)
export const MARGIN_OPTIONS     = [40, 45, 50]
export const DEFAULT_MARGIN_PCT = 50

export const CAT_LABELS = {
  microvideo:   'Microvideo',
  rise360:      'Rise 360',
  storyline360: 'Storyline 360',
}

// Default length in minutes per category
export const DEFAULT_MINUTES = {
  microvideo: 5,
  rise360: 15,
  storyline360: 15,
};

// ============================================================
// DEFAULT TASK DATA
// Format per task: { id, name, responsible, hours, type }
//   type: 'Fixed' | 'Dynamic'
// OPEN ITEM: Dynamic/Fixed assignment is a placeholder —
//   Laurie to confirm with Michelle which tasks scale with minutes.
// OPEN ITEM: 'Team' responsible is a placeholder —
//   Laurie to confirm how Team hours should be assigned.
// ============================================================

export const DEFAULT_TASKS = {
  microvideo: [
    { id: 'mv-1',  name: 'Sales meetings / SOW',                                    responsible: 'Laurie',   hours: 3,  type: 'Fixed' },
    { id: 'mv-2',  name: 'Discovery',                                                responsible: 'Megan',    hours: 1,  type: 'Fixed' },
    { id: 'mv-3',  name: '1 SME meeting for storyboard',                             responsible: 'Megan',    hours: 1,  type: 'Fixed' },
    { id: 'mv-4',  name: 'Internal meetings, client kickoff and status meetings',    responsible: 'Laurie',   hours: 6,  type: 'Fixed' },   // OPEN ITEM: 'Team' — assigned to Laurie as placeholder
    { id: 'mv-5',  name: 'Development: title, outro, AI narration, record screens, captions (VTT), QA/revisions, annotations, callouts, zooms', responsible: 'Megan', hours: 5, type: 'Dynamic' }, // OPEN ITEM: responsible confirmed as Megan placeholder
    { id: 'mv-6',  name: 'Storyboard (Michelle)',                                    responsible: 'Michelle', hours: 2,  type: 'Dynamic' },
    { id: 'mv-7',  name: 'Storyboard (Megan)',                                       responsible: 'Megan',    hours: 1,  type: 'Dynamic' },
    { id: 'mv-8',  name: 'Lessons-learned meeting',                                  responsible: 'Laurie',   hours: 2,  type: 'Fixed' },   // OPEN ITEM: 'Team'
    { id: 'mv-9',  name: 'Email / Teams communication',                              responsible: 'Laurie',   hours: 2,  type: 'Fixed' },   // OPEN ITEM: 'Team'
    { id: 'mv-10', name: 'Project management',                                       responsible: 'Laurie',   hours: 2,  type: 'Fixed' },
    { id: 'mv-11', name: 'Project coordination',                                     responsible: 'Megan',    hours: 2,  type: 'Fixed' },
    { id: 'mv-12', name: 'Logo stinger',                                             responsible: 'Megan',    hours: 2,  type: 'Fixed' },
  ],

  rise360: [
    { id: 'r-1',  name: 'Sales meetings / SOW',                                                                                       responsible: 'Laurie',   hours: 3,  type: 'Fixed' },
    { id: 'r-2',  name: 'Discovery',                                                                                                  responsible: 'Michelle', hours: 2,  type: 'Fixed' },
    { id: 'r-3',  name: 'Internal meetings, client kickoff and status meetings',                                                      responsible: 'Laurie',   hours: 1,  type: 'Fixed' },  // OPEN ITEM: 'Team'
    { id: 'r-4',  name: '2 SME meetings for storyboard',                                                                             responsible: 'Michelle', hours: 2,  type: 'Fixed' },
    { id: 'r-5',  name: 'HLDD',                                                                                                      responsible: 'Michelle', hours: 2,  type: 'Fixed' },
    { id: 'r-6',  name: 'Storyboards – 1 per lesson, avg. 6 lessons plus Welcome and Summary',                                      responsible: 'Michelle', hours: 60, type: 'Dynamic' },
    { id: 'r-7',  name: 'Modify existing templates / prototypes',                                                                    responsible: 'Megan',    hours: 1,  type: 'Fixed' },
    { id: 'r-8',  name: 'Development: Welcome, Summary, title screen, 3 KC and 5 interaction slides per lesson, 10 quiz questions, QA/revisions, SCORM package', responsible: 'Megan', hours: 36, type: 'Dynamic' },
    { id: 'r-9',  name: 'Lessons-learned meeting',                                                                                   responsible: 'Laurie',   hours: 2,  type: 'Fixed' },  // OPEN ITEM: 'Team'
    { id: 'r-10', name: 'Image procurement',                                                                                         responsible: 'Megan',    hours: 2,  type: 'Fixed' },
    { id: 'r-11', name: 'Email / Teams communication',                                                                               responsible: 'Laurie',   hours: 2,  type: 'Fixed' },  // OPEN ITEM: 'Team'
    { id: 'r-12', name: 'Project management',                                                                                        responsible: 'Laurie',   hours: 2,  type: 'Fixed' },
    { id: 'r-13', name: 'Project coordination',                                                                                      responsible: 'Megan',    hours: 2,  type: 'Fixed' },
    { id: 'r-14', name: 'Up to 5 min of VEO3 / Vyond scenarios',                                                                    responsible: 'Michelle', hours: 6,  type: 'Dynamic' },
    { id: 'r-15', name: 'Up to 5 custom images',                                                                                     responsible: 'Megan',    hours: 3,  type: 'Fixed' },
  ],

  storyline360: [
    { id: 's-1',  name: 'Sales meetings / SOW',                                                                                                                        responsible: 'Laurie',   hours: 3,  type: 'Fixed' },
    { id: 's-2',  name: 'Discovery',                                                                                                                                   responsible: 'Michelle', hours: 2,  type: 'Fixed' },
    { id: 's-3',  name: 'Internal meetings, client kickoff and status meetings',                                                                                       responsible: 'Laurie',   hours: 6,  type: 'Fixed' },  // OPEN ITEM: 'Team'
    { id: 's-4',  name: '2 SME meetings for storyboard',                                                                                                              responsible: 'Michelle', hours: 2,  type: 'Fixed' },
    { id: 's-5',  name: 'HLDD',                                                                                                                                        responsible: 'Michelle', hours: 2,  type: 'Fixed' },
    { id: 's-6',  name: 'Storyboards – 1 per lesson, avg. 6 lessons plus Welcome and Summary',                                                                       responsible: 'Michelle', hours: 60, type: 'Dynamic' },
    { id: 's-7',  name: 'Modify existing templates / prototypes',                                                                                                     responsible: 'Megan',    hours: 2,  type: 'Fixed' },
    { id: 's-8',  name: 'Development: 3 KC and 3 interaction slides per lesson, Welcome, Summary, title screens, 10 quiz questions, animation on 90% of slides, AI voice, captions, SCORM package, upload all sources, QA/revisions', responsible: 'Megan', hours: 20, type: 'Dynamic' },
    { id: 's-9',  name: 'Lessons-learned meeting',                                                                                                                    responsible: 'Laurie',   hours: 2,  type: 'Fixed' },  // OPEN ITEM: 'Team'
    { id: 's-10', name: 'Image procurement',                                                                                                                          responsible: 'Megan',    hours: 2,  type: 'Fixed' },
    { id: 's-11', name: 'Email / Teams communication',                                                                                                                responsible: 'Laurie',   hours: 2,  type: 'Fixed' },  // OPEN ITEM: 'Team'
    { id: 's-12', name: 'Project management',                                                                                                                         responsible: 'Laurie',   hours: 2,  type: 'Fixed' },
    { id: 's-13', name: 'Project coordination',                                                                                                                       responsible: 'Megan',    hours: 2,  type: 'Fixed' },
    { id: 's-14', name: 'Up to 5 min of VEO3 / Vyond scenarios',                                                                                                     responsible: 'Michelle', hours: 6,  type: 'Dynamic' },
    { id: 's-15', name: 'Up to 5 min of software simulations',                                                                                                        responsible: 'Michelle', hours: 6,  type: 'Dynamic' },
    { id: 's-16', name: 'Up to 5 custom images',                                                                                                                      responsible: 'Megan',    hours: 3,  type: 'Fixed' },
  ],
};

// OPEN ITEM: Update specific tasks to included: false once Laurie decides which
// initiation tasks to exclude from modules 2–N.
// Currently ALL tasks start unchecked — user checks what applies.
export const DEFAULT_SECOND_STATE_TASKS = Object.fromEntries(
  Object.entries(DEFAULT_TASKS).map(([cat, tasks]) => [
    cat,
    tasks.map(t => ({ ...t, included: false })),
  ])
)
