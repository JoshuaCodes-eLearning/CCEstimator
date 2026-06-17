import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, ShadingType,
  HeadingLevel,
} from 'docx'
import { saveAs } from 'file-saver'
import { computeHours, lineCost, categorySubtotal } from './calc'
import { DEFAULT_MINUTES, ADA_RATES, CAT_LABELS, RATES } from '../config/config'

const NAVY       = '1E2D3D'
const WHITE      = 'FFFFFF'
const LIGHT_BG   = 'F8FAFC'
const BLUE_BG    = 'EFF6FF'
const GREEN_HEX  = '16A34A'
const BORDER_COLOR = 'E2E8F0'

const noBorder   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' }
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR }

function fmtNum(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function cell(children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    borders: {
      top:    opts.borderTop    || thinBorder,
      bottom: opts.borderBottom || thinBorder,
      left:   noBorder,
      right:  noBorder,
    },
    shading: opts.shading,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    ...opts.cellProps,
  })
}

function headerCell(text, width) {
  return cell(
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 18, color: '94A3B8' })],
    }),
    { shading: { type: ShadingType.SOLID, fill: LIGHT_BG }, borderBottom: thinBorder, width }
  )
}

function dataCell(text, opts = {}) {
  return cell(
    new Paragraph({
      children: [new TextRun({ text: String(text), size: 20, color: '0F172A', ...opts.textProps })],
      alignment: opts.align || AlignmentType.LEFT,
    }),
    opts
  )
}

function navyHeaderPara(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: WHITE })],
    shading: { type: ShadingType.SOLID, fill: NAVY },
    spacing: { before: 240, after: 0 },
  })
}

export async function generateAndSaveDocx({ companyName, courseName, selectedKeys, cats, memberHours, internalCost, clientPrice, marginPct = 50 }) {
  const children = []
  const year = new Date().getFullYear()

  // ── Title ─────────────────────────────────────────────────
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'eLearning Project Estimate', bold: true, size: 48, color: NAVY })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY } },
      spacing: { after: 200 },
      children: [new TextRun('')],
    }),
  )

  // ── Company / Course info ──────────────────────────────────
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Company name  ', color: '888888', size: 22 }),
        new TextRun({ text: companyName || '—', bold: true, size: 22 }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Course name   ', color: '888888', size: 22 }),
        new TextRun({ text: courseName || '—', bold: true, size: 22 }),
      ],
      spacing: { after: 300 },
    }),
  )

  // ── Category sections ──────────────────────────────────────
  for (const catKey of selectedKeys) {
    const cat           = cats[catKey]
    const defMin        = DEFAULT_MINUTES[catKey]
    const addedMin      = cat.additionalMinutes
    const totalMin      = defMin + addedMin
    const hasAda        = cat.adaEnabled && ADA_RATES[catKey] > 0
    const includedTasks = cat.tasks.filter(t => t.included)
    const subtotal      = categorySubtotal(catKey, cat)
    const baseSum       = hasAda ? subtotal / (1 + ADA_RATES[catKey]) : subtotal
    const adaAmount     = hasAda ? subtotal - baseSum : 0

    let headerText = `${CAT_LABELS[catKey]} — total length ${totalMin} min`
    if (addedMin > 0) headerText += ` (${defMin} default + ${addedMin} additional)`
    if (hasAda)       headerText += '  ·  ADA compliant (+10%)'

    children.push(navyHeaderPara(headerText))

    // Task table — col widths: task 44%, who 14%, hrs 10%, type 14%, cost 18%
    const COL_W = [44, 14, 10, 14, 18]
    const tableRows = [
      new TableRow({
        children: ['TASK', 'WHO', 'HRS', 'TYPE', 'LINE COST'].map((h, i) => headerCell(h, COL_W[i])),
        tableHeader: true,
      }),
      ...includedTasks.map(task => {
        const hrs  = computeHours(task, catKey, addedMin)
        const cost = lineCost(task, catKey, addedMin)
        return new TableRow({
          children: [
            dataCell(task.name,                                                         { width: COL_W[0] }),
            dataCell(task.responsible,                                                  { width: COL_W[1] }),
            dataCell(Math.round(hrs * 10) / 10, { align: AlignmentType.CENTER,          width: COL_W[2] }),
            dataCell(task.type,                                                         { width: COL_W[3] }),
            dataCell(fmtNum(cost),              { align: AlignmentType.RIGHT,           width: COL_W[4] }),
          ],
        })
      }),
    ]

    children.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: thinBorder, insideV: noBorder },
      })
    )

    // Subtotal
    const subtotalParts = [
      new TextRun({ text: `${CAT_LABELS[catKey]} subtotal`, bold: true, size: 22 }),
    ]
    if (hasAda) {
      subtotalParts.push(new TextRun({ text: `   base ${fmtNum(baseSum)} + ADA 10% (${fmtNum(adaAmount)})`, color: '888888', size: 18 }))
    }
    subtotalParts.push(new TextRun({ text: `   ${fmtNum(subtotal)}`, bold: true, size: 24, color: NAVY }))

    children.push(
      new Paragraph({ children: subtotalParts, spacing: { before: 80, after: 240 }, alignment: AlignmentType.RIGHT })
    )
  }

  // ── Combined hours table ───────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Combined hours per team member', bold: true, size: 22, color: NAVY })],
      shading: { type: ShadingType.SOLID, fill: BLUE_BG },
      spacing: { before: 120, after: 0 },
    }),
  )

  const HOURS_COL_W = [30, 20, 20, 30]
  const hoursRows = [
    new TableRow({
      children: ['TEAM MEMBER', 'HOURS', 'RATE', 'SUBTOTAL'].map((h, i) => headerCell(h, HOURS_COL_W[i])),
      tableHeader: true,
    }),
    ...Object.entries(memberHours).map(([name, hrs]) => {
      const rate   = RATES[name] ?? 0
      const subtot = hrs * rate
      return new TableRow({
        children: [
          dataCell(name,                                                        { width: HOURS_COL_W[0] }),
          dataCell(`${Math.round(hrs * 10) / 10}h`, { align: AlignmentType.CENTER, width: HOURS_COL_W[1] }),
          dataCell(`$${rate}/hr`,                   { align: AlignmentType.CENTER, width: HOURS_COL_W[2] }),
          dataCell(fmtNum(subtot),                  { align: AlignmentType.RIGHT,  width: HOURS_COL_W[3] }),
        ],
      })
    }),
  ]

  children.push(
    new Table({
      rows: hoursRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: thinBorder, insideV: noBorder },
    })
  )

  // ── Final totals ───────────────────────────────────────────
  children.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: NAVY } },
      spacing: { before: 200, after: 100 },
      children: [new TextRun('')],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Internal cost', size: 22, color: '64748B' }),
        new TextRun({ text: `\t${fmtNum(internalCost)}`, bold: true, size: 22 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Client price (${marginPct}% margin)`, bold: true, size: 28 }),
        new TextRun({ text: `\t${fmtNum(clientPrice)}`, bold: true, size: 32, color: GREEN_HEX }),
      ],
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${marginPct}% margin applied. Estimate only; not a contract.`, size: 18, color: 'AAAAAA' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `AI eLearning Estimator · generated ${year}`, size: 18, color: 'AAAAAA' })],
      alignment: AlignmentType.CENTER,
    }),
  )

  const doc  = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)

  const parts    = [companyName, courseName].filter(Boolean)
  const filename = parts.length > 0 ? `${parts.join(' - ')} - Estimate.docx` : 'Estimate.docx'
  saveAs(blob, filename)
}
