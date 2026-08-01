import { CAT_LABELS, PHASE_LABELS } from '../config/config'
import { fmt } from '../utils/calc'

const PHASE_ORDER = ['design', 'development', 'qa', 'pm']

export default function TotalsBar({
  memberHours,
  memberWordCost,
  categoryCosts,
  phaseTotals,
  selectedKeys,
  internalCost,
  clientPrice,
  marginPct,
  marginOptions,
  onMarginChange,
  onSave,
  onViewEstimates,
  onExport,
  saveLabel = 'Save Estimate',
  saveDisabled = false,
}) {
  return (
    <div className="totals-bar">
      <div className="totals-inner">
        <div className="totals-left">

          {/* ── Hours per member ─────────────────────── */}
          <p className="totals-member-label">Hours per team member</p>
          <div className="totals-members">
            {Object.entries(memberHours).map(([member, hours]) => (
              <span key={member} className="totals-member">
                {member} <strong>{parseFloat(hours.toFixed(1))}h</strong>
              </span>
            ))}
            {/* Flat per-1000-words validator fee — no hours, so it's shown as
                its own cost-based pill rather than folded into the "h" pills above. */}
            {memberWordCost && Object.entries(memberWordCost).map(([member, cost]) => (
              <span key={`${member}-words`} className="totals-member totals-member--words">
                {member} <strong>{fmt(cost)}</strong> <span className="totals-member-note">(words)</span>
              </span>
            ))}
          </div>

          {/* ── Phase totals (Design / Development / QA / PM) ──────── */}
          {phaseTotals && (
            <div className="totals-phase-breakdown">
              <p className="totals-member-label">Phase totals</p>
              {PHASE_ORDER.map(phase => (
                <div key={phase} className="totals-phase-line">
                  <span className="totals-phase-name">
                    {PHASE_LABELS[phase]} ({parseFloat(phaseTotals[phase].hours.toFixed(1))}h):
                  </span>
                  <span className="totals-phase-cost">{fmt(phaseTotals[phase].cost)}</span>
                </div>
              ))}
              <div className="totals-phase-line totals-phase-reconciled">
                <span className="totals-phase-name">Phase Total Cost:</span>
                <span className="totals-phase-cost">
                  {fmt(PHASE_ORDER.reduce((s, p) => s + phaseTotals[p].cost, 0))}
                </span>
              </div>
            </div>
          )}

          {/* ── Category cost breakdown ──────────────── */}
          {selectedKeys.length > 1 && (
            <div className="totals-cat-breakdown">
              {selectedKeys.map(catKey => (
                <div key={catKey} className="totals-cat-line">
                  <span className="totals-cat-name">{CAT_LABELS[catKey]}</span>
                  <span className="totals-cat-cost">{fmt(categoryCosts[catKey] ?? 0)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Internal cost ────────────────────────── */}
          <div className="cost-line cost-line--internal">
            <span className="cost-line-label">Internal Cost:</span>
            <span className="cost-line-value">{fmt(internalCost)}</span>
          </div>

          {/* ── Profit margin selector ───────────────── */}
          <div className="margin-row">
            <span className="margin-label">Profit margin</span>
            <select
              className="margin-select"
              value={marginPct}
              onChange={e => onMarginChange(Number(e.target.value))}
            >
              {marginOptions.map(pct => (
                <option key={pct} value={pct}>{pct}%</option>
              ))}
            </select>
          </div>

          {/* ── Client price ─────────────────────────── */}
          <div className="cost-line cost-line--client">
            <span className="cost-line-label">Client price ({marginPct}% margin)</span>
            <span className="cost-line-value">{fmt(clientPrice)}</span>
          </div>

        </div>

        {/* ── Action buttons ───────────────────────── */}
        <div className="totals-actions">
          <button type="button" className="totals-action-btn totals-action-btn--save"
            onClick={onSave} disabled={saveDisabled}>
            {saveLabel}
          </button>
          <button type="button" className="totals-action-btn totals-action-btn--view" onClick={onViewEstimates}>
            View Estimates
          </button>
          <button type="button" className="totals-action-btn totals-action-btn--export" onClick={onExport}>
            ↓ Export to Word
          </button>
        </div>

      </div>
    </div>
  )
}
