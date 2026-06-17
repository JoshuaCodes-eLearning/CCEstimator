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
const ALT_ROW    = 'F1F5F9'
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
      children: [new TextRun({ text, bold: true, size: 18, color: '64748B' })],
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
    spacing: { before: 280, after: 0 },
  })
}

export async function generateAndSaveDocx({ companyName, courseName, selectedKeys, cats, memberHours, internalCost, clientPrice, marginPct = 50 }) {
  const children = []

  // ── Title ─────────────────────────────────────────────────
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: 'eLearning Project Estimate', bold: true, size: 52, color: NAVY })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: NAVY } },
      spacing: { after: 220 },
      children: [new TextRun('')],
    }),
  )

  // ── Company / Course info ──────────────────────────────────
  const year = new Date().getFullYear()
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Company name  ', color: '94A3B8', size: 20 }),
        new TextRun({ text: companyName || '—', bold: true, size: 20, color: '0F172A' }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Course name   ', color: '94A3B8', size: 20 }),
        new TextRun({ text: courseName || '—', bold: true, size: 20, color: '0F172A' }),
      ],
      spacing: { after: 320 },
    }),
  )

  // ── Category sections ──────────────────────────────────────
  for (const catKey of selectedKeys) {
    const cat = cats[catKey]
    const defMin       = DEFAULT_MINUTES[catKey]
    const addedMin     = cat.additionalMinutes
    const totalMin     = defMin + addedMin
    const hasAda       = cat.adaEnabled && ADA_RATES[catKey] > 0
    const includedTasks = cat.tasks.filter(t => t.included)
    const subtotal     = categorySubtotal(catKey, cat)
    const baseSum      = hasAda ? subtotal / (1 + ADA_RATES[catKey]) : subtotal
    const adaAmount    = hasAda ? subtotal - baseSum : 0

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
      ...includedTasks.map((task, idx) => {
        const hrs  = computeHours(task, catKey, addedMin)
        const cost = lineCost(task, catKey, addedMin)
        const rowBg = idx % 2 === 1 ? ALT_ROW : WHITE
        const shade = { type: ShadingType.SOLID, fill: rowBg }
        return new TableRow({
          children: [
            dataCell(task.name,                                                          { shading: shade, width: COL_W[0] }),
            dataCell(task.responsible,                                                   { shading: shade, width: COL_W[1] }),
            dataCell(Math.round(hrs * 10) / 10,    { align: AlignmentType.CENTER,        shading: shade, width: COL_W[2] }),
            dataCell(task.type,                                                          { shading: shade, width: COL_W[3] }),
            dataCell(fmtNum(cost),                 { align: AlignmentType.RIGHT,         shading: shade, width: COL_W[4] }),
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

    // Subtotal row
    const subtotalParts = [
      new TextRun({ text: `${CAT_LABELS[catKey]} subtotal`, bold: true, size: 22, color: '475569' }),
    ]
    if (hasAda) {
      subtotalParts.push(new TextRun({ text: `   base ${fmtNum(baseSum)} + ADA 10% (${fmtNum(adaAmount)})`, color: '94A3B8', size: 18 }))
    }
    subtotalParts.push(new TextRun({ text: `   ${fmtNum(subtotal)}`, bold: true, size: 26, color: NAVY }))

    children.push(
      new Paragraph({
        children: subtotalParts,
        spacing: { before: 100, after: 280 },
        alignment: AlignmentType.RIGHT,
        shading: { type: ShadingType.SOLID, fill: BLUE_BG },
      })
    )
  }

  // ── Combined hours table ───────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Combined hours per team member', bold: true, size: 22, color: WHITE })],
      shading: { type: ShadingType.SOLID, fill: NAVY },
      spacing: { before: 160, after: 0 },
    }),
  )

  const hoursTableRows = [
    new TableRow({
      children: ['TEAM MEMBER', 'HOURS', 'RATE', 'SUBTOTAL'].map((h, i) =>
        headerCell(h, [30, 20, 20, 30][i])
      ),
      tableHeader: true,
    }),
    ...Object.entries(memberHours).map(([name, hrs], idx) => {
      const rate    = RATES[name] ?? 0
      const subtot  = hrs * rate
      const rowBg   = idx % 2 === 1 ? ALT_ROW : WHITE
      const shade   = { type: ShadingType.SOLID, fill: rowBg }
      return new TableRow({
        children: [
          dataCell(name,                                                         { shading: shade, width: 30 }),
          dataCell(`${Math.round(hrs * 10) / 10}h`, { align: AlignmentType.CENTER, shading: shade, width: 20 }),
          dataCell(`$${rate}/hr`,                   { align: AlignmentType.CENTER, shading: shade, width: 20 }),
          dataCell(fmtNum(subtot),                  { align: AlignmentType.RIGHT,  shading: shade, width: 30 }),
        ],
      })
    }),
  ]

  children.push(
    new Table({
      rows: hoursTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: thinBorder, insideV: noBorder },
    })
  )

  // ── Final totals ───────────────────────────────────────────
  children.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 10, color: NAVY } },
      spacing: { before: 280, after: 100 },
      children: [new TextRun('')],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Internal cost', size: 22, color: '64748B' }),
        new TextRun({ text: `\t${fmtNum(internalCost)}`, bold: true, size: 22, color: '0F172A' }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Client price (${marginPct}% margin)`, bold: true, size: 30, color: NAVY }),
        new TextRun({ text: `\t${fmtNum(clientPrice)}`, bold: true, size: 34, color: GREEN_HEX }),
      ],
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${marginPct}% margin applied. Estimate only — not a contract.`, size: 18, color: 'AAAAAA' })],
      spacing: { after: 160 },
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
