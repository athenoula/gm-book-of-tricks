import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const action = mode === 'signin' ? signIn : signUp
    const result = await action(email, password)

    if (result.error) {
      setError(result.error.message)
      setLoading(false)
    } else {
      navigate({ to: '/home' })
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-bg-deep px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl mb-2 gold-foil">GM Book of Tricks</h1>
          <p className="text-text-secondary text-sm">
            Your session prep companion
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="gm@example.com"
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            error={error ?? undefined}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading
              ? 'Loading...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'
            }
          </Button>
        </form>

        {/* Toggle mode */}
        <p className="text-center text-sm text-text-muted mt-6">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(null) }}
                className="text-primary-light hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(null) }}
                className="text-primary-light hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
