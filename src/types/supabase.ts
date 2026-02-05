export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          knowledge_base_id: string
          last_used_at: string | null
          name: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          knowledge_base_id: string
          last_used_at?: string | null
          name: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          knowledge_base_id?: string
          last_used_at?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string | null
          embedding: string | null
          id: string
          knowledge_base_id: string
          metadata: Json
          page_id: string | null
          source_title: string | null
          token_count: number
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          knowledge_base_id: string
          metadata?: Json
          page_id?: string | null
          source_title?: string | null
          token_count?: number
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          id?: string
          knowledge_base_id?: string
          metadata?: Json
          page_id?: string | null
          source_title?: string | null
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunks_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "kb_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          chunk_count: number
          content: string | null
          created_at: string
          error_message: string | null
          file_name: string | null
          file_url: string | null
          id: string
          knowledge_base_id: string
          metadata: Json
          processed_at: string | null
          source_type: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          chunk_count?: number
          content?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          knowledge_base_id: string
          metadata?: Json
          processed_at?: string | null
          source_type: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          chunk_count?: number
          content?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          knowledge_base_id?: string
          metadata?: Json
          processed_at?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          created_at: string
          description: string | null
          document_count: number
          icon_url: string | null
          id: string
          is_public: boolean
          last_synced_at: string | null
          name: string
          settings: Json | null
          slug: string
          status: string
          total_chunks: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_count?: number
          icon_url?: string | null
          id?: string
          is_public?: boolean
          last_synced_at?: string | null
          name: string
          settings?: Json | null
          slug: string
          status?: string
          total_chunks?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_count?: number
          icon_url?: string | null
          id?: string
          is_public?: boolean
          last_synced_at?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          status?: string
          total_chunks?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kb_blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          page_id: string
          position: number
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          page_id: string
          position?: number
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          page_id?: string
          position?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "kb_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_pages: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          knowledge_base_id: string
          parent_id: string | null
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          knowledge_base_id: string
          parent_id?: string | null
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          knowledge_base_id?: string
          parent_id?: string | null
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_pages_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kb_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          creator_bio: string | null
          creator_slug: string | null
          email: string | null
          full_name: string | null
          id: string
          is_creator: boolean | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          creator_bio?: string | null
          creator_slug?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_creator?: boolean | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          creator_bio?: string | null
          creator_slug?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_creator?: boolean | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          creator_id: string
          deployment: Json | null
          description: string | null
          id: string
          knowledge: Json | null
          logo_url: string | null
          mcp_config: Json | null
          name: string
          pack_info: Json | null
          parsed_content: Json | null
          pricing: Json | null
          published_at: string | null
          slug: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          deployment?: Json | null
          description?: string | null
          id?: string
          knowledge?: Json | null
          logo_url?: string | null
          mcp_config?: Json | null
          name: string
          pack_info?: Json | null
          parsed_content?: Json | null
          pricing?: Json | null
          published_at?: string | null
          slug: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          deployment?: Json | null
          description?: string | null
          id?: string
          knowledge?: Json | null
          logo_url?: string | null
          mcp_config?: Json | null
          name?: string
          pack_info?: Json | null
          parsed_content?: Json | null
          pricing?: Json | null
          published_at?: string | null
          slug?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_chunks: {
        Args: {
          p_knowledge_base_id: string
          p_limit?: number
          p_query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          document_title: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
