import { useState } from 'react'
import { supabase } from '../lib/supabase'

// Single-user app — there's only ever one account to reset, so the forgot-
// password flow doesn't ask for an email (that was confusing: typing any
// other address wouldn't do anything, since the reset link always goes to
// this one inbox regardless of what's typed).
const LAURIE_EMAIL = 'laurieb@cobblestoneconsulting.com'

export default function LoginScreen() {
  const [mode,     setMode]     = useState('login') // 'login' | 'forgot' | 'forgot-sent'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleForgotSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(LAURIE_EMAIL, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setMode('forgot-sent')
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Cobblestone AI eLearning Estimator</span>
      </header>

      <div className="login-wrap">
        <div className="login-card">
          <h2 className="login-title">
            {mode === 'login' ? 'Sign In' : 'Reset Password'}
          </h2>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="login-form">
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Signing In…' : 'Sign In'}
              </button>
              <button
                type="button"
                className="login-link-btn"
                onClick={() => { setMode('forgot'); setError(null) }}
              >
                Forgot password?
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="login-form">
              <p className="login-hint">
                We'll send a password reset link to Laurie's email
                ({LAURIE_EMAIL}).
              </p>
              {error && <p className="login-error">{error}</p>}
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <button
                type="button"
                className="login-link-btn"
                onClick={() => { setMode('login'); setError(null) }}
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {mode === 'forgot-sent' && (
            <div className="login-form">
              <p className="login-hint">
                Sent to Laurie's email. Check the inbox for a link to reset the password.
              </p>
              <button
                type="button"
                className="login-link-btn"
                onClick={() => { setMode('login'); setError(null) }}
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
