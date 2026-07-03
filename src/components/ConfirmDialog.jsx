export default function ConfirmDialog({ title, message, actions, onDismiss }) {
  return (
    <div className="confirm-dialog-backdrop" onClick={onDismiss}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <h3 className="confirm-dialog-title">{title}</h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          {actions.map(({ label, onClick, kind }) => (
            <button
              key={label}
              type="button"
              className={`confirm-dialog-btn confirm-dialog-btn--${kind ?? 'secondary'}`}
              onClick={onClick}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
