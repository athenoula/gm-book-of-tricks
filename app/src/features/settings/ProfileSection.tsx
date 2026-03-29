import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToastStore } from '@/lib/toast'

export function ProfileSection() {
  const user = useAuth((s) => s.user)
  const [email, setEmail] = useState(user?.email ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const handleUpdateEmail = async () => {
    if (!email || email === user?.email) return
    setEmailLoading(true)
    const { error } = await supabase.auth.updateUser({ email })
    setEmailLoading(false)
    if (error) {
      useToastStore.getState().addToast('error', error.message)
    } else {
      useToastStore.getState().addToast('success', 'Confirmation email sent to your new address')
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      useToastStore.getState().addToast('error', 'Password must be at least 6 characters')
      return
    }
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      useToastStore.getState().addToast('error', error.message)
    } else {
      setNewPassword('')
      useToastStore.getState().addToast('success', 'Password updated')
    }
  }

  return (
    <section className="mb-10">
      <h2 className="text-xl mb-1">Profile</h2>
      <p className="text-text-muted text-sm mb-6">Update your email and password.</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-text-body mb-1.5">Email</label>
          <div className="flex gap-3">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleUpdateEmail}
              disabled={emailLoading || email === user?.email}
            >
              {emailLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-body mb-1.5">New Password</label>
          <div className="flex gap-3">
            <Input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="Enter new password"
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleUpdatePassword}
              disabled={passwordLoading || !newPassword}
            >
              {passwordLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
