export default function AppHeader({ screenLabel, onSignOut, onChangePassword }) {
  return (
    <header className="app-header">
      <span className="app-title">Cobblestone AI eLearning Estimator</span>
      <div className="app-header-right">
        <span className="screen-label">{screenLabel}</span>
        {onSignOut && (
          <div className="header-user-menu">
            <button type="button" className="header-menu-btn" onClick={onChangePassword}>
              Change Password
            </button>
            <button type="button" className="header-menu-btn header-menu-btn--signout" onClick={onSignOut}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
