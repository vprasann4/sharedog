'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, Upload, Loader2, FileText, X } from 'lucide-react'
import { addUrlSource, addFileSource } from '@/app/(dashboard)/knowledge-bases/actions'

interface AddSourceModalProps {
  knowledgeBaseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddSourceModal({ knowledgeBaseId, open, onOpenChange }: AddSourceModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url')

  // URL state
  const [url, setUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  // File state
  const [files, setFiles] = useState<File[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setUrlLoading(true)
    setUrlError(null)

    const result = await addUrlSource(knowledgeBaseId, url.trim())

    if (result.success) {
      setUrl('')
      onOpenChange(false)
      router.refresh()
    } else {
      setUrlError(result.error)
    }

    setUrlLoading(false)
  }

  const handleFileUpload = async () => {
    if (files.length === 0) return

    setFileLoading(true)
    setFileError(null)

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      const result = await addFileSource(knowledgeBaseId, formData)

      if (!result.success) {
        setFileError(result.error)
        setFileLoading(false)
        return
      }
    }

    setFiles([])
    onOpenChange(false)
    router.refresh()
    setFileLoading(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...droppedFiles])
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
          <DialogDescription>
            Add a URL or upload files to your knowledge base
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'url' | 'file')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="gap-2">
              <Globe className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-2">
              <Upload className="h-4 w-4" />
              File Upload
            </TabsTrigger>
          </TabsList>

          {/* URL Tab */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll fetch and extract text content from this URL
                </p>
              </div>

              {urlError && (
                <div className="text-sm text-destructive">{urlError}</div>
              )}

              <Button type="submit" className="w-full" disabled={urlLoading || !url.trim()}>
                {urlLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add URL
              </Button>
            </form>
          </TabsContent>

          {/* File Upload Tab */}
          <TabsContent value="file" className="space-y-4 mt-4">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to browse
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.md,.docx,.csv,.json"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button variant="outline" size="sm" asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Browse Files
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Supports PDF, TXT, MD, DOCX, CSV, JSON
              </p>
            </div>

            {/* Selected files list */}
            {files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({files.length})</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fileError && (
              <div className="text-sm text-destructive">{fileError}</div>
            )}

            <Button
              onClick={handleFileUpload}
              className="w-full"
              disabled={fileLoading || files.length === 0}
            >
              {fileLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Files'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
