'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { KnowledgeBaseInsert, SourceInsert, KnowledgeBase, Source } from '@/lib/supabase/types'

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

// Knowledge Base Actions
export async function createKnowledgeBase(
  input: Pick<KnowledgeBaseInsert, 'name' | 'description' | 'visibility' | 'pricing_model'>
): Promise<ActionResult<KnowledgeBase>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const slug = generateSlug(input.name)

  const { data, error } = await supabase
    .from('knowledge_bases')
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description,
      slug,
      visibility: input.visibility || 'private',
      pricing_model: input.pricing_model || 'free',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating knowledge base:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/knowledge-bases')
  return { success: true, data }
}

export async function updateKnowledgeBase(
  id: string,
  input: Partial<Pick<KnowledgeBaseInsert, 'name' | 'description' | 'visibility' | 'pricing_model' | 'mcp_enabled'>>
): Promise<ActionResult<KnowledgeBase>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('knowledge_bases')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating knowledge base:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/knowledge-bases/${id}`)
  revalidatePath('/knowledge-bases')
  return { success: true, data }
}

export async function deleteKnowledgeBase(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('knowledge_bases')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting knowledge base:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/knowledge-bases')
  return { success: true }
}

// Source Actions
export async function addUrlSource(
  knowledgeBaseId: string,
  url: string
): Promise<ActionResult<Source>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify ownership of knowledge base
  const { data: kb } = await supabase
    .from('knowledge_bases')
    .select('id')
    .eq('id', knowledgeBaseId)
    .eq('user_id', user.id)
    .single()

  if (!kb) {
    return { success: false, error: 'Knowledge base not found' }
  }

  // Extract domain as name
  let name: string
  try {
    const urlObj = new URL(url)
    name = urlObj.hostname
  } catch {
    return { success: false, error: 'Invalid URL' }
  }

  const { data, error } = await supabase
    .from('sources')
    .insert({
      knowledge_base_id: knowledgeBaseId,
      type: 'url',
      name,
      url,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding URL source:', error)
    return { success: false, error: error.message }
  }

  // Trigger processing in background (don't await)
  processSource(data.id).catch(console.error)

  revalidatePath(`/knowledge-bases/${knowledgeBaseId}`)
  return { success: true, data }
}

export async function addFileSource(
  knowledgeBaseId: string,
  formData: FormData
): Promise<ActionResult<Source>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  // Verify ownership of knowledge base
  const { data: kb } = await supabase
    .from('knowledge_bases')
    .select('id')
    .eq('id', knowledgeBaseId)
    .eq('user_id', user.id)
    .single()

  if (!kb) {
    return { success: false, error: 'Knowledge base not found' }
  }

  // Upload file to storage
  const fileExt = file.name.split('.').pop()
  const filePath = `${user.id}/${knowledgeBaseId}/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('sources')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Error uploading file:', uploadError)
    return { success: false, error: uploadError.message }
  }

  // Create source record
  const { data, error } = await supabase
    .from('sources')
    .insert({
      knowledge_base_id: knowledgeBaseId,
      type: 'file',
      name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating source record:', error)
    return { success: false, error: error.message }
  }

  // Trigger processing in background (don't await)
  processSource(data.id).catch(console.error)

  revalidatePath(`/knowledge-bases/${knowledgeBaseId}`)
  return { success: true, data }
}

export async function deleteSource(
  knowledgeBaseId: string,
  sourceId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get source to check file_path
  const { data: source } = await supabase
    .from('sources')
    .select('file_path, knowledge_base_id')
    .eq('id', sourceId)
    .single()

  if (!source) {
    return { success: false, error: 'Source not found' }
  }

  // Verify ownership via knowledge base
  const { data: kb } = await supabase
    .from('knowledge_bases')
    .select('id')
    .eq('id', source.knowledge_base_id)
    .eq('user_id', user.id)
    .single()

  if (!kb) {
    return { success: false, error: 'Not authorized' }
  }

  // Delete file from storage if it exists
  if (source.file_path) {
    await supabase.storage.from('sources').remove([source.file_path])
  }

  // Delete source record (chunks will cascade delete)
  const { error } = await supabase
    .from('sources')
    .delete()
    .eq('id', sourceId)

  if (error) {
    console.error('Error deleting source:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/knowledge-bases/${knowledgeBaseId}`)
  return { success: true }
}

export async function processSource(sourceId: string): Promise<ActionResult<{ chunksCreated: number }>> {
  const { processSource: runProcessing } = await import('@/lib/rag')

  const result = await runProcessing(sourceId)

  if (!result.success) {
    return { success: false, error: result.error || 'Processing failed' }
  }

  return { success: true, data: { chunksCreated: result.chunksCreated || 0 } }
}

// Process all pending sources for a knowledge base
export async function processAllPendingSources(knowledgeBaseId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify ownership
  const { data: kb } = await supabase
    .from('knowledge_bases')
    .select('id')
    .eq('id', knowledgeBaseId)
    .eq('user_id', user.id)
    .single()

  if (!kb) {
    return { success: false, error: 'Knowledge base not found' }
  }

  // Get all pending sources
  const { data: sources } = await supabase
    .from('sources')
    .select('id')
    .eq('knowledge_base_id', knowledgeBaseId)
    .eq('status', 'pending')

  if (!sources || sources.length === 0) {
    return { success: true }
  }

  // Process each source
  const { processSource: runProcessing } = await import('@/lib/rag')

  for (const source of sources) {
    await runProcessing(source.id)
  }

  revalidatePath(`/knowledge-bases/${knowledgeBaseId}`)
  return { success: true }
}
