import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from 'lucide-react'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    // Demo navigation only. No account is created or stored.
    if (username.trim() && email.trim()) {
      navigate('/dashboard')
    }
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
          <h2>Create your account</h2>
          <p>Join VIGHT and start connecting.</p>
        </div>

        <form onSubmit={handleRegister}>
          <label htmlFor="register-username">Username</label>

          <div className="auth-input">
            <UserRound size={19} />
            <input
              id="register-username"
              type="text"
              placeholder="Choose a username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <label htmlFor="register-email">Email address</label>

          <div className="auth-input">
            <Mail size={19} />
            <input
              id="register-email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <label htmlFor="register-password">Password</label>

          <div className="auth-input">
            <LockKeyhole size={19} />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>

          <label htmlFor="register-confirm">Confirm password</label>

          <div className="auth-input">
            <LockKeyhole size={19} />
            <input
              id="register-confirm"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit">
            Create Account <ArrowRight size={19} />
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        <p className="auth-demo-note">
          Demo interface — accounts are not saved yet.
        </p>
      </section>
    </main>
  )
}