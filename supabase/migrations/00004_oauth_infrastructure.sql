-- OAuth Infrastructure for MCP Server
-- This migration adds tables for OAuth 2.1 authentication flow

-- OAuth clients (MCP connections)
CREATE TABLE public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  client_secret_hash TEXT NOT NULL,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  redirect_uris TEXT[] DEFAULT '{}',
  scopes TEXT[] DEFAULT '{"search", "list_sources", "get_info"}',
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

-- OAuth access tokens
CREATE TABLE public.oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_hash TEXT UNIQUE NOT NULL,
  refresh_token_hash TEXT UNIQUE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

-- Authorization codes (temporary, for OAuth flow)
CREATE TABLE public.oauth_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT UNIQUE NOT NULL,
  client_id TEXT REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scopes TEXT[] NOT NULL,
  code_challenge TEXT,
  code_challenge_method TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MCP request audit log
CREATE TABLE public.mcp_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  client_id TEXT,
  method TEXT NOT NULL,
  query TEXT,
  duration_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_oauth_clients_kb ON oauth_clients(knowledge_base_id);
CREATE INDEX idx_oauth_clients_user ON oauth_clients(user_id);
CREATE INDEX idx_oauth_tokens_access ON oauth_tokens(access_token_hash);
CREATE INDEX idx_oauth_tokens_refresh ON oauth_tokens(refresh_token_hash);
CREATE INDEX idx_oauth_tokens_kb ON oauth_tokens(knowledge_base_id);
CREATE INDEX idx_oauth_tokens_client ON oauth_tokens(client_id);
CREATE INDEX idx_oauth_codes_hash ON oauth_codes(code_hash);
CREATE INDEX idx_mcp_requests_kb_time ON mcp_requests(knowledge_base_id, created_at DESC);

-- RLS policies
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_requests ENABLE ROW LEVEL SECURITY;

-- OAuth clients policies
CREATE POLICY "Users can view their own OAuth clients"
  ON oauth_clients FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create OAuth clients for their KBs"
  ON oauth_clients FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM knowledge_bases kb
      WHERE kb.id = knowledge_base_id AND kb.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own OAuth clients"
  ON oauth_clients FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own OAuth clients"
  ON oauth_clients FOR DELETE
  USING (user_id = auth.uid());

-- OAuth tokens policies (service role only for validation)
CREATE POLICY "Users can view their own tokens"
  ON oauth_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tokens"
  ON oauth_tokens FOR DELETE
  USING (user_id = auth.uid());

-- OAuth codes policies (service role handles creation/validation)
CREATE POLICY "Users can view their own codes"
  ON oauth_codes FOR SELECT
  USING (user_id = auth.uid());

-- MCP requests policies
CREATE POLICY "Users can view their MCP request logs"
  ON mcp_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_bases kb
      WHERE kb.id = knowledge_base_id AND kb.user_id = auth.uid()
    )
  );
