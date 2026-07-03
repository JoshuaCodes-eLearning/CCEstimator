import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState(null)
  const [success,         setSuccess]         = useState(false)
  const [loading,         setLoading]         = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)

    // Supabase's updateUser() doesn't itself check the current password — an
    // active session is enough for it to accept a new one. Re-verifying the
    // current password here guards against an already-unlocked/open session
    // (e.g. an unattended laptop) being used to lock the real owner out.
    const { data: userData } = await supabase.auth.getUser()
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userData?.user?.email,
      password: currentPassword,
    })
    if (verifyError) {
      setLoading(false)
      setError('Current password is incorrect.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess(true)
  }

  return (
    <div className="confirm-dialog-backdrop" onClick={onClose}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <h3 className="confirm-dialog-title">Change Password</h3>

        {success ? (
          <>
            <p className="confirm-dialog-message">Password updated.</p>
            <div className="confirm-dialog-actions">
              <button type="button" className="confirm-dialog-btn confirm-dialog-btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="field-label">Current Password</label>
            <input
              className="field-input"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              style={{ marginBottom: 14 }}
            />
            <label className="field-label">New Password</label>
            <input
              className="field-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ marginBottom: 14 }}
            />
            <label className="field-label">Confirm New Password</label>
            <input
              className="field-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              style={{ marginBottom: 14 }}
            />
            {error && <p className="login-error">{error}</p>}
            <div className="confirm-dialog-actions">
              <button type="button" className="confirm-dialog-btn confirm-dialog-btn--secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="confirm-dialog-btn confirm-dialog-btn--primary" disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
