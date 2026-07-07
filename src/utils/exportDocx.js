import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle, ShadingType,
  HeadingLevel,
} from 'docx'
import { saveAs } from 'file-saver'
import { computeAssigneeHoursForTask, expenseCostForCategory } from './calc'
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
      children: [new TextRun({ text, bold: true, size: 18, color: '475569' })],
    }),
    { shading: { type: ShadingType.CLEAR, fill: 'DDE3EA', color: 'auto' }, borderBottom: thinBorder, width }
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
    shading: { type: ShadingType.CLEAR, fill: NAVY, color: 'auto' },
    spacing: { before: 240, after: 0 },
  })
}

function sectionLabelPara(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 18, color: '2563EB' })],
    shading: { type: ShadingType.CLEAR, fill: 'EFF6FF', color: 'auto' },
    spacing: { before: 0, after: 0 },
  })
}

function taskTable(tasks, catKey, addedMin) {
  const COL_W = [52, 18, 10, 20]
  const headerRow = new TableRow({
    children: ['TASK', 'WHO', 'HRS', 'LINE COST'].map((h, i) => headerCell(h, COL_W[i])),
    tableHeader: true,
  })
  // Alternate shading per task (all assignee rows of the same task share a colour).
  // Always include color: 'auto' to prevent docx from rendering text in the fill colour.
  let taskIdx = 0
  const dataRows = tasks.flatMap(task => {
    const shade = (taskIdx++ % 2) !== 0
      ? { type: ShadingType.CLEAR, fill: 'F1F5F9', color: 'auto' }
      : { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' }
    return (task.assignees ?? []).map((a, idx) => {
      const hrs  = computeAssigneeHoursForTask(a, task, catKey, addedMin)
      const cost = hrs * (RATES[a.person] ?? 0)
      return new TableRow({
        children: [
          dataCell(idx === 0 ? task.name : '', { width: COL_W[0], shading: shade, textProps: idx === 0 ? { bold: true } : {} }),
          dataCell(a.person,                   { width: COL_W[1], shading: shade }),
          dataCell(Math.round(hrs * 10) / 10,  { align: AlignmentType.CENTER, width: COL_W[2], shading: shade }),
          dataCell(fmtNum(cost),               { align: AlignmentType.RIGHT,  width: COL_W[3], shading: shade }),
        ],
      })
    })
  })
  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: thinBorder, insideV: noBorder },
  })
}

function subtotalPara(label, amount, opts = {}) {
  const parts = []
  if (opts.adaNote) {
    parts.push(new TextRun({ text: opts.adaNote, color: 'D97706', size: 18 }))
    parts.push(new TextRun({ text: '   ' }))
  }
  parts.push(new TextRun({ text: label, bold: true, size: 22 }))
  parts.push(new TextRun({ text: `   ${fmtNum(amount)}`, bold: true, size: 24, color: NAVY }))
  return new Paragraph({
    children: parts,
    spacing: { before: 80, after: opts.afterSpacing ?? 120 },
    alignment: AlignmentType.RIGHT,
  })
}

export async function generateAndSaveDocx({ companyName, clientName, courseName, estimateDate, selectedKeys, cats, memberHours, internalCost, clientPrice, marginPct = 50 }) {
  const children = []
  const dateObj = estimateDate ?? new Date()
  const dateStr = dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  const generatedYear = new Date().getFullYear()

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

  // ── Company / Client / Course / Date info ──────────────────
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
        new TextRun({ text: 'Client name   ', color: '888888', size: 22 }),
        new TextRun({ text: clientName || '—', bold: true, size: 22 }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Course name   ', color: '888888', size: 22 }),
        new TextRun({ text: courseName || '—', bold: true, size: 22 }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Date          ', color: '888888', size: 22 }),
        new TextRun({ text: dateStr, bold: true, size: 22 }),
      ],
      spacing: { after: 300 },
    }),
  )

  // ── Category sections ──────────────────────────────────────
  for (const catKey of selectedKeys) {
    const cat          = cats[catKey]
    const isMicrovideo = catKey === 'microvideo'
    const defMin       = DEFAULT_MINUTES[catKey]
    const addedMin     = cat.additionalMinutes
    const totalMin     = defMin + addedMin
    const hasAda       = cat.adaEnabled && ADA_RATES[catKey] > 0
    const adaRate      = hasAda ? ADA_RATES[catKey] : 0
    const moduleCount  = cat.moduleCount ?? 1
    const extraModules = isMicrovideo ? 0 : (moduleCount - 1)
    const unit         = isMicrovideo ? 'video' : 'module'
    const Unit         = unit.charAt(0).toUpperCase() + unit.slice(1)
    const additionalVideos = cat.additionalVideos ?? []

    const mod1Tasks = cat.tasks.filter(t => t.included && t.type !== 'Expense')
    let mod1BaseSum = 0
    mod1Tasks.forEach(t => {
      ;(t.assignees ?? []).forEach(a => {
        mod1BaseSum += computeAssigneeHoursForTask(a, t, catKey, addedMin) * (RATES[a.person] ?? 0)
      })
    })
    const wellsaidCost = expenseCostForCategory(cat)

    const secondTasks = (cat.secondState?.tasks ?? []).filter(t => t.included && t.type !== 'Expense')

    if (isMicrovideo) {
      // ── Microvideo section ──────────────────────────────────
      const hasAdditional = additionalVideos.length > 0
      const additionalVideosCosts = additionalVideos.map(video => {
        const vAddedMin = video.minutes - defMin
        let cost = 0
        secondTasks.forEach(t => {
          ;(t.assignees ?? []).forEach(a => {
            cost += computeAssigneeHoursForTask(a, t, catKey, vAddedMin) * (RATES[a.person] ?? 0)
          })
        })
        return { video, cost }
      })
      const additionalVideosTotalCost = additionalVideosCosts.reduce((s, { cost }) => s + cost, 0)
      const totalCost = mod1BaseSum + additionalVideosTotalCost + wellsaidCost

      let headerText = `${CAT_LABELS[catKey]} — total length ${totalMin} min`
      if (addedMin > 0) headerText += ` (${defMin} default + ${addedMin} additional)`
      if (hasAdditional) headerText += `  ·  ${additionalVideos.length + 1} videos`

      children.push(navyHeaderPara(headerText))

      if (hasAdditional) {
        children.push(sectionLabelPara(`Video 1 (${totalMin} min)`))
      }
      children.push(taskTable(mod1Tasks, catKey, addedMin))

      if (!hasAdditional) {
        children.push(subtotalPara('Microvideo subtotal', mod1BaseSum + wellsaidCost, {
          adaNote: wellsaidCost > 0 ? `+ WellSaid add-on (${fmtNum(wellsaidCost)})` : null,
          afterSpacing: 240,
        }))
      } else {
        children.push(subtotalPara('Video 1 subtotal', mod1BaseSum, { afterSpacing: 80 }))

        children.push(new Paragraph({
          border: { bottom: { style: BorderStyle.DASHED, size: 6, color: 'CCCCCC' } },
          spacing: { before: 160, after: 160 },
          children: [new TextRun('')],
        }))

        children.push(sectionLabelPara(`Additional Video Template — applied to Videos 2–${additionalVideos.length + 1}`))
        children.push(taskTable(secondTasks, catKey, 0))

        additionalVideosCosts.forEach(({ video, cost }, idx) => {
          children.push(subtotalPara(`Video ${idx + 2} (${video.minutes} min)`, cost, { afterSpacing: 60 }))
        })

        children.push(subtotalPara(
          `Microvideo total — ${additionalVideos.length + 1} videos`,
          totalCost,
          { adaNote: wellsaidCost > 0 ? `+ WellSaid add-on (${fmtNum(wellsaidCost)})` : null, afterSpacing: 240 }
        ))
      }
    } else {
      // ── Rise / Storyline section ────────────────────────────
      let secondPerModule = 0
      secondTasks.forEach(t => {
        ;(t.assignees ?? []).forEach(a => {
          secondPerModule += computeAssigneeHoursForTask(a, t, catKey, addedMin) * (RATES[a.person] ?? 0)
        })
      })
      const secondTotalCost = secondPerModule * extraModules
      const combinedBase = mod1BaseSum + secondTotalCost
      const adaAmount    = combinedBase * adaRate
      const overallTotal = combinedBase + adaAmount + wellsaidCost

      let headerText = `${CAT_LABELS[catKey]} — total length ${totalMin} min`
      if (addedMin > 0) headerText += ` (${defMin} default + ${addedMin} additional)`
      if (moduleCount > 1) headerText += `  ·  ${moduleCount} ${unit}s`
      if (hasAda) headerText += '  ·  ADA compliant (+10%)'

      children.push(navyHeaderPara(headerText))

      if (moduleCount > 1) {
        children.push(sectionLabelPara(`${Unit} 1`))
      }
      children.push(taskTable(mod1Tasks, catKey, addedMin))

      if (moduleCount === 1) {
        const notes = []
        if (hasAda) notes.push(`base ${fmtNum(mod1BaseSum)} + ADA 10% (${fmtNum(mod1BaseSum * adaRate)})`)
        if (wellsaidCost > 0) notes.push(`+ WellSaid add-on (${fmtNum(wellsaidCost)})`)
        children.push(subtotalPara(
          `${CAT_LABELS[catKey]} subtotal`,
          mod1BaseSum * (1 + adaRate) + wellsaidCost,
          { adaNote: notes.join('   ') || null, afterSpacing: 240 }
        ))
      } else {
        children.push(subtotalPara(`${Unit} 1 subtotal`, mod1BaseSum, { afterSpacing: 80 }))

        children.push(new Paragraph({
          border: { bottom: { style: BorderStyle.DASHED, size: 6, color: 'CCCCCC' } },
          spacing: { before: 160, after: 160 },
          children: [new TextRun('')],
        }))

        const secondLabel = moduleCount === 2 ? `${Unit} 2` : `${Unit}s 2–${moduleCount}`
        children.push(sectionLabelPara(`${secondLabel}  — implied after ${unit} 2`))
        children.push(taskTable(secondTasks, catKey, addedMin))
        children.push(subtotalPara(`Per-${unit} rate`, secondPerModule, { afterSpacing: 60 }))
        if (extraModules > 1) {
          children.push(subtotalPara(`${secondLabel} subtotal (× ${extraModules})`, secondTotalCost, { afterSpacing: 60 }))
        }

        const notes = []
        if (hasAda) notes.push(`base ${fmtNum(combinedBase)} + ADA 10% (${fmtNum(adaAmount)})`)
        if (wellsaidCost > 0) notes.push(`+ WellSaid add-on (${fmtNum(wellsaidCost)})`)
        children.push(subtotalPara(
          `${CAT_LABELS[catKey]} total — ${moduleCount} ${unit}s`,
          overallTotal,
          { adaNote: notes.join('   ') || null, afterSpacing: 240 }
        ))
      }
    }
  }

  // ── Combined hours table ───────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Combined hours per team member', bold: true, size: 22, color: NAVY })],
      shading: { type: ShadingType.CLEAR, fill: BLUE_BG, color: 'auto' },
      spacing: { before: 120, after: 0 },
    }),
  )

  const HOURS_COL_W = [30, 20, 20, 30]
  const hoursRows = [
    new TableRow({
      children: ['TEAM MEMBER', 'HOURS', 'RATE', 'SUBTOTAL'].map((h, i) => headerCell(h, HOURS_COL_W[i])),
      tableHeader: true,
    }),
    ...Object.entries(memberHours).map(([name, hrs], rowIdx) => {
      const shade = rowIdx % 2 !== 0
        ? { type: ShadingType.CLEAR, fill: 'F1F5F9', color: 'auto' }
        : { type: ShadingType.CLEAR, fill: 'FFFFFF', color: 'auto' }
      const rate   = RATES[name] ?? 0
      const subtot = hrs * rate
      return new TableRow({
        children: [
          dataCell(name,                                                        { width: HOURS_COL_W[0], shading: shade }),
          dataCell(`${Math.round(hrs * 10) / 10}h`, { align: AlignmentType.CENTER, width: HOURS_COL_W[1], shading: shade }),
          dataCell(`$${rate}/hr`,                   { align: AlignmentType.CENTER, width: HOURS_COL_W[2], shading: shade }),
          dataCell(fmtNum(subtot),                  { align: AlignmentType.RIGHT,  width: HOURS_COL_W[3], shading: shade }),
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
      children: [new TextRun({ text: `Cobblestone AI eLearning Estimator · generated ${generatedYear}`, size: 18, color: 'AAAAAA' })],
      alignment: AlignmentType.CENTER,
    }),
  )

  const doc  = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)

  const parts    = [companyName, courseName].filter(Boolean)
  const filename = parts.length > 0 ? `${parts.join(' - ')} - Estimate.docx` : 'Estimate.docx'
  saveAs(blob, filename)
}
