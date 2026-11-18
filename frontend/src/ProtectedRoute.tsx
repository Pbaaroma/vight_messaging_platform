import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

type ProtectedRouteProps = {
  children: ReactNode
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const [status, setStatus] = useState<
    'checking' | 'authenticated' | 'unauthenticated' | 'error'
  >('checking')

  useEffect(() => {
    const controller = new AbortController()

    async function checkSession() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          signal: controller.signal,
        })

        if (response.ok) {
          setStatus('authenticated')
        } else if (response.status === 401) {
          setStatus('unauthenticated')
        } else {
          setStatus('error')
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus('error')
        }
      }
    }

    checkSession()

    return () => controller.abort()
  }, [])

  if (status === 'checking') {
    return <p>Checking VIGHT session...</p>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  if (status === 'error') {
    return (
      <div role="alert">
        Unable to verify your VIGHT session.
        Please refresh the page and try again.
      </div>
    )
  }

  return <>{children}</>
}
