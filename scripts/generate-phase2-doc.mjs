// Run with: node scripts/generate-phase2-doc.mjs
// Generates AI_eLearning_Estimator_Phase2_Database.docx in the project root.

import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, ShadingType,
  HeadingLevel,
} from 'docx'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const NAVY   = '1E2D3D'
const WHITE  = 'FFFFFF'
const LIGHT  = 'F8FAFC'
const BLUE   = 'EFF6FF'
const GREEN  = '16A34A'
const AMBER  = 'D97706'
const BORDER = 'E2E8F0'

const noBorder   = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER }

function h1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 48, color: NAVY })],
    spacing: { after: 120 },
  })
}
function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: NAVY })],
    shading: { type: ShadingType.SOLID, fill: LIGHT },
    spacing: { before: 280, after: 100 },
  })
}
function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: NAVY })],
    spacing: { before: 180, after: 60 },
  })
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: '0F172A', ...opts })],
    spacing: { after: 80 },
  })
}
function bullet(text, bold = '') {
  const runs = []
  if (bold) runs.push(new TextRun({ text: bold, bold: true, size: 22 }))
  runs.push(new TextRun({ text, size: 22 }))
  return new Paragraph({
    children: runs,
    bullet: { level: 0 },
    spacing: { after: 60 },
  })
}
function rule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY } },
    spacing: { before: 160, after: 160 },
    children: [new TextRun('')],
  })
}
function noteBox(text) {
  return new Paragraph({
    children: [new TextRun({ text: `Note: ${text}`, size: 20, color: '92400E', italics: true })],
    shading: { type: ShadingType.SOLID, fill: 'FEF3C7' },
    spacing: { before: 80, after: 120 },
  })
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    children: cells.map((text, i) =>
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: String(text),
            bold: isHeader,
            size: isHeader ? 18 : 20,
            color: isHeader ? '94A3B8' : '0F172A',
          })],
          alignment: i > 0 ? AlignmentType.LEFT : AlignmentType.LEFT,
        })],
        borders: {
          top: thinBorder, bottom: thinBorder,
          left: noBorder, right: noBorder,
        },
        shading: isHeader ? { type: ShadingType.SOLID, fill: LIGHT } : undefined,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      })
    ),
    tableHeader: isHeader,
  })
}

function makeTable(headers, rows) {
  return new Table({
    rows: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r)),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder, bottom: noBorder,
      left: noBorder, right: noBorder,
      insideH: thinBorder, insideV: noBorder,
    },
  })
}

// ─── Document body ───────────────────────────────────────────────────────────

const children = [

  // Title block
  h1('AI eLearning Estimator'),
  new Paragraph({
    children: [new TextRun({ text: 'Phase 2 Scope — Save / Reopen Estimates (Database)', bold: true, size: 32, color: '64748B' })],
    spacing: { after: 60 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Addendum to the High-Level Design  ·  prepared 2026-06-16', size: 20, color: '94A3B8' })],
    spacing: { after: 40 },
  }),
  rule(),

  // §1 — Why
  h2('§1  Why this matters'),
  p('Today the estimator is stateless: every browser refresh wipes the form. Laurie must fill out the whole estimate in one sitting and export to Word before closing the tab. If she needs to revisit a past estimate — to re-price, copy it for a similar project, or check what was quoted — she has to re-enter everything by hand from the Word file.'),
  p('Phase 2 adds a lightweight save-and-reload layer so Laurie can:'),
  bullet('Start an estimate, save a draft, and finish it the next day.'),
  bullet('Pull up any past estimate by project name.'),
  bullet('Duplicate an old estimate as the starting point for a new one.'),
  bullet('See a running list of all estimates with totals at a glance.'),
  p('Nothing about the estimator itself changes — the form, the formulas, and the .docx export all stay exactly as they are.'),

  // §2 — Proposed stack
  h2('§2  Proposed technology: Supabase'),
  p('Supabase is the recommended backend. It is a hosted Postgres database with built-in authentication and a JavaScript client that runs directly in the browser — no server to build or manage, and no change to the current Vercel deployment.'),
  p('It pairs naturally with the existing React + Vite + Vercel setup and has a generous free tier.'),
  makeTable(
    ['Component', 'What it provides', 'Cost'],
    [
      ['Supabase Auth', 'Email/password or magic-link login; Laurie logs in once per session', 'Free (up to 50k users)'],
      ['Supabase Postgres', 'Stores each saved estimate as one JSON row', 'Free (up to 500 MB)'],
      ['Supabase JS client', 'Browser-side SDK; no API server needed', 'Free'],
      ['Vercel (existing)', 'Continues to host the React app; no change', '$0 (current plan)'],
    ]
  ),
  new Paragraph({ children: [new TextRun('')], spacing: { after: 120 } }),
  noteBox('The free tier limits are far beyond what a single-user tool will ever need. Monthly cost is $0 unless usage grows to multi-user scale.'),

  // §3 — Data model
  h2('§3  Data model'),
  p('One table is sufficient:'),
  new Paragraph({
    children: [new TextRun({ text: 'estimates', bold: true, size: 22, font: 'Courier New' })],
    spacing: { before: 80, after: 40 },
  }),
  makeTable(
    ['Column', 'Type', 'Notes'],
    [
      ['id', 'uuid (PK)', 'Auto-generated'],
      ['user_id', 'uuid (FK → auth.users)', 'Ties estimate to Laurie\'s account'],
      ['project_name', 'text', 'For display in the estimates list'],
      ['course_name', 'text', 'For display in the estimates list'],
      ['state_json', 'jsonb', 'Full serialized App state (categories, tasks, margins, ADA flags)'],
      ['internal_cost', 'numeric', 'Stored for quick display in the list — no recalc needed'],
      ['client_price', 'numeric', 'Stored for quick display in the list'],
      ['margin_pct', 'integer', '40, 45, or 50'],
      ['created_at', 'timestamptz', 'Auto-set by Supabase'],
      ['updated_at', 'timestamptz', 'Updated on each save'],
    ]
  ),
  new Paragraph({ children: [new TextRun('')], spacing: { after: 120 } }),
  p('The state_json column stores the complete React state snapshot. When Laurie reopens an estimate, the app hydrates directly from this blob — no migration logic needed.'),

  // §4 — New screens / UI changes
  h2('§4  New screens and UI changes'),

  h3('4.1  Login screen (new)'),
  p('A simple full-page login shown when no session exists. Options:'),
  bullet('Magic link (recommended) — Laurie enters her email, Supabase emails a one-click sign-in link. No password to remember.'),
  bullet('Email + password — more traditional; requires Laurie to set a password once.'),
  p('Once logged in, the session persists for 7 days (configurable). She won\'t need to log in every time.'),

  h3('4.2  Estimator screen (minor additions)'),
  p('The form itself is unchanged. Two new elements are added to the header area:'),
  bullet('Save button — saves current state to Supabase. Shows "Saved ✓" confirmation briefly.'),
  bullet('"My estimates" link — navigates to the estimates list screen.'),

  h3('4.3  Estimates list screen (new)'),
  p('A simple table listing all of Laurie\'s saved estimates, most recent first. Columns:'),
  makeTable(
    ['Column', 'Source'],
    [
      ['Project name', 'project_name column'],
      ['Course name', 'course_name column'],
      ['Internal cost', 'internal_cost column (formatted $1,234.56)'],
      ['Client price', 'client_price column'],
      ['Margin', 'margin_pct column'],
      ['Last saved', 'updated_at column'],
      ['Actions', '"Open" button · "Duplicate" button · "Delete" button'],
    ]
  ),
  new Paragraph({ children: [new TextRun('')], spacing: { after: 120 } }),
  bullet('Open — loads the estimate back into the estimator form.'),
  bullet('Duplicate — creates a copy with "(Copy)" appended to the project name; useful for similar projects.'),
  bullet('Delete — removes the row after a confirmation prompt.'),

  // §5 — What does NOT change
  h2('§5  What does not change'),
  p('This is deliberately a thin layer on top of the existing app:'),
  bullet('All formulas — Fixed/Dynamic scaling, ADA uplift, margin — are unchanged.'),
  bullet('All components — CategoryBlock, SubtaskRow, TotalsBar, ExportPreview — are unchanged.'),
  bullet('The .docx export works exactly as it does today.'),
  bullet('The public embed iframe continues to work (unauthenticated visitors just see the login screen).'),
  bullet('Vercel deployment is unchanged — the app is still a static React SPA.'),

  // §6 — Effort estimate
  h2('§6  Effort estimate'),
  makeTable(
    ['Task', 'Who', 'Est. hours'],
    [
      ['Supabase project setup (DB, auth, env vars)', 'Dev', '2 h'],
      ['Login screen + session handling', 'Dev', '3 h'],
      ['Save / auto-save logic in App.jsx', 'Dev', '3 h'],
      ['Estimates list screen + Open / Duplicate / Delete', 'Dev', '4 h'],
      ['UI polish + responsive adjustments', 'Dev', '2 h'],
      ['Testing (save/load round-trip, session expiry, edge cases)', 'Dev + Laurie', '3 h'],
      ['', 'Total', '~17 h'],
    ]
  ),
  new Paragraph({ children: [new TextRun('')], spacing: { after: 80 } }),
  noteBox('17 hours is a rough ceiling. The core save/load is ~8 h; the rest is auth, list UI, and polish. Could be delivered over 2–3 focused working days.'),

  // §7 — Open decisions for Laurie
  h2('§7  Decisions needed from Laurie before Phase 2 starts'),
  p('These are genuine choices — no right answer, just preference:'),
  bullet('Login method: ', 'Magic link (no password) vs. email + password?'),
  bullet('Auto-save: ', 'Save automatically every time a field changes, or only on an explicit "Save" button click?'),
  bullet('Estimate naming: ', 'Should project name + course name be required before saving, or allow unnamed drafts?'),
  bullet('Duplicate behavior: ', 'When duplicating, should the copy open immediately for editing, or just appear in the list?'),
  bullet('Sharing: ', 'Is this always single-user (Laurie only), or does it need to be shareable with Michelle or a client in the future?'),

  // §8 — Out of scope
  h2('§8  Out of scope for Phase 2'),
  p('The following are explicitly deferred to a later phase and should not be built alongside Phase 2:'),
  bullet('Multi-user accounts or role-based access.'),
  bullet('PDF export.'),
  bullet('CRM / accounting integrations.'),
  bullet('Client-facing portal or sharing links.'),
  bullet('SOW (Statement of Work) auto-generation.'),
  bullet('Editable rates screen.'),

  rule(),

  new Paragraph({
    children: [new TextRun({ text: 'AI eLearning Estimator · Phase 2 Scope Document · prepared 2026-06-16', size: 18, color: 'AAAAAA' })],
    alignment: AlignmentType.CENTER,
  }),
]

// ─── Build and write ──────────────────────────────────────────────────────────

const doc = new Document({ sections: [{ children }] })
const buffer = await Packer.toBuffer(doc)
const outPath = join(__dirname, '..', 'AI_eLearning_Estimator_Phase2_Database.docx')
writeFileSync(outPath, buffer)
console.log(`Written: ${outPath}`)
