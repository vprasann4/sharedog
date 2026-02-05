import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'

interface KBCreatorCardProps {
  name: string | null
  avatarUrl: string | null
  creatorSlug: string | null
  bio: string | null
}

export function KBCreatorCard({
  name,
  avatarUrl,
  creatorSlug,
  bio,
}: KBCreatorCardProps) {
  const displayName = name || 'Anonymous Creator'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Created by</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback>
              {initials || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{displayName}</p>
            {creatorSlug && (
              <p className="text-sm text-muted-foreground">@{creatorSlug}</p>
            )}
          </div>
        </div>

        {bio && (
          <p className="text-sm text-muted-foreground">{bio}</p>
        )}
      </CardContent>
    </Card>
  )
}
