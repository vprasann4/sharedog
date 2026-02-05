import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, AlertCircle } from 'lucide-react'

interface KBPricingCardProps {
  pricingModel: 'free' | 'paid'
  priceCents: number
  isSubscribed: boolean
  isOwner: boolean
  mcpEnabled: boolean
}

export function KBPricingCard({
  pricingModel,
  priceCents,
  isSubscribed,
  isOwner,
  mcpEnabled,
}: KBPricingCardProps) {
  const isFree = pricingModel === 'free'
  const price = isFree ? 'Free' : `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price display */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{price}</span>
          {!isFree && <span className="text-muted-foreground">/month</span>}
        </div>

        {/* Status */}
        {isOwner ? (
          <Badge variant="outline" className="gap-1">
            <Check className="h-3 w-3" />
            You own this
          </Badge>
        ) : isSubscribed ? (
          <Badge variant="default" className="gap-1 bg-green-600">
            <Check className="h-3 w-3" />
            {isFree ? 'Free access' : 'Subscribed'}
          </Badge>
        ) : null}

        {/* Features */}
        <div className="space-y-2 pt-2 border-t">
          <p className="text-sm font-medium">Includes:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Semantic search via MCP
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Works with Cursor, Claude & VS Code
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Instant one-click setup
            </li>
            {!isFree && (
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                Cancel anytime
              </li>
            )}
          </ul>
        </div>

        {/* MCP status */}
        {!mcpEnabled && (
          <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <span className="text-yellow-600">MCP is currently disabled</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
