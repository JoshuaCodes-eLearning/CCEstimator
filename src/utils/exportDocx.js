import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, ShadingType,
  HeadingLevel,
} from 'docx'
import { saveAs } from 'file-saver'
import { computeHours, lineCost, categorySubtotal } from './calc'
import { DEFAULT_MINUTES, ADA_RATES, CAT_LABELS } from '../config/config'

const NAVY = '1E2D3D'
const WHITE = 'FFFFFF'
const LIGHT_BG = 'F8FAFC'
const BLUE_BG = 'EFF6FF'
const GREEN_HEX = '16A34A'
const BORDER_COLOR = 'E2E8F0'

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR }

function cell(children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    borders: {
      top: opts.borderTop || thinBorder,
      bottom: opts.borderBottom || thinBorder,
      left: noBorder,
      right: noBorder,
    },
    shading: opts.shading,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    ...opts.cellProps,
  })
}

function headerCell(text) {
  return cell(
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 18, color: '94A3B8' })],
    }),
    { shading: { type: ShadingType.SOLID, fill: LIGHT_BG }, borderBottom: thinBorder }
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

export async function generateAndSaveDocx({ projectName, courseName, selectedKeys, cats, memberHours, internalCost, clientPrice, marginPct = 50 }) {
  const children = []

  // Title
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

  // Project / course info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Project name  ', color: '888888', size: 22 }),
        new TextRun({ text: projectName || '—', bold: true, size: 22 }),
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

  // Categories
  for (const catKey of selectedKeys) {
    const cat = cats[catKey]
    const defMin = DEFAULT_MINUTES[catKey]
    const addedMin = cat.additionalMinutes
    const totalMin = defMin + addedMin
    const hasAda = cat.adaEnabled && ADA_RATES[catKey] > 0
    const includedTasks = cat.tasks.filter(t => t.included)
    const subtotal = categorySubtotal(catKey, cat)
    const baseSum = hasAda ? subtotal / (1 + ADA_RATES[catKey]) : subtotal
    const adaAmount = hasAda ? subtotal - baseSum : 0

    let headerText = `${CAT_LABELS[catKey]} — total length ${totalMin} min`
    if (addedMin > 0) headerText += ` (${defMin} default + ${addedMin} additional)`
    if (hasAda) headerText += '  ·  ADA compliant (+10%)'

    children.push(navyHeaderPara(headerText))

    const tableRows = [
      new TableRow({
        children: ['TASK', 'WHO', 'HRS', 'TYPE', 'LINE COST'].map(h => headerCell(h)),
        tableHeader: true,
      }),
      ...includedTasks.map(task => {
        const hrs = computeHours(task, catKey, addedMin)
        const cost = lineCost(task, catKey, addedMin)
        return new TableRow({
          children: [
            dataCell(task.name),
            dataCell(task.responsible),
            dataCell(Math.round(hrs * 10) / 10),
            dataCell(task.type),
            dataCell(`$${cost.toFixed(2)}`, { align: AlignmentType.RIGHT }),
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

    const subtotalParts = [
      new TextRun({ text: `${CAT_LABELS[catKey]} subtotal`, bold: true, size: 22 }),
    ]
    if (hasAda) {
      subtotalParts.push(new TextRun({ text: `   subtotal $${baseSum.toFixed(2)} + ADA 10% ($${adaAmount.toFixed(2)})`, color: '888888', size: 18 }))
    }
    subtotalParts.push(new TextRun({ text: `   $${subtotal.toFixed(2)}`, bold: true, size: 24, color: NAVY }))

    children.push(
      new Paragraph({ children: subtotalParts, spacing: { before: 80, after: 240 }, alignment: AlignmentType.RIGHT })
    )
  }

  // Combined hours
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Combined hours per team member', bold: true, size: 22, color: NAVY })],
      shading: { type: ShadingType.SOLID, fill: BLUE_BG },
      spacing: { before: 120, after: 80 },
    }),
    ...Object.entries(memberHours).map(([name, hrs]) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${name}`, size: 22 }),
          new TextRun({ text: `\t${Math.round(hrs)} h`, bold: true, size: 22 }),
        ],
        spacing: { after: 40 },
      })
    ),
  )

  // Final rule
  children.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 8, color: NAVY } },
      spacing: { before: 200, after: 100 },
      children: [new TextRun('')],
    }),
  )

  // Totals
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Internal cost', size: 22, color: '64748B' }),
        new TextRun({ text: `\t$${internalCost.toFixed(2)}`, bold: true, size: 22 }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Client price (${marginPct}% margin)`, bold: true, size: 28 }),
        new TextRun({ text: `\t$${clientPrice.toFixed(2)}`, bold: true, size: 32, color: GREEN_HEX }),
      ],
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '50% margin applied. Estimate only; not a contract.', size: 18, color: 'AAAAAA' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'AI eLearning Estimator · generated 2026', size: 18, color: 'AAAAAA' })],
      alignment: AlignmentType.CENTER,
    }),
  )

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const filename = projectName ? `${projectName} - Estimate.docx` : 'Estimate.docx'
  saveAs(blob, filename)
}
