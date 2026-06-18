import { generateAndSaveDocx } from '../utils/exportDocx'
import { computeAssigneeHoursForTask, fmt } from '../utils/calc'
import { DEFAULT_MINUTES, ADA_RATES, RATES, CAT_LABELS } from '../config/config'

function taskCost(task, catKey, addedMin) {
  return (task.assignees ?? []).reduce((sum, a) => {
    return sum + computeAssigneeHoursForTask(a, task, catKey, addedMin) * (RATES[a.person] ?? 0)
  }, 0)
}

export default function ExportPreview({
  companyName,
  courseName,
  selectedKeys,
  catStates,
  memberHours,
  internalCost,
  clientPrice,
  marginPct,
  onBack,
}) {
  async function handleDownload() {
    await generateAndSaveDocx({
      companyName,
      courseName,
      selectedKeys,
      cats: catStates,
      memberHours,
      internalCost,
      clientPrice,
      marginPct,
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">AI eLearning Estimator</span>
        <span className="screen-label">Screen 2 — Export Preview</span>
      </header>

      <div className="preview-toolbar">
        <button type="button" className="back-btn" onClick={onBack}>← Back to edit</button>
        <span className="preview-hint">Review the combined estimate exactly as it will appear in Word.</span>
        <button type="button" className="download-btn" onClick={handleDownload}>⬇ Download .docx</button>
      </div>

      <div className="preview-outer">
        <div className="preview-doc">
          <h1 className="doc-title">eLearning Project Estimate</h1>
          <hr className="doc-rule" />

          <div className="doc-meta">
            <div className="doc-meta-row">
              <span className="doc-meta-key">Company name</span>
              <span className="doc-meta-val">{companyName || '—'}</span>
            </div>
            <div className="doc-meta-row">
              <span className="doc-meta-key">Course name</span>
              <span className="doc-meta-val">{courseName || '—'}</span>
            </div>
          </div>

          {selectedKeys.map(catKey => {
            const cat          = catStates[catKey]
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

            const mod1Tasks = cat.tasks.filter(t => t.included)
            const mod1BaseSum = mod1Tasks.reduce((s, t) => s + taskCost(t, catKey, addedMin), 0)

            const secondTasks = (cat.secondState?.tasks ?? []).filter(t => t.included)

            // Renders all assignee rows for a task list
            function renderTaskRows(tasks, addMin) {
              if (tasks.length === 0) {
                return <tr className="doc-table-muted"><td colSpan={5}>No tasks selected</td></tr>
              }
              return tasks.flatMap(task =>
                (task.assignees ?? []).map((a, idx) => {
                  const h    = computeAssigneeHoursForTask(a, task, catKey, addMin)
                  const cost = h * (RATES[a.person] ?? 0)
                  return (
                    <tr key={`${task.id}-a${idx}`}>
                      <td className={idx > 0 ? 'doc-cell-continuation' : ''}>{idx === 0 ? task.name : ''}</td>
                      <td>{a.person}</td>
                      <td style={{ textAlign: 'center' }}>{parseFloat(h.toFixed(1))}</td>
                      <td>{idx === 0 ? task.type : ''}</td>
                      <td>{fmt(cost)}</td>
                    </tr>
                  )
                })
              )
            }

            // ── Microvideo ──────────────────────────────────────────
            if (isMicrovideo) {
              const hasAdditional = additionalVideos.length > 0
              const additionalVideosCosts = additionalVideos.map(video => {
                const vAddedMin = video.minutes - defMin
                const cost = secondTasks.reduce((s, t) => s + taskCost(t, catKey, vAddedMin), 0)
                return { video, cost }
              })
              const additionalVideosTotalCost = additionalVideosCosts.reduce((s, { cost }) => s + cost, 0)
              const totalCost = mod1BaseSum + additionalVideosTotalCost

              let headerText = `${CAT_LABELS[catKey]} — total length ${totalMin} min`
              if (addedMin > 0) headerText += ` (${defMin} default + ${addedMin} additional)`
              if (hasAdditional) headerText += `  ·  ${additionalVideos.length + 1} videos`

              return (
                <div key={catKey} className="doc-cat">
                  <div className="doc-cat-heading">{headerText}</div>

                  {hasAdditional && (
                    <div className="doc-module-label">Video 1 ({totalMin} min)</div>
                  )}

                  <table className="doc-table">
                    <thead>
                      <tr><th>Task</th><th>Who</th><th>Hrs</th><th>Type</th><th>Line Cost</th></tr>
                    </thead>
                    <tbody>{renderTaskRows(mod1Tasks, addedMin)}</tbody>
                  </table>

                  <div className="doc-subtotal-row">
                    <span className="doc-subtotal-label">
                      {hasAdditional ? 'Video 1 subtotal' : 'Microvideo subtotal'}
                    </span>
                    <span className="doc-subtotal-value">{fmt(mod1BaseSum)}</span>
                  </div>

                  {hasAdditional && (
                    <>
                      <hr className="doc-section-divider" />
                      <div className="doc-module-label doc-module-label--second">
                        Additional Video Template
                        <span className="doc-module-implied"> — applied to Videos 2–{additionalVideos.length + 1}</span>
                      </div>
                      <table className="doc-table">
                        <thead>
                          <tr><th>Task</th><th>Who</th><th>Hrs</th><th>Type</th><th>Line Cost</th></tr>
                        </thead>
                        <tbody>{renderTaskRows(secondTasks, 0)}</tbody>
                      </table>

                      {additionalVideosCosts.map(({ video, cost }, idx) => (
                        <div key={video.id} className="doc-subtotal-row">
                          <span className="doc-subtotal-label">Video {idx + 2} ({video.minutes} min)</span>
                          <span className="doc-subtotal-value">{fmt(cost)}</span>
                        </div>
                      ))}

                      <div className="doc-subtotal-row doc-subtotal-row--overall">
                        <span className="doc-subtotal-label">
                          Microvideo total — {additionalVideos.length + 1} videos
                        </span>
                        <span className="doc-subtotal-value">{fmt(totalCost)}</span>
                      </div>
                    </>
                  )}
                </div>
              )
            }

            // ── Rise / Storyline ────────────────────────────────────
            const secondPerModule  = secondTasks.reduce((s, t) => s + taskCost(t, catKey, addedMin), 0)
            const secondTotalCost  = secondPerModule * extraModules
            const combinedBase     = mod1BaseSum + secondTotalCost
            const adaAmount        = combinedBase * adaRate
            const overallTotal     = combinedBase + adaAmount

            let headerText = `${CAT_LABELS[catKey]} — total length ${totalMin} min`
            if (addedMin > 0) headerText += ` (${defMin} default + ${addedMin} additional)`
            if (moduleCount > 1) headerText += `  ·  ${moduleCount} ${unit}s`
            if (hasAda) headerText += '  ·  ADA compliant (+10%)'

            return (
              <div key={catKey} className="doc-cat">
                <div className="doc-cat-heading">{headerText}</div>

                {moduleCount > 1 && (
                  <div className="doc-module-label">{Unit} 1</div>
                )}

                <table className="doc-table">
                  <thead>
                    <tr><th>Task</th><th>Who</th><th>Hrs</th><th>Type</th><th>Line Cost</th></tr>
                  </thead>
                  <tbody>{renderTaskRows(mod1Tasks, addedMin)}</tbody>
                </table>

                <div className="doc-subtotal-row">
                  {moduleCount === 1 && hasAda && (
                    <span className="doc-subtotal-ada">
                      base {fmt(mod1BaseSum)} + ADA 10% ({fmt(mod1BaseSum * adaRate)})
                    </span>
                  )}
                  <span className="doc-subtotal-label">
                    {moduleCount > 1 ? `${Unit} 1 subtotal` : `${CAT_LABELS[catKey]} subtotal${hasAda ? ' (incl. ADA)' : ''}`}
                  </span>
                  <span className="doc-subtotal-value">
                    {fmt(moduleCount > 1 ? mod1BaseSum : mod1BaseSum * (1 + adaRate))}
                  </span>
                </div>

                {moduleCount > 1 && (
                  <>
                    <hr className="doc-section-divider" />
                    <div className="doc-module-label doc-module-label--second">
                      {moduleCount === 2 ? `${Unit} 2` : `${Unit}s 2–${moduleCount}`}
                      <span className="doc-module-implied"> — implied after {unit} 2</span>
                    </div>
                    <table className="doc-table">
                      <thead>
                        <tr><th>Task</th><th>Who</th><th>Hrs</th><th>Type</th><th>Line Cost</th></tr>
                      </thead>
                      <tbody>{renderTaskRows(secondTasks, addedMin)}</tbody>
                    </table>
                    <div className="doc-subtotal-row">
                      <span className="doc-subtotal-label">Per-{unit} rate</span>
                      <span className="doc-subtotal-value">{fmt(secondPerModule)}</span>
                    </div>
                    {extraModules > 1 && (
                      <div className="doc-subtotal-row doc-subtotal-row--overall">
                        <span className="doc-subtotal-label">
                          {moduleCount === 2 ? `${Unit} 2` : `${Unit}s 2–${moduleCount}`} subtotal (× {extraModules})
                        </span>
                        <span className="doc-subtotal-value">{fmt(secondTotalCost)}</span>
                      </div>
                    )}
                    <div className="doc-subtotal-row doc-subtotal-row--overall">
                      {hasAda && (
                        <span className="doc-subtotal-ada">
                          base {fmt(combinedBase)} + ADA 10% ({fmt(adaAmount)})
                        </span>
                      )}
                      <span className="doc-subtotal-label">
                        {CAT_LABELS[catKey]} total — {moduleCount} {unit}s{hasAda ? ' (incl. ADA)' : ''}
                      </span>
                      <span className="doc-subtotal-value">{fmt(overallTotal)}</span>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* Combined hours */}
          <div className="doc-hours-section">
            <p className="doc-hours-title">Combined hours per team member</p>
            <div className="doc-hours-grid">
              {Object.entries(memberHours).map(([name, hrs]) => (
                <span key={name} className="doc-hours-item">
                  {name} <strong>{parseFloat(hrs.toFixed(1))}h</strong>
                  <span className="doc-hours-rate"> × ${RATES[name]}/hr</span>
                </span>
              ))}
            </div>
          </div>

          <hr className="doc-final-rule" />

          <div>
            <div className="doc-total-row">
              <span className="doc-total-label">Internal cost</span>
              <span className="doc-total-value">{fmt(internalCost)}</span>
            </div>
            <div className="doc-total-row doc-total-row--client">
              <span className="doc-total-label">Client price ({marginPct}% margin)</span>
              <span className="doc-total-value">{fmt(clientPrice)}</span>
            </div>
          </div>

          <p className="doc-disclaimer">{marginPct}% profit margin applied. Estimate only; not a contract.</p>
          <p className="doc-footer">AI eLearning Estimator · generated 2026</p>
        </div>
      </div>
    </div>
  )
}
