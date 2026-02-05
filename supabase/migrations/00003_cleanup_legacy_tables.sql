-- Cleanup migration: Remove legacy tables from previous implementation
-- Keep only: profiles, knowledge_bases, sources, chunks

-- Drop tables in correct order (respecting foreign key constraints)
drop table if exists public.api_keys cascade;
drop table if exists public.kb_subscriptions cascade;
drop table if exists public.kb_pricing cascade;
drop table if exists public.kb_blocks cascade;
drop table if exists public.kb_pages cascade;
drop table if exists public.import_jobs cascade;
drop table if exists public.documents cascade;
drop table if exists public.services cascade;

-- Ensure sources table exists (in case it was named differently)
-- Check if sources table exists, if not create it
do $$
begin
  if not exists (select from pg_tables where schemaname = 'public' and tablename = 'sources') then
    create table public.sources (
      id uuid default gen_random_uuid() primary key,
      knowledge_base_id uuid not null references public.knowledge_bases(id) on delete cascade,
      type text not null check (type in ('file', 'url')),
      name text not null,
      url text,
      file_path text,
      file_size integer,
      mime_type text,
      status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
      error_message text,
      content text,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null,
      updated_at timestamp with time zone default timezone('utc'::text, now()) not null
    );

    -- Enable RLS
    alter table public.sources enable row level security;

    -- RLS Policies
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

    -- Indexes
    create index sources_knowledge_base_id_idx on public.sources(knowledge_base_id);
    create index sources_status_idx on public.sources(status);

    -- Trigger for updated_at
    create trigger on_source_updated
      before update on public.sources
      for each row execute procedure public.handle_updated_at();
  end if;
end $$;
