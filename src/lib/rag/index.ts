import { openai } from '@ai-sdk/openai'
import { embed, embedMany } from 'ai'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// ---------------------------------
// LlamaParse API Configuration
// ---------------------------------

const LLAMAPARSE_API_URL = 'https://api.cloud.llamaindex.ai/api/v2/parse'
const LLAMAPARSE_API_KEY = process.env.LLAMAPARSE_API_KEY

// Supported file types for LlamaParse
const LLAMAPARSE_SUPPORTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/msword', // .doc
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.ms-excel', // .xls
  'text/html',
  'application/epub+zip', // .epub
]

// ---------------------------------
// Text Chunking
// ---------------------------------

interface ChunkOptions {
  maxChars?: number
  overlap?: number
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const { maxChars = 2000, overlap = 200 } = options

  // Clean up text
  const cleanText = text.replace(/\r\n/g, '\n').trim()

  if (cleanText.length <= maxChars) {
    return [cleanText]
  }

  const chunks: string[] = []

  // Split by double newlines (paragraphs) first
  const paragraphs = cleanText.split(/\n\n+/)

  let currentChunk = ''

  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds max, save current and start new
    if (currentChunk.length + paragraph.length + 2 > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())

        // Start new chunk with overlap from end of previous
        const overlapText = currentChunk.slice(-overlap)
        currentChunk = overlapText + '\n\n' + paragraph
      } else {
        // Paragraph itself is too long, split by sentences
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChars) {
            if (currentChunk) {
              chunks.push(currentChunk.trim())
              const overlapText = currentChunk.slice(-overlap)
              currentChunk = overlapText + ' ' + sentence
            } else {
              // Single sentence too long, just push it
              chunks.push(sentence.trim())
            }
          } else {
            currentChunk += sentence
          }
        }
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(chunk => chunk.length > 0)
}

// ---------------------------------
// Embeddings
// ---------------------------------

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: text,
  })
  return embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-3-small'),
    values: texts,
  })
  return embeddings
}

// ---------------------------------
// Content Extraction
// ---------------------------------

export async function extractTextFromUrl(url: string): Promise<string> {
  // Use Jina Reader for URL extraction (free, simple)
  const jinaUrl = `https://r.jina.ai/${url}`

  const response = await fetch(jinaUrl, {
    headers: {
      'Accept': 'text/plain',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`)
  }

  const text = await response.text()
  return text
}

export async function extractTextFromFile(
  fileBuffer: ArrayBuffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  // For text-based files, just decode
  if (
    mimeType === 'text/plain' ||
    mimeType === 'text/markdown' ||
    mimeType === 'text/csv' ||
    mimeType === 'application/json'
  ) {
    const decoder = new TextDecoder('utf-8')
    return decoder.decode(fileBuffer)
  }

  // For complex documents (PDF, DOCX, PPTX, etc.), use LlamaParse
  if (LLAMAPARSE_SUPPORTED_TYPES.includes(mimeType)) {
    return extractWithLlamaParse(fileBuffer, fileName)
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}

// ---------------------------------
// LlamaParse Integration
// ---------------------------------

interface LlamaParseContentMetadata {
  size_bytes?: number
  exists?: boolean
  presigned_url?: string
}

interface LlamaParseJobResponse {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  markdown?: string
  text?: string
  error_message?: string
  markdown_content_metadata?: LlamaParseContentMetadata
  text_content_metadata?: LlamaParseContentMetadata
}

async function extractWithLlamaParse(
  fileBuffer: ArrayBuffer,
  fileName: string
): Promise<string> {
  if (!LLAMAPARSE_API_KEY) {
    throw new Error('LLAMAPARSE_API_KEY is not configured')
  }

  // Step 1: Upload file and start parsing job
  const formData = new FormData()
  const blob = new Blob([fileBuffer])
  formData.append('file', blob, fileName)
  formData.append('configuration', JSON.stringify({
    tier: 'agentic', // Good balance of speed and quality
    version: 'latest',
  }))

  const uploadResponse = await fetch(`${LLAMAPARSE_API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
    },
    body: formData,
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    throw new Error(`LlamaParse upload failed: ${error}`)
  }

  const uploadResult = await uploadResponse.json() as LlamaParseJobResponse
  const jobId = uploadResult.id

  // Step 2: Poll for job completion (max 10 minutes for large docs)
  const maxWaitTime = 10 * 60 * 1000 // 10 minutes
  const pollInterval = 3000 // 3 seconds
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    // Request content metadata to get presigned URLs
    const statusResponse = await fetch(
      `${LLAMAPARSE_API_URL}/${jobId}?expand=markdown,text,markdown_content_metadata,text_content_metadata`,
      {
        headers: {
          'Authorization': `Bearer ${LLAMAPARSE_API_KEY}`,
        },
      }
    )

    if (!statusResponse.ok) {
      throw new Error(`Failed to check job status: ${statusResponse.statusText}`)
    }

    const jobStatus = await statusResponse.json()
    const status = jobStatus.job?.status || jobStatus.status

    if (status === 'COMPLETED') {
      // Content is in markdown.pages array - combine all pages
      if (jobStatus.markdown?.pages) {
        const content = jobStatus.markdown.pages
          .map((page: { markdown?: string; page_number: number }) => page.markdown || '')
          .join('\n\n')
        if (content) {
          return content
        }
      }

      // Fallback to text pages
      if (jobStatus.text?.pages) {
        const content = jobStatus.text.pages
          .map((page: { text?: string; page_number: number }) => page.text || '')
          .join('\n\n')
        if (content) {
          return content
        }
      }

      // Fall back to presigned URL download
      const markdownUrl = jobStatus.result_content_metadata?.markdown?.presigned_url
      const textUrl = jobStatus.result_content_metadata?.text?.presigned_url

      if (markdownUrl) {
        const mdResponse = await fetch(markdownUrl)
        if (mdResponse.ok) {
          return await mdResponse.text()
        }
      }

      if (textUrl) {
        const txtResponse = await fetch(textUrl)
        if (txtResponse.ok) {
          return await txtResponse.text()
        }
      }

      throw new Error('LlamaParse completed but no content available')
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
      throw new Error(`LlamaParse job failed: ${jobStatus.job?.error_message || 'Unknown error'}`)
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error('LlamaParse job timed out after 10 minutes')
}

// ---------------------------------
// Full Processing Pipeline
// ---------------------------------

export interface ProcessSourceResult {
  success: boolean
  chunksCreated?: number
  error?: string
}

export async function processSource(sourceId: string): Promise<ProcessSourceResult> {
  const supabase = await createClient()

  // Get source
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('*, knowledge_bases!inner(user_id)')
    .eq('id', sourceId)
    .single()

  if (sourceError || !source) {
    return { success: false, error: 'Source not found' }
  }

  try {
    // Update status to processing
    await supabase
      .from('sources')
      .update({ status: 'processing' })
      .eq('id', sourceId)

    // Extract content based on type
    let content: string

    if (source.type === 'url') {
      if (!source.url) {
        throw new Error('URL source missing URL')
      }
      content = await extractTextFromUrl(source.url)
    } else {
      // File source - download from storage
      if (!source.file_path) {
        throw new Error('File source missing file path')
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('sources')
        .download(source.file_path)

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`)
      }

      const buffer = await fileData.arrayBuffer()
      content = await extractTextFromFile(buffer, source.mime_type || '', source.name)
    }

    // Update source with extracted content
    await supabase
      .from('sources')
      .update({ content })
      .eq('id', sourceId)

    // Chunk the content
    const chunks = chunkText(content)

    if (chunks.length === 0) {
      throw new Error('No content to process')
    }

    // Generate embeddings
    const embeddings = await generateEmbeddings(chunks)

    // Delete existing chunks for this source
    await supabase
      .from('chunks')
      .delete()
      .eq('source_id', sourceId)

    // Insert new chunks
    const chunkRecords = chunks.map((chunkContent, index) => ({
      source_id: sourceId,
      knowledge_base_id: source.knowledge_base_id,
      content: chunkContent,
      chunk_index: index,
      embedding: JSON.stringify(embeddings[index]),
    }))

    const { error: insertError } = await supabase
      .from('chunks')
      .insert(chunkRecords)

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`)
    }

    // Update source status to completed
    await supabase
      .from('sources')
      .update({ status: 'completed', error_message: null })
      .eq('id', sourceId)

    return { success: true, chunksCreated: chunks.length }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update source status to failed
    await supabase
      .from('sources')
      .update({ status: 'failed', error_message: errorMessage })
      .eq('id', sourceId)

    return { success: false, error: errorMessage }
  }
}

// ---------------------------------
// Vector Search
// ---------------------------------

export interface SearchResult {
  content: string
  sourceName: string
  sourceType: string
  similarity: number
}

export interface SearchOptions {
  useServiceClient?: boolean
}

export async function searchKnowledgeBase(
  knowledgeBaseId: string,
  query: string,
  limit: number = 5,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // Use service client for MCP requests (no user session)
  // Use regular client for authenticated user requests
  const supabase = options.useServiceClient
    ? createServiceClient()
    : await createClient()

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query)

  // Search using pgvector
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_knowledge_base_id: knowledgeBaseId,
    match_count: limit,
  })

  if (error) {
    console.error('Search error:', error)
    return []
  }

  // Map snake_case to camelCase
  return (data || []).map((row) => ({
    content: row.content,
    sourceName: row.source_name,
    sourceType: row.source_type,
    similarity: row.similarity,
  }))
}
