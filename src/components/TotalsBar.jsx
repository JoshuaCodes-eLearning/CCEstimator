import { CAT_LABELS } from '../config/config'
import { fmt } from '../utils/calc'

export default function TotalsBar({
  memberHours,
  categoryCosts,
  selectedKeys,
  internalCost,
  clientPrice,
  onExport,
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

          {/* ── Client price ─────────────────────────── */}
          <div className="cost-line cost-line--client">
            <span className="cost-line-label">Client price (×2)</span>
            <span className="cost-line-value">{fmt(clientPrice)}</span>
          </div>

        </div>

        <button type="button" className="export-btn" onClick={onExport}>
          Export to Word
        </button>
      </div>
    </div>
  )
}
