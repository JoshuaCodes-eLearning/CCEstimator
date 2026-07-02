import { useState } from 'react'

export default function EstimatesModal({ onBack }) {
  const [search, setSearch] = useState('')
  const [sort,   setSort]   = useState('recent')

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Cobblestone AI eLearning Estimator</span>
        <span className="screen-label">My Estimates</span>
      </header>

      <div className="estimates-modal">

        {/* ── Toolbar ───────────────────────────────── */}
        <div className="estimates-toolbar">
          <button type="button" className="back-btn" onClick={onBack}>
            ← Back to estimator
          </button>
          <h2 className="estimates-heading">My Estimates</h2>
        </div>

        {/* ── Controls ──────────────────────────────── */}
        <div className="estimates-body">
          <div className="estimates-controls">
            <input
              className="field-input estimates-search"
              type="text"
              placeholder="Search by company or course name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="estimates-sort-select"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              <option value="recent">Most Recent</option>
              <option value="profitable">Most Profitable</option>
              <option value="margin">Margin %</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>

          {/* ── Column headers ────────────────────────── */}
          <div className="estimates-cols">
            <span className="estimates-col-label">Company</span>
            <span className="estimates-col-label">Course</span>
            <span className="estimates-col-label">Categories</span>
            <span className="estimates-col-label estimates-col-label--right">Client $</span>
            <span className="estimates-col-label estimates-col-label--right">Margin</span>
            <span className="estimates-col-label estimates-col-label--right">Saved</span>
            <span className="estimates-col-label">Status</span>
            <span className="estimates-col-label"></span>
          </div>

          {/* ── Empty state ───────────────────────────── */}
          <div className="estimates-empty">
            <div className="estimates-empty-icon">📋</div>
            <p className="estimates-empty-title">No estimates saved yet</p>
            <p className="estimates-empty-sub">
              Go back to the estimator, build an estimate, and click{' '}
              <strong>Save Estimate</strong> to save your first one.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
