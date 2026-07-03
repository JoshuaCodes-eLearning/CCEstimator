import { CAT_LABELS } from '../config/config'
import { fmt } from '../utils/calc'

export default function TotalsBar({
  memberHours,
  categoryCosts,
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
          </div>

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
          <div className="cost-line">
            <span className="cost-line-label">Internal cost</span>
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
