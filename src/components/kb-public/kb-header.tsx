import { Badge } from '@/components/ui/badge'
import { Database, Zap } from 'lucide-react'

interface KBPublicHeaderProps {
  name: string
  description: string | null
  slug: string
  pricingModel: 'free' | 'paid'
  priceCents: number
  mcpEnabled: boolean
}

export function KBPublicHeader({
  name,
  description,
  slug,
  pricingModel,
  priceCents,
  mcpEnabled,
}: KBPublicHeaderProps) {
  const formatPrice = (cents: number) => {
    if (cents === 0) return 'Free'
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/mo`
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/" className="hover:text-foreground">Sharedog</a>
        <span>/</span>
        <span className="text-foreground">{slug}</span>
      </div>

      {/* Title and badges */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={pricingModel === 'free' ? 'secondary' : 'default'}>
              {formatPrice(pricingModel === 'paid' ? priceCents : 0)}
            </Badge>
            {mcpEnabled && (
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                MCP Ready
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center justify-center h-16 w-16 rounded-lg bg-primary/10">
          <Database className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-muted-foreground text-lg leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
