-- Knowledge Bases table
-- Stores the main knowledge base metadata
create table if not exists public.knowledge_bases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  slug text not null,

  -- Visibility: 'private' (only owner), 'public' (anyone can access)
  visibility text not null default 'private' check (visibility in ('private', 'public')),

  -- Pricing model: 'free', 'paid'
  pricing_model text not null default 'free' check (pricing_model in ('free', 'paid')),
  price_cents integer default 0,

  -- MCP endpoint enabled
  mcp_enabled boolean default false,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Unique slug per user
  unique(user_id, slug)
);

-- Sources table
-- Stores data sources (files, URLs) for each knowledge base
create table if not exists public.sources (
  id uuid default gen_random_uuid() primary key,
  knowledge_base_id uuid not null references public.knowledge_bases(id) on delete cascade,

  -- Source type: 'file', 'url'
  type text not null check (type in ('file', 'url')),

  -- For files: original filename, for URLs: domain
  name text not null,

  -- For URLs: the full URL
  url text,

  -- For files: storage path
  file_path text,
  file_size integer,
  mime_type text,

  -- Processing status: 'pending', 'processing', 'completed', 'failed'
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,

  -- Extracted content (text from file or URL)
  content text,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chunks table
-- Stores vector embeddings for semantic search
create table if not exists public.chunks (
  id uuid default gen_random_uuid() primary key,
  source_id uuid not null references public.sources(id) on delete cascade,
  knowledge_base_id uuid not null references public.knowledge_bases(id) on delete cascade,

  -- The text content of this chunk
  content text not null,

  -- Vector embedding (using pgvector)
  embedding vector(1536),

  -- Metadata
  chunk_index integer not null,

  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable pgvector extension
create extension if not exists vector;

-- Create index for vector similarity search
create index if not exists chunks_embedding_idx on public.chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Indexes for performance
create index if not exists knowledge_bases_user_id_idx on public.knowledge_bases(user_id);
create index if not exists knowledge_bases_slug_idx on public.knowledge_bases(slug);
create index if not exists sources_knowledge_base_id_idx on public.sources(knowledge_base_id);
create index if not exists sources_status_idx on public.sources(status);
create index if not exists chunks_source_id_idx on public.chunks(source_id);
create index if not exists chunks_knowledge_base_id_idx on public.chunks(knowledge_base_id);

-- RLS Policies
alter table public.knowledge_bases enable row level security;
alter table public.sources enable row level security;
alter table public.chunks enable row level security;

-- Knowledge bases: users can only see their own (or public ones)
create policy "Users can view their own knowledge bases"
  on public.knowledge_bases for select
  using (auth.uid() = user_id);

create policy "Users can view public knowledge bases"
  on public.knowledge_bases for select
  using (visibility = 'public');

create policy "Users can insert their own knowledge bases"
  on public.knowledge_bases for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own knowledge bases"
  on public.knowledge_bases for update
  using (auth.uid() = user_id);

create policy "Users can delete their own knowledge bases"
  on public.knowledge_bases for delete
  using (auth.uid() = user_id);

-- Sources: users can manage sources for their own KBs
create policy "Users can view sources for their knowledge bases"
  on public.sources for select
  using (
    exists (
      select 1 from public.knowledge_bases kb
      where kb.id = knowledge_base_id and kb.user_id = auth.uid()
    )
  );

create policy "Users can insert sources for their knowledge bases"
  on public.sources for insert
  with check (
    exists (
      select 1 from public.knowledge_bases kb
      where kb.id = knowledge_base_id and kb.user_id = auth.uid()
    )
  );

create policy "Users can update sources for their knowledge bases"
  on public.sources for update
  using (
    exists (
      select 1 from public.knowledge_bases kb
      where kb.id = knowledge_base_id and kb.user_id = auth.uid()
    )
  );

create policy "Users can delete sources for their knowledge bases"
  on public.sources for delete
  using (
    exists (
      select 1 from public.knowledge_bases kb
      where kb.id = knowledge_base_id and kb.user_id = auth.uid()
    )
  );

-- Chunks: same as sources
create policy "Users can view chunks for their knowledge bases"
  on public.chunks for select
  using (
    exists (
      select 1 from public.knowledge_bases kb
      where kb.id = knowledge_base_id and kb.user_id = auth.uid()
    )
  );

create policy "Users can insert chunks for their knowledge bases"
  on public.chunks for insert
  with check (
    exists (
      select 1 from public.knowledge_bases kb
      where kb.id = knowledge_base_id and kb.user_id = auth.uid()
    )
  );

create policy "Users can delete chunks for their knowledge bases"
  on public.chunks for delete
  using (
    exists (
      select 1 from public.knowledge_bases kb
      where kb.id = knowledge_base_id and kb.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger on_knowledge_base_updated
  before update on public.knowledge_bases
  for each row execute procedure public.handle_updated_at();

create trigger on_source_updated
  before update on public.sources
  for each row execute procedure public.handle_updated_at();
