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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cadastros: {
        Row: {
          celular: string
          cnpj: string
          comprovante_url: string | null
          cpf: string
          created_at: string
          data_nascimento: string
          email: string
          error_message: string | null
          etapa_atual: string | null
          frase_seguranca_hash: string
          id: string
          nome_mae: string | null
          progresso: number | null
          senha_hash: string
          status: string
          tempo_estimado: number | null
          tempo_fim: string | null
          tempo_inicio: string | null
          updated_at: string
        }
        Insert: {
          celular: string
          cnpj: string
          comprovante_url?: string | null
          cpf: string
          created_at?: string
          data_nascimento: string
          email: string
          error_message?: string | null
          etapa_atual?: string | null
          frase_seguranca_hash: string
          id?: string
          nome_mae?: string | null
          progresso?: number | null
          senha_hash: string
          status?: string
          tempo_estimado?: number | null
          tempo_fim?: string | null
          tempo_inicio?: string | null
          updated_at?: string
        }
        Update: {
          celular?: string
          cnpj?: string
          comprovante_url?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string
          email?: string
          error_message?: string | null
          etapa_atual?: string | null
          frase_seguranca_hash?: string
          id?: string
          nome_mae?: string | null
          progresso?: number | null
          senha_hash?: string
          status?: string
          tempo_estimado?: number | null
          tempo_fim?: string | null
          tempo_inicio?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cnpj_jobs: {
        Row: {
          cnpjs: string[]
          created_at: string
          error_message: string | null
          id: string
          progress: number | null
          results: Json | null
          status: string
          total: number | null
          updated_at: string
        }
        Insert: {
          cnpjs: string[]
          created_at?: string
          error_message?: string | null
          id?: string
          progress?: number | null
          results?: Json | null
          status?: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          cnpjs?: string[]
          created_at?: string
          error_message?: string | null
          id?: string
          progress?: number | null
          results?: Json | null
          status?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          cadastros_hoje: number | null
          created_at: string
          date: string
          id: string
          taxa_sucesso: number | null
          tempo_medio: number | null
          updated_at: string
        }
        Insert: {
          cadastros_hoje?: number | null
          created_at?: string
          date?: string
          id?: string
          taxa_sucesso?: number | null
          tempo_medio?: number | null
          updated_at?: string
        }
        Update: {
          cadastros_hoje?: number | null
          created_at?: string
          date?: string
          id?: string
          taxa_sucesso?: number | null
          tempo_medio?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_daily_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
