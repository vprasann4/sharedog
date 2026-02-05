'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileFormProps {
  profile: Profile | null
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [creatorSlug, setCreatorSlug] = useState(profile?.creator_slug || '')
  const [creatorBio, setCreatorBio] = useState(profile?.creator_bio || '')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        creator_slug: creatorSlug || null,
        creator_bio: creatorBio || null,
        is_creator: true,
      })
      .eq('id', profile!.id)

    setIsLoading(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your personal information and creator profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">
                Profile picture is synced from your Google account
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creatorSlug">Creator Username</Label>
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-1">@</span>
                <Input
                  id="creatorSlug"
                  value={creatorSlug}
                  onChange={(e) => setCreatorSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="your-username"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will be your public creator profile URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creatorBio">Bio</Label>
              <textarea
                id="creatorBio"
                value={creatorBio}
                onChange={(e) => setCreatorBio(e.target.value)}
                placeholder="Tell people about yourself and your expertise..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
