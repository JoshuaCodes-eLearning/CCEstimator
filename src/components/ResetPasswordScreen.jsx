import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordScreen({ onDone }) {
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error,           setError]           = useState(null)
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
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Cobblestone AI eLearning Estimator</span>
      </header>

      <div className="login-wrap">
        <div className="login-card">
          <h2 className="login-title">Set a New Password</h2>
          <form onSubmit={handleSubmit} className="login-form">
            <label className="field-label">New Password</label>
            <input
              className="field-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <label className="field-label">Confirm New Password</label>
            <input
              className="field-input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'Saving…' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
