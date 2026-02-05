export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          is_creator: boolean
          creator_slug: string | null
          creator_bio: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          is_creator?: boolean
          creator_slug?: string | null
          creator_bio?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          is_creator?: boolean
          creator_slug?: string | null
          creator_bio?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_bases: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          slug: string
          visibility: 'private' | 'public'
          pricing_model: 'free' | 'paid'
          price_cents: number
          mcp_enabled: boolean
          stripe_product_id: string | null
          stripe_price_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          slug: string
          visibility?: 'private' | 'public'
          pricing_model?: 'free' | 'paid'
          price_cents?: number
          mcp_enabled?: boolean
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          slug?: string
          visibility?: 'private' | 'public'
          pricing_model?: 'free' | 'paid'
          price_cents?: number
          mcp_enabled?: boolean
          stripe_product_id?: string | null
          stripe_price_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          id: string
          knowledge_base_id: string
          type: 'file' | 'url'
          name: string
          url: string | null
          file_path: string | null
          file_size: number | null
          mime_type: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          content: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          knowledge_base_id: string
          type: 'file' | 'url'
          name: string
          url?: string | null
          file_path?: string | null
          file_size?: number | null
          mime_type?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          knowledge_base_id?: string
          type?: 'file' | 'url'
          name?: string
          url?: string | null
          file_path?: string | null
          file_size?: number | null
          mime_type?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          content?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          }
        ]
      }
      chunks: {
        Row: {
          id: string
          source_id: string
          knowledge_base_id: string
          content: string
          embedding: string | null
          chunk_index: number
          created_at: string
        }
        Insert: {
          id?: string
          source_id: string
          knowledge_base_id: string
          content: string
          embedding?: string | null
          chunk_index: number
          created_at?: string
        }
        Update: {
          id?: string
          source_id?: string
          knowledge_base_id?: string
          content?: string
          embedding?: string | null
          chunk_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chunks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunks_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          }
        ]
      }
      oauth_clients: {
        Row: {
          id: string
          client_id: string
          client_secret_hash: string
          knowledge_base_id: string
          user_id: string
          name: string
          redirect_uris: string[]
          scopes: string[]
          created_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          client_secret_hash: string
          knowledge_base_id: string
          user_id: string
          name: string
          redirect_uris?: string[]
          scopes?: string[]
          created_at?: string
          revoked_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          client_secret_hash?: string
          knowledge_base_id?: string
          user_id?: string
          name?: string
          redirect_uris?: string[]
          scopes?: string[]
          created_at?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_clients_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          }
        ]
      }
      oauth_tokens: {
        Row: {
          id: string
          client_id: string
          knowledge_base_id: string
          user_id: string
          access_token_hash: string
          refresh_token_hash: string | null
          scopes: string[]
          expires_at: string
          refresh_expires_at: string | null
          created_at: string
          last_used_at: string | null
          subscription_id: string | null
        }
        Insert: {
          id?: string
          client_id: string
          knowledge_base_id: string
          user_id: string
          access_token_hash: string
          refresh_token_hash?: string | null
          scopes: string[]
          expires_at: string
          refresh_expires_at?: string | null
          created_at?: string
          last_used_at?: string | null
          subscription_id?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          knowledge_base_id?: string
          user_id?: string
          access_token_hash?: string
          refresh_token_hash?: string | null
          scopes?: string[]
          expires_at?: string
          refresh_expires_at?: string | null
          created_at?: string
          last_used_at?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_tokens_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          }
        ]
      }
      oauth_codes: {
        Row: {
          id: string
          code_hash: string
          client_id: string
          knowledge_base_id: string
          user_id: string
          redirect_uri: string
          scopes: string[]
          code_challenge: string | null
          code_challenge_method: string | null
          expires_at: string
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code_hash: string
          client_id: string
          knowledge_base_id: string
          user_id: string
          redirect_uri: string
          scopes: string[]
          code_challenge?: string | null
          code_challenge_method?: string | null
          expires_at: string
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code_hash?: string
          client_id?: string
          knowledge_base_id?: string
          user_id?: string
          redirect_uri?: string
          scopes?: string[]
          code_challenge?: string | null
          code_challenge_method?: string | null
          expires_at?: string
          used_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_codes_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          }
        ]
      }
      mcp_requests: {
        Row: {
          id: string
          knowledge_base_id: string
          client_id: string | null
          method: string
          query: string | null
          duration_ms: number | null
          status_code: number | null
          error_message: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          knowledge_base_id: string
          client_id?: string | null
          method: string
          query?: string | null
          duration_ms?: number | null
          status_code?: number | null
          error_message?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          knowledge_base_id?: string
          client_id?: string | null
          method?: string
          query?: string | null
          duration_ms?: number | null
          status_code?: number | null
          error_message?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_requests_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          }
        ]
      }
      kb_subscriptions: {
        Row: {
          id: string
          knowledge_base_id: string
          subscriber_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing'
          current_period_start: string | null
          current_period_end: string | null
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          knowledge_base_id: string
          subscriber_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing'
          current_period_start?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          knowledge_base_id?: string
          subscriber_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing'
          current_period_start?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_subscriptions_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_chunks: {
        Args: {
          query_embedding: string
          match_knowledge_base_id: string
          match_count?: number
        }
        Returns: {
          content: string
          source_name: string
          source_type: string
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type exports
export type Profile = Database['public']['Tables']['profiles']['Row']

export type KnowledgeBase = Database['public']['Tables']['knowledge_bases']['Row']
export type KnowledgeBaseInsert = Database['public']['Tables']['knowledge_bases']['Insert']
export type KnowledgeBaseUpdate = Database['public']['Tables']['knowledge_bases']['Update']

export type Source = Database['public']['Tables']['sources']['Row']
export type SourceInsert = Database['public']['Tables']['sources']['Insert']
export type SourceUpdate = Database['public']['Tables']['sources']['Update']

export type Chunk = Database['public']['Tables']['chunks']['Row']
export type ChunkInsert = Database['public']['Tables']['chunks']['Insert']

export type OAuthClient = Database['public']['Tables']['oauth_clients']['Row']
export type OAuthClientInsert = Database['public']['Tables']['oauth_clients']['Insert']

export type OAuthToken = Database['public']['Tables']['oauth_tokens']['Row']
export type OAuthTokenInsert = Database['public']['Tables']['oauth_tokens']['Insert']

export type OAuthCode = Database['public']['Tables']['oauth_codes']['Row']
export type OAuthCodeInsert = Database['public']['Tables']['oauth_codes']['Insert']

export type MCPRequest = Database['public']['Tables']['mcp_requests']['Row']
export type MCPRequestInsert = Database['public']['Tables']['mcp_requests']['Insert']

export type KBSubscription = Database['public']['Tables']['kb_subscriptions']['Row']
export type KBSubscriptionInsert = Database['public']['Tables']['kb_subscriptions']['Insert']
export type KBSubscriptionUpdate = Database['public']['Tables']['kb_subscriptions']['Update']
