import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Link as LinkIcon, File, Image, FileCode } from 'lucide-react'

interface Source {
  id: string
  name: string
  type: 'file' | 'url'
  mime_type: string | null
  file_size: number | null
  created_at: string
}

interface KBSourcePreviewProps {
  sources: Source[]
  totalCount: number
}

function getSourceIcon(source: Source) {
  if (source.type === 'url') {
    return <LinkIcon className="h-4 w-4 text-blue-500" />
  }

  const mimeType = source.mime_type || ''
  if (mimeType.startsWith('image/')) {
    return <Image className="h-4 w-4 text-green-500" />
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />
  }
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript')) {
    return <FileCode className="h-4 w-4 text-yellow-500" />
  }
  return <File className="h-4 w-4 text-muted-foreground" />
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function KBSourcePreview({ sources, totalCount }: KBSourcePreviewProps) {
  if (sources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            This knowledge base doesn't have any sources yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Sources</span>
          <span className="text-sm font-normal text-muted-foreground">
            {totalCount} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
            >
              {getSourceIcon(source)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{source.name}</p>
              </div>
              {source.file_size && (
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(source.file_size)}
                </span>
              )}
            </div>
          ))}
        </div>

        {totalCount > sources.length && (
          <p className="mt-4 text-sm text-muted-foreground text-center">
            +{totalCount - sources.length} more sources
          </p>
        )}
      </CardContent>
    </Card>
  )
}
