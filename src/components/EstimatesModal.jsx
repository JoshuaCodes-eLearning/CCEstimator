import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { CAT_LABELS } from '../config/config'
import { fmt } from '../utils/calc'
import { resolveName, estimateDisplayName } from '../utils/estimatePayload'
import ConfirmDialog from './ConfirmDialog'
import AppHeader from './AppHeader'
import ChangePasswordModal from './ChangePasswordModal'

const PAGE_SIZE = 5

const SORTERS = {
  recent:     (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
  profitable: (a, b) => b.client_price - a.client_price,
  margin:     (a, b) => b.margin_pct - a.margin_pct,
  alpha:      (a, b) => a.company_name.localeCompare(b.company_name),
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function monthKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function EstimatesModal({
  onBack, onLoad, onEstimateRenamed, onEstimateDeleted,
  hasUnsavedChanges, currentEstimateName, onSaveAndOpen, onDiscardAndOpen,
  onSignOut, onChangePassword, changePasswordOpen, onCloseChangePassword,
}) {
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState('recent')
  const [monthFilter,  setMonthFilter]  = useState('all')
  const [wonFilter,    setWonFilter]    = useState('all')
  const [estimates,    setEstimates]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)
  const [editingCell,  setEditingCell]  = useState(null) // { id, field }
  const [editValue,    setEditValue]    = useState('')
  const [confirmDialog, setConfirmDialog] = useState(null) // { type: 'delete'|'open', row }
  const [toast,        setToast]        = useState(null) // { message, isError }
  const [expandedCats, setExpandedCats] = useState(() => new Set())
  const [page,         setPage]         = useState(1)
  const editingRef      = useRef(null)  // synchronous mirror of editingCell, for race-safe flushing
  const commitPromiseRef = useRef(null) // in-flight commit, shared by blur + explicit flush callers

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase.from('estimates').select('*')
      if (cancelled) return
      if (error) setLoadError(error.message)
      else       setEstimates(data ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => { setPage(1) }, [search, sort, monthFilter, wonFilter])

  const monthOptions = Array.from(new Set(estimates.map(e => monthKey(e.created_at)))).sort().reverse()

  const query = search.trim().toLowerCase()
  let filtered = query
    ? estimates.filter(e =>
        e.company_name.toLowerCase().includes(query) ||
        e.course_name.toLowerCase().includes(query))
    : estimates
  if (monthFilter !== 'all') filtered = filtered.filter(e => monthKey(e.created_at) === monthFilter)
  if (wonFilter !== 'all')   filtered = filtered.filter(e => wonFilter === 'won' ? e.is_won : !e.is_won)
  const sorted = [...filtered].sort(SORTERS[sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageSafe    = Math.min(page, totalPages)
  const pageStart   = (pageSafe - 1) * PAGE_SIZE
  const pageItems   = sorted.slice(pageStart, pageStart + PAGE_SIZE)

  // ── Inline rename ─────────────────────────────────────────
  // editingRef/commitPromiseRef exist because clicking Open/Delete while a
  // rename input is focused fires the input's blur (which starts this async
  // commit) immediately before the button's own click handler runs, in the
  // same tick — so the click handler can't just read `row` from its render
  // closure, it needs to await the SAME in-flight commit blur already kicked
  // off. Refs (not state) make that reentrant check synchronous and reliable.
  function startEdit(row, field) {
    editingRef.current = { id: row.id, field }
    setEditingCell({ id: row.id, field })
    setEditValue(row[field])
  }

  function cancelEdit() {
    editingRef.current = null
    setEditingCell(null)
  }

  function commitEdit() {
    if (commitPromiseRef.current) return commitPromiseRef.current
    const current = editingRef.current
    if (!current) return Promise.resolve(null)
    editingRef.current = null
    setEditingCell(null)

    const promise = (async () => {
      const { id, field } = current
      const row = estimates.find(e => e.id === id)
      const resolved = resolveName(editValue)
      if (!row || resolved === row[field]) return row

      const { data, error } = await supabase
        .from('estimates')
        .update({ [field]: resolved })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        setToast({ message: `Rename failed — ${error.message}`, isError: true })
        return row
      }
      const updatedRow = { ...row, [field]: resolved, updated_at: data.updated_at }
      setEstimates(prev => prev.map(e => e.id === id ? updatedRow : e))
      onEstimateRenamed(id, { [field]: resolved })
      return updatedRow
    })()

    commitPromiseRef.current = promise
    promise.finally(() => { commitPromiseRef.current = null })
    return promise
  }

  // Ensures any pending inline edit on `row` is written before Open/Delete
  // act on it. If the pending edit belongs to a different row, that edit
  // still gets flushed (safe to do), but `row` itself is returned unchanged.
  async function flushPendingEditFor(row) {
    const wasEditingThisRow = editingRef.current?.id === row.id
    const result = await commitEdit()
    return wasEditingThisRow ? (result ?? row) : row
  }

  // ── Status toggle ─────────────────────────────────────────
  async function toggleClosed(row) {
    const next = !row.is_closed
    setEstimates(prev => prev.map(e => e.id === row.id ? { ...e, is_closed: next } : e))
    const { error } = await supabase.from('estimates').update({ is_closed: next }).eq('id', row.id)
    if (error) {
      setEstimates(prev => prev.map(e => e.id === row.id ? { ...e, is_closed: !next } : e))
      setToast({ message: `Couldn't update status — ${error.message}`, isError: true })
    }
  }

  // ── Won/Lost toggle (independent of Open/Closed) ───────────
  async function toggleWon(row) {
    const next = !row.is_won
    setEstimates(prev => prev.map(e => e.id === row.id ? { ...e, is_won: next } : e))
    const { error } = await supabase.from('estimates').update({ is_won: next }).eq('id', row.id)
    if (error) {
      setEstimates(prev => prev.map(e => e.id === row.id ? { ...e, is_won: !next } : e))
      setToast({ message: `Couldn't update Won status — ${error.message}`, isError: true })
    }
  }

  // ── Delete ────────────────────────────────────────────────
  async function performDelete(row) {
    setConfirmDialog(null)
    const { error } = await supabase.from('estimates').delete().eq('id', row.id)
    if (error) {
      setToast({ message: `Delete failed — ${error.message}`, isError: true })
      return
    }
    setEstimates(prev => prev.filter(e => e.id !== row.id))
    onEstimateDeleted(row.id)
    setToast({ message: `Deleted "${estimateDisplayName(row.company_name)}"` })
  }

  // ── Open ──────────────────────────────────────────────────
  function performOpen(row) {
    setConfirmDialog(null)
    onLoad(row)
  }

  // ── Categories expand/collapse ───────────────────────────
  function toggleCatsExpanded(id) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="app">
      <AppHeader
        screenLabel="My Estimates"
        onSignOut={onSignOut}
        onChangePassword={onChangePassword}
      />

      {changePasswordOpen && <ChangePasswordModal onClose={onCloseChangePassword} />}

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
            <select
              className="estimates-sort-select"
              value={monthFilter}
              onChange={e => setMonthFilter(e.target.value)}
            >
              <option value="all">All Months</option>
              {monthOptions.map(key => (
                <option key={key} value={key}>{monthLabel(key)}</option>
              ))}
            </select>
            <select
              className="estimates-sort-select"
              value={wonFilter}
              onChange={e => setWonFilter(e.target.value)}
            >
              <option value="all">Won &amp; Lost</option>
              <option value="won">Won Only</option>
              <option value="lost">Lost Only</option>
            </select>
          </div>

          {/* ── Column headers ────────────────────────── */}
          <div className="estimates-cols">
            <span className="estimates-col-label">Company</span>
            <span className="estimates-col-label">Client Name</span>
            <span className="estimates-col-label">Course</span>
            <span className="estimates-col-label">Categories</span>
            <span className="estimates-col-label estimates-col-label--right">Client $</span>
            <span className="estimates-col-label estimates-col-label--right">Margin</span>
            <span className="estimates-col-label estimates-col-label--right">Saved Date</span>
            <span className="estimates-col-label estimates-col-label--center">Status</span>
            <span className="estimates-col-label estimates-col-label--center">Won</span>
            <span className="estimates-col-label estimates-col-label--actions">Actions</span>
          </div>

          {/* ── Loading ───────────────────────────────── */}
          {loading && (
            <div className="estimates-empty">
              <p className="estimates-empty-title">Loading…</p>
            </div>
          )}

          {/* ── Load error ────────────────────────────── */}
          {!loading && loadError && (
            <div className="estimates-empty">
              <div className="estimates-empty-icon">⚠️</div>
              <p className="estimates-empty-title">Couldn't load estimates</p>
              <p className="estimates-empty-sub">{loadError}</p>
            </div>
          )}

          {/* ── Empty state (no saved estimates at all) ── */}
          {!loading && !loadError && estimates.length === 0 && (
            <div className="estimates-empty">
              <div className="estimates-empty-icon">📋</div>
              <p className="estimates-empty-title">No estimates saved yet</p>
              <p className="estimates-empty-sub">
                Go back to the estimator, build an estimate, and click{' '}
                <strong>Save Estimate</strong> to save your first one.
              </p>
            </div>
          )}

          {/* ── No search matches ─────────────────────── */}
          {!loading && !loadError && estimates.length > 0 && sorted.length === 0 && (
            <div className="estimates-empty">
              <div className="estimates-empty-icon">🔍</div>
              <p className="estimates-empty-title">No matches</p>
              <p className="estimates-empty-sub">No estimates match "{search}".</p>
            </div>
          )}

          {/* ── Rows ──────────────────────────────────── */}
          {!loading && !loadError && sorted.length > 0 && (
            <div className="estimates-list">
              {pageItems.map(row => (
                <div key={row.id} className="estimates-row">

                  {/* Company */}
                  {editingCell?.id === row.id && editingCell.field === 'company_name' ? (
                    <span className="estimates-cell estimates-cell--strong">
                      <input
                        className="estimates-edit-input"
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                    </span>
                  ) : (
                    <span
                      className="estimates-cell estimates-cell--strong estimates-editable"
                      onDoubleClick={() => startEdit(row, 'company_name')}
                    >
                      {row.company_name}
                    </span>
                  )}

                  {/* Client Name */}
                  {editingCell?.id === row.id && editingCell.field === 'client_name' ? (
                    <span className="estimates-cell">
                      <input
                        className="estimates-edit-input"
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                    </span>
                  ) : (
                    <span
                      className="estimates-cell estimates-editable"
                      onDoubleClick={() => startEdit(row, 'client_name')}
                    >
                      {row.client_name || 'Unnamed'}
                    </span>
                  )}

                  {/* Course */}
                  {editingCell?.id === row.id && editingCell.field === 'course_name' ? (
                    <span className="estimates-cell">
                      <input
                        className="estimates-edit-input"
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                      />
                    </span>
                  ) : (
                    <span
                      className="estimates-cell estimates-editable"
                      onDoubleClick={() => startEdit(row, 'course_name')}
                    >
                      {row.course_name}
                    </span>
                  )}

                  <span
                    className={`estimates-cell estimates-cell--muted${expandedCats.has(row.id) ? ' estimates-cell--expanded' : ''}`}
                    title={(row.categories ?? []).map(c => CAT_LABELS[c] ?? c).join(', ') || '—'}
                    onDoubleClick={() => toggleCatsExpanded(row.id)}
                  >
                    {(row.categories ?? []).map(c => CAT_LABELS[c] ?? c).join(', ') || '—'}
                  </span>
                  <span className="estimates-cell estimates-cell--right">{fmt(row.client_price)}</span>
                  <span className="estimates-cell estimates-cell--right">{row.margin_pct}%</span>
                  <span className="estimates-cell estimates-cell--right">{formatDate(row.updated_at)}</span>
                  <span className="estimates-cell estimates-cell--center">
                    <button
                      type="button"
                      className={`estimates-status${row.is_closed ? ' estimates-status--closed' : ''}`}
                      onClick={() => toggleClosed(row)}
                    >
                      {row.is_closed ? 'Closed' : 'Open'}
                    </button>
                  </span>
                  <span className="estimates-cell estimates-cell--center">
                    <button
                      type="button"
                      className={`estimates-won${row.is_won ? '' : ' estimates-won--lost'}`}
                      onClick={() => toggleWon(row)}
                    >
                      {row.is_won ? 'Won' : 'Lost'}
                    </button>
                  </span>
                  <span className="estimates-cell estimates-cell--actions">
                    <button type="button" className="estimates-action-btn estimates-action-btn--open"
                      onClick={async () => {
                        const freshRow = await flushPendingEditFor(row)
                        setConfirmDialog({ type: hasUnsavedChanges ? 'open-unsaved' : 'open', row: freshRow })
                      }}>
                      Open Estimate
                    </button>
                    <button type="button" className="estimates-action-btn estimates-action-btn--delete"
                      onClick={async () => {
                        const freshRow = await flushPendingEditFor(row)
                        setConfirmDialog({ type: 'delete', row: freshRow })
                      }}>
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ────────────────────────────── */}
          {!loading && !loadError && totalPages > 1 && (
            <div className="estimates-pagination">
              <button type="button" className="estimates-page-btn"
                disabled={pageSafe <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}>
                ← Previous
              </button>
              <span className="estimates-page-info">
                Page {pageSafe} of {totalPages} &nbsp;·&nbsp; {sorted.length} estimate{sorted.length !== 1 ? 's' : ''}
              </span>
              <button type="button" className="estimates-page-btn"
                disabled={pageSafe >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Next →
              </button>
            </div>
          )}
        </div>

      </div>

      {confirmDialog?.type === 'delete' && (
        <ConfirmDialog
          title="Delete Estimate"
          message={`Delete "${estimateDisplayName(confirmDialog.row.company_name)}"? This can't be undone.`}
          onDismiss={() => setConfirmDialog(null)}
          actions={[
            { label: 'Cancel', kind: 'secondary', onClick: () => setConfirmDialog(null) },
            { label: 'Delete', kind: 'danger',    onClick: () => performDelete(confirmDialog.row) },
          ]}
        />
      )}

      {confirmDialog?.type === 'open' && (
        <ConfirmDialog
          title="Open Estimate"
          message={`Open "${estimateDisplayName(confirmDialog.row.company_name)}"? This replaces what's currently on screen.`}
          onDismiss={() => setConfirmDialog(null)}
          actions={[
            { label: 'Cancel',    kind: 'secondary', onClick: () => setConfirmDialog(null) },
            { label: 'Yes, Open', kind: 'primary',   onClick: () => performOpen(confirmDialog.row) },
          ]}
        />
      )}

      {confirmDialog?.type === 'open-unsaved' && (
        <ConfirmDialog
          title="Unsaved Changes"
          message={`You're currently working on "${currentEstimateName}". Opening "${estimateDisplayName(confirmDialog.row.company_name)}" will replace it — save your current work, or discard it?`}
          onDismiss={() => setConfirmDialog(null)}
          actions={[
            { label: 'Cancel',        kind: 'secondary', onClick: () => setConfirmDialog(null) },
            { label: 'Discard & Open', kind: 'danger',   onClick: () => { const r = confirmDialog.row; setConfirmDialog(null); onDiscardAndOpen(r) } },
            { label: 'Save & Open',    kind: 'primary',  onClick: () => { const r = confirmDialog.row; setConfirmDialog(null); onSaveAndOpen(r) } },
          ]}
        />
      )}

      {toast && (
        <div className={`save-toast${toast.isError ? ' save-toast--error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
