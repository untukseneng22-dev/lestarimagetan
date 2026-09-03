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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_by: string | null
          id: string
          published_at: string
          title: string
        }
        Insert: {
          body: string
          created_by?: string | null
          id?: string
          published_at?: string
          title: string
        }
        Update: {
          body?: string
          created_by?: string | null
          id?: string
          published_at?: string
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      complaints: {
        Row: {
          created_at: string
          description: string
          id: string
          photo_url: string | null
          resident_id: string
          response: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          photo_url?: string | null
          resident_id: string
          response?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          photo_url?: string | null
          resident_id?: string
          response?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_order_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "market_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      market_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          qty: number
          subtotal: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          qty: number
          subtotal: number
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          qty?: number
          subtotal?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "market_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "market_products"
            referencedColumns: ["id"]
          },
        ]
      }
      market_orders: {
        Row: {
          address: string | null
          admin_note: string | null
          cash_due: number
          created_at: string
          id: string
          items_total: number
          locked: boolean
          method: string
          paid_from_balance: number
          processed_at: string | null
          processed_by: string | null
          proof_url: string | null
          received_at: string | null
          resident_id: string
          shipping_fee: number
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          cash_due?: number
          created_at?: string
          id?: string
          items_total?: number
          locked?: boolean
          method?: string
          paid_from_balance?: number
          processed_at?: string | null
          processed_by?: string | null
          proof_url?: string | null
          received_at?: string | null
          resident_id: string
          shipping_fee?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          cash_due?: number
          created_at?: string
          id?: string
          items_total?: number
          locked?: boolean
          method?: string
          paid_from_balance?: number
          processed_at?: string | null
          processed_by?: string | null
          proof_url?: string | null
          received_at?: string | null
          resident_id?: string
          shipping_fee?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      market_products: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          price: number
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          attempt_count: number
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          last_attempt_at: string
          message: string
          provider: string
          recipient_name: string | null
          recipient_phone: string
          status: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          last_attempt_at?: string
          message: string
          provider?: string
          recipient_name?: string | null
          recipient_phone: string
          status?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          last_attempt_at?: string
          message?: string
          provider?: string
          recipient_name?: string | null
          recipient_phone?: string
          status?: string
        }
        Relationships: []
      }
      pickup_tasks: {
        Row: {
          address: string
          assigned_to: string | null
          created_at: string
          id: string
          notes: string | null
          resident_id: string | null
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          assigned_to?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resident_id?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_to?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resident_id?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          category_id: string
          changed_by: string | null
          created_at: string
          effective_at: string
          id: string
          price_per_kg: number
        }
        Insert: {
          category_id: string
          changed_by?: string | null
          created_at?: string
          effective_at?: string
          id?: string
          price_per_kg: number
        }
        Update: {
          category_id?: string
          changed_by?: string | null
          created_at?: string
          effective_at?: string
          id?: string
          price_per_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "waste_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          rt: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          rt?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          rt?: string | null
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          category_id: string | null
          category_name: string
          id: string
          price_per_kg: number
          subtotal: number
          transaction_id: string
          weight_kg: number
        }
        Insert: {
          category_id?: string | null
          category_name: string
          id?: string
          price_per_kg: number
          subtotal: number
          transaction_id: string
          weight_kg: number
        }
        Update: {
          category_id?: string | null
          category_name?: string
          id?: string
          price_per_kg?: number
          subtotal?: number
          transaction_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "waste_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          deposit_date: string
          id: string
          recorded_by: string | null
          resident_id: string
          total_amount: number
          total_weight: number
        }
        Insert: {
          created_at?: string
          deposit_date?: string
          id?: string
          recorded_by?: string | null
          resident_id: string
          total_amount?: number
          total_weight?: number
        }
        Update: {
          created_at?: string
          deposit_date?: string
          id?: string
          recorded_by?: string | null
          resident_id?: string
          total_amount?: number
          total_weight?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waste_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          unit?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          processed_at: string | null
          processed_by: string | null
          resident_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          resident_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          resident_id?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      monthly_leaderboard: {
        Args: { limit_n?: number }
        Returns: {
          full_name: string
          resident_id: string
          total_amount: number
          total_weight: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "tim" | "warga"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "tim", "warga"],
    },
  },
} as const
