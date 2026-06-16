import { generateAndSaveDocx } from '../utils/exportDocx'
import { computeHours, lineCost, categorySubtotal, fmt } from '../utils/calc'
import { DEFAULT_MINUTES, ADA_RATES, RATES, CAT_LABELS } from '../config/config'

export default function ExportPreview({
  projectName,
  courseName,
  selectedKeys,
  catStates,
  memberHours,
  internalCost,
  clientPrice,
  onBack,
}) {
  async function handleDownload() {
    await generateAndSaveDocx({
      projectName,
      courseName,
      selectedKeys,
      cats: catStates,
      memberHours,
      internalCost,
      clientPrice,
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">AI eLearning Estimator</span>
        <span className="screen-label">Screen 2 — Export Preview</span>
      </header>

      <div className="preview-toolbar">
        <button className="back-btn" onClick={onBack}>← Back to edit</button>
        <span className="preview-hint">Review the combined estimate exactly as it will appear in Word.</span>
        <button className="download-btn" onClick={handleDownload}>⬇ Download .docx</button>
      </div>

      <div className="preview-outer">
        <div className="preview-doc">
          <h1 className="doc-title">eLearning Project Estimate</h1>
          <hr className="doc-rule" />

          <div className="doc-meta">
            <div className="doc-meta-row">
              <span className="doc-meta-key">Project name</span>
              <span className="doc-meta-val">{projectName || '—'}</span>
            </div>
            <div className="doc-meta-row">
              <span className="doc-meta-key">Course name</span>
              <span className="doc-meta-val">{courseName || '—'}</span>
            </div>
          </div>

          {/* Category sections */}
          {selectedKeys.map(catKey => {
            const cat = catStates[catKey]
            const defMin  = DEFAULT_MINUTES[catKey]
            const addedMin = cat.additionalMinutes
            const totalMin = defMin + addedMin
            const hasAda  = cat.adaEnabled && ADA_RATES[catKey] > 0
            const included = cat.tasks.filter(t => t.included)
            const subtotal = categorySubtotal(catKey, cat)
            const baseSum  = hasAda ? subtotal / (1 + ADA_RATES[catKey]) : subtotal
            const adaAmt   = hasAda ? subtotal - baseSum : 0

            return (
              <div key={catKey} className="doc-cat">
                <div className="doc-cat-heading">
                  {CAT_LABELS[catKey]} — total length {totalMin} min
                  {addedMin > 0 ? ` (${defMin} default + ${addedMin} additional)` : ''}
                  {hasAda ? '  ·  ADA compliant (+10%)' : ''}
                </div>
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Who</th>
                      <th>Hrs</th>
                      <th>Type</th>
                      <th>Line Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {included.length === 0 ? (
                      <tr className="doc-table-muted">
                        <td colSpan={5}>No tasks selected</td>
                      </tr>
                    ) : (
                      included.map(task => {
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
                <div className="doc-subtotal-row">
                  {hasAda && (
                    <span className="doc-subtotal-ada">
                      base {fmt(baseSum)} + ADA 10% ({fmt(adaAmt)})
                    </span>
                  )}
                  <span className="doc-subtotal-label">
                    {CAT_LABELS[catKey]} subtotal
                  </span>
                  <span className="doc-subtotal-value">{fmt(subtotal)}</span>
                </div>
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
              <span className="doc-total-label">Client price (internal × 2)</span>
              <span className="doc-total-value">{fmt(clientPrice)}</span>
            </div>
          </div>

          <p className="doc-disclaimer">50% margin applied. Estimate only; not a contract.</p>
          <p className="doc-footer">AI eLearning Estimator · generated 2026</p>
        </div>
      </div>
    </div>
  )
}
