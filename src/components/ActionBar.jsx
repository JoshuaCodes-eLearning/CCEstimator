export default function ActionBar({ onSave, onViewEstimates, onExport }) {
  return (
    <div className="action-bar">
      <button type="button" className="action-btn action-btn--save" onClick={onSave}>
        Save Estimate
      </button>
      <button type="button" className="action-btn action-btn--view" onClick={onViewEstimates}>
        View Estimates
      </button>
      <button type="button" className="action-btn action-btn--export" onClick={onExport}>
        ↓ Export to Word
      </button>
    </div>
  )
}
