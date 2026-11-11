import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, MessageCircle } from 'lucide-react'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // Demo navigation only. No authentication is performed yet.
    if (!email.trim() || !password) return

    navigate('/dashboard')
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">V</div>
          <h1>VIGHT</h1>
        </div>

        <p className="auth-tagline">Connect. Chat. Stay Close.</p>

        <div className="auth-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue your conversations.</p>
        </div>

        <form onSubmit={handleLogin}>
          <label htmlFor="login-email">Email address</label>

          <div className="auth-input">
            <Mail size={19} />
            <input
              id="login-email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <label htmlFor="login-password">Password</label>

          <div className="auth-input">
            <LockKeyhole size={19} />

            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          <button className="auth-submit" type="submit">
            Sign In <ArrowRight size={19} />
          </button>
        </form>

        <div className="auth-divider">
          <span>YOUR CONVERSATIONS START HERE</span>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create account</Link>
        </p>

        <div className="auth-footer">
          <MessageCircle size={15} />
          <span>VIGHT Messaging Platform</span>
        </div>
      </section>
    </main>
  )
}