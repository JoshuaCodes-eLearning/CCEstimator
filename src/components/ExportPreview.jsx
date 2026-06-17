import { generateAndSaveDocx } from '../utils/exportDocx'
import { computeHours, lineCost, fmt } from '../utils/calc'
import { DEFAULT_MINUTES, ADA_RATES, RATES, CAT_LABELS } from '../config/config'

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

          {/* Category sections */}
          {selectedKeys.map(catKey => {
            const cat          = catStates[catKey]
            const defMin       = DEFAULT_MINUTES[catKey]
            const addedMin     = cat.additionalMinutes
            const totalMin     = defMin + addedMin
            const hasAda       = cat.adaEnabled && ADA_RATES[catKey] > 0
            const moduleCount  = cat.moduleCount ?? 1
            const extraModules = moduleCount - 1
            const adaRate      = hasAda ? ADA_RATES[catKey] : 0
            const unit         = catKey === 'mv' ? 'video' : 'module'
            const Unit         = unit.charAt(0).toUpperCase() + unit.slice(1)

            // Module 1
            const mod1Tasks = cat.tasks.filter(t => t.included)
            let mod1BaseSum = 0
            mod1Tasks.forEach(t => {
              mod1BaseSum += computeHours(t, catKey, addedMin) * (RATES[t.responsible] ?? 0)
            })

            // Second state
            const secondTasks    = (cat.secondState?.tasks ?? []).filter(t => t.included)
            let secondPerModule  = 0
            secondTasks.forEach(t => {
              secondPerModule += computeHours(t, catKey, addedMin) * (RATES[t.responsible] ?? 0)
            })
            const secondTotalCost = secondPerModule * extraModules

            const combinedBase = mod1BaseSum + secondTotalCost
            const adaAmount    = combinedBase * adaRate
            const overallTotal = combinedBase + adaAmount

            let headerText = `${CAT_LABELS[catKey]} — total length ${totalMin} min`
            if (addedMin > 0) headerText += ` (${defMin} default + ${addedMin} additional)`
            if (moduleCount > 1) headerText += `  ·  ${moduleCount} ${unit}s`
            if (hasAda) headerText += '  ·  ADA compliant (+10%)'

            return (
              <div key={catKey} className="doc-cat">
                <div className="doc-cat-heading">{headerText}</div>

                {/* Section label when multi */}
                {moduleCount > 1 && (
                  <div className="doc-module-label">{Unit} 1</div>
                )}

                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Task</th><th>Who</th><th>Hrs</th><th>Type</th><th>Line Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mod1Tasks.length === 0 ? (
                      <tr className="doc-table-muted"><td colSpan={5}>No tasks selected</td></tr>
                    ) : (
                      mod1Tasks.map(task => {
                        const hrs  = computeHours(task, catKey, addedMin)
                        const cost = lineCost(task, catKey, addedMin)
                        return (
                          <tr key={task.id}>
                            <td>{task.name}</td>
                            <td>{task.responsible}</td>
                            <td style={{ textAlign: 'center' }}>{parseFloat(hrs.toFixed(1))}</td>
                            <td>{task.type}</td>
                            <td>{fmt(cost)}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>

                {/* Module 1 subtotal */}
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

                {/* Second state section */}
                {moduleCount > 1 && (
                  <>
                    <hr className="doc-section-divider" />
                    <div className="doc-module-label doc-module-label--second">
                      {moduleCount === 2 ? `${Unit} 2` : `${Unit}s 2–${moduleCount}`}
                      <span className="doc-module-implied"> — implied after {unit} 2</span>
                    </div>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Task</th><th>Who</th><th>Hrs</th><th>Type</th><th>Line Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {secondTasks.length === 0 ? (
                          <tr className="doc-table-muted"><td colSpan={5}>No tasks selected for second state</td></tr>
                        ) : (
                          secondTasks.map(task => {
                            const hrs  = computeHours(task, catKey, addedMin)
                            const cost = lineCost(task, catKey, addedMin)
                            return (
                              <tr key={`s2-${task.id}`}>
                                <td>{task.name}</td>
                                <td>{task.responsible}</td>
                                <td style={{ textAlign: 'center' }}>{parseFloat(hrs.toFixed(1))}</td>
                                <td>{task.type}</td>
                                <td>{fmt(cost)}</td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
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

                    {/* Overall total */}
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
