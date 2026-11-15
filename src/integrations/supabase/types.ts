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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      artist_chat_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "artist_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_conversations: {
        Row: {
          artist_id: string
          artist_name: string
          artist_owner_id: string
          created_at: string
          id: string
          patron_id: string
        }
        Insert: {
          artist_id: string
          artist_name: string
          artist_owner_id: string
          created_at?: string
          id?: string
          patron_id: string
        }
        Update: {
          artist_id?: string
          artist_name?: string
          artist_owner_id?: string
          created_at?: string
          id?: string
          patron_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_conversations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_favorites: {
        Row: {
          artist_id: string
          created_at: string
          list: string
          owner_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          list?: string
          owner_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          list?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_favorites_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artist_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_location_preferences: {
        Row: {
          city: string
          owner_id: string
          pricing: Json
          state: string
          updated_at: string
        }
        Insert: {
          city?: string
          owner_id: string
          pricing?: Json
          state?: string
          updated_at?: string
        }
        Update: {
          city?: string
          owner_id?: string
          pricing?: Json
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      artist_meetings: {
        Row: {
          conversation_id: string
          created_at: string
          duration_minutes: number
          event_at: string
          id: string
          join_url: string | null
          recording_consent: boolean
          recording_url: string | null
          requested_by: string
          status: string
          timezone: string
          zoom_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          duration_minutes?: number
          event_at: string
          id?: string
          join_url?: string | null
          recording_consent?: boolean
          recording_url?: string | null
          requested_by: string
          status?: string
          timezone?: string
          zoom_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          duration_minutes?: number
          event_at?: string
          id?: string
          join_url?: string | null
          recording_consent?: boolean
          recording_url?: string | null
          requested_by?: string
          status?: string
          timezone?: string
          zoom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_meetings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "artist_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_notifications: {
        Row: {
          body: string
          booking_id: string | null
          created_at: string
          id: string
          kind: string
          owner_id: string
          read: boolean
          title: string
        }
        Insert: {
          body?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          owner_id: string
          read?: boolean
          title: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          read?: boolean
          title?: string
        }
        Relationships: []
      }
      artist_payout_accounts: {
        Row: {
          account_last4: string
          account_number: string
          bank_name: string
          holder_name: string
          ifsc: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          account_last4: string
          account_number: string
          bank_name?: string
          holder_name: string
          ifsc: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          account_last4?: string
          account_number?: string
          bank_name?: string
          holder_name?: string
          ifsc?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      artist_profiles: {
        Row: {
          art_photo_path: string
          availability: Json
          base_city: string
          bio: string
          city_rates: Json
          created_at: string
          current_city: string
          current_state: string
          discipline: string
          face_video_path: string
          id: string
          instagram: string
          legal_name: string
          owner_id: string
          photo_path: string
          preferred_cities: string[]
          preferred_states: string[]
          pricing_unit: string
          primary_reel: number
          rate_inr: number
          reels: Json
          reject_count: number
          stage_name: string
          state_name: string
          status: string
          stay_charge_inr: number
          subcategory: string
          travel_charge_inr: number
          travel_setting: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          art_photo_path?: string
          availability?: Json
          base_city?: string
          bio?: string
          city_rates?: Json
          created_at?: string
          current_city?: string
          current_state?: string
          discipline?: string
          face_video_path?: string
          id?: string
          instagram?: string
          legal_name?: string
          owner_id: string
          photo_path?: string
          preferred_cities?: string[]
          preferred_states?: string[]
          pricing_unit?: string
          primary_reel?: number
          rate_inr?: number
          reels?: Json
          reject_count?: number
          stage_name?: string
          state_name?: string
          status?: string
          stay_charge_inr?: number
          subcategory?: string
          travel_charge_inr?: number
          travel_setting?: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          art_photo_path?: string
          availability?: Json
          base_city?: string
          bio?: string
          city_rates?: Json
          created_at?: string
          current_city?: string
          current_state?: string
          discipline?: string
          face_video_path?: string
          id?: string
          instagram?: string
          legal_name?: string
          owner_id?: string
          photo_path?: string
          preferred_cities?: string[]
          preferred_states?: string[]
          pricing_unit?: string
          primary_reel?: number
          rate_inr?: number
          reels?: Json
          reject_count?: number
          stage_name?: string
          state_name?: string
          status?: string
          stay_charge_inr?: number
          subcategory?: string
          travel_charge_inr?: number
          travel_setting?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      artist_reviews: {
        Row: {
          artist_owner_id: string
          body: string
          booking_id: string
          created_at: string
          id: string
          patron_id: string
          rating: number
        }
        Insert: {
          artist_owner_id: string
          body?: string
          booking_id: string
          created_at?: string
          id?: string
          patron_id: string
          rating: number
        }
        Update: {
          artist_owner_id?: string
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          patron_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "artist_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_codes: {
        Row: {
          arrival_attempts: number
          arrival_code: string
          arrival_used: boolean
          booking_id: string
          closing_attempts: number
          closing_code: string
          closing_used: boolean
          expires_at: string
        }
        Insert: {
          arrival_attempts?: number
          arrival_code: string
          arrival_used?: boolean
          booking_id: string
          closing_attempts?: number
          closing_code: string
          closing_used?: boolean
          expires_at: string
        }
        Update: {
          arrival_attempts?: number
          arrival_code?: string
          arrival_used?: boolean
          booking_id?: string
          closing_attempts?: number
          closing_code?: string
          closing_used?: boolean
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_codes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          acceptance_video_path: string
          address: string
          amount_inr: number
          artist_fee_inr: number | null
          artist_name: string
          artist_net_inr: number | null
          artist_owner_id: string | null
          artist_ref: string
          created_at: string
          event_at: string | null
          event_date: string
          guests: string
          id: string
          invitation_reminded_at: string | null
          invitation_sent_at: string | null
          note: string
          patron_id: string
          payment_id: string | null
          payment_order_id: string | null
          payout_status: string
          performance_subtotal_inr: number | null
          quantity: number
          refund_status: string
          slot: string
          status: string
          venue_video_path: string
          workflow_stage: string
        }
        Insert: {
          acceptance_video_path?: string
          address?: string
          amount_inr?: number
          artist_fee_inr?: number | null
          artist_name: string
          artist_net_inr?: number | null
          artist_owner_id?: string | null
          artist_ref: string
          created_at?: string
          event_at?: string | null
          event_date?: string
          guests?: string
          id?: string
          invitation_reminded_at?: string | null
          invitation_sent_at?: string | null
          note?: string
          patron_id: string
          payment_id?: string | null
          payment_order_id?: string | null
          payout_status?: string
          performance_subtotal_inr?: number | null
          quantity?: number
          refund_status?: string
          slot?: string
          status?: string
          venue_video_path?: string
          workflow_stage?: string
        }
        Update: {
          acceptance_video_path?: string
          address?: string
          amount_inr?: number
          artist_fee_inr?: number | null
          artist_name?: string
          artist_net_inr?: number | null
          artist_owner_id?: string | null
          artist_ref?: string
          created_at?: string
          event_at?: string | null
          event_date?: string
          guests?: string
          id?: string
          invitation_reminded_at?: string | null
          invitation_sent_at?: string | null
          note?: string
          patron_id?: string
          payment_id?: string | null
          payment_order_id?: string | null
          payout_status?: string
          performance_subtotal_inr?: number | null
          quantity?: number
          refund_status?: string
          slot?: string
          status?: string
          venue_video_path?: string
          workflow_stage?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string
          created_at: string
          full_name: string
          id: string
          industry: string
          patron_type: string
          phone: string
          reason: string
          updated_at: string
        }
        Insert: {
          city?: string
          created_at?: string
          full_name?: string
          id: string
          industry?: string
          patron_type?: string
          phone?: string
          reason?: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          industry?: string
          patron_type?: string
          phone?: string
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          message: Json
          sdk_id: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: Json
          sdk_id: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: Json
          sdk_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          category: string
          created_at: string
          id: string
          owner_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          owner_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          owner_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_entries: {
        Row: {
          amount_inr: number
          booking_id: string
          created_at: string
          id: string
          kind: string
          owner_id: string
          release_after: string
          status: string
        }
        Insert: {
          amount_inr: number
          booking_id: string
          created_at?: string
          id?: string
          kind: string
          owner_id: string
          release_after: string
          status?: string
        }
        Update: {
          amount_inr?: number
          booking_id?: string
          created_at?: string
          id?: string
          kind?: string
          owner_id?: string
          release_after?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      kalzo_admin_cancel_review: {
        Args: { p_booking: string }
        Returns: undefined
      }
      kalzo_booking_step: {
        Args: {
          p_action: string
          p_booking: string
          p_code?: string
          p_video?: string
        }
        Returns: string
      }
      kalzo_deadline_state: {
        Args: { p_now: string; p_sent_at: string }
        Returns: string
      }
      kalzo_decide_meeting: {
        Args: { p_accept: boolean; p_meeting: string }
        Returns: undefined
      }
      kalzo_enrollment_count: { Args: never; Returns: number }
      kalzo_is_admin: { Args: never; Returns: boolean }
      kalzo_notify: {
        Args: {
          p_body: string
          p_booking: string
          p_kind: string
          p_owner: string
          p_title: string
        }
        Returns: undefined
      }
      kalzo_open_artist_chat: { Args: { p_artist: string }; Returns: string }
      kalzo_patron_codes: { Args: { p_booking: string }; Returns: Json }
      kalzo_process_invitation_deadlines: { Args: never; Returns: number }
      kalzo_public_artists: {
        Args: never
        Returns: {
          availability: Json
          base_city: string
          bio: string
          current_city: string
          discipline: string
          id: string
          instagram: string
          preferred_cities: string[]
          pricing_unit: string
          primary_reel: number
          rate_inr: number
          stage_name: string
          state_name: string
          travel_setting: string
        }[]
      }
      kalzo_request_artist_cancellation: {
        Args: { p_booking: string }
        Returns: string
      }
      kalzo_save_payout: {
        Args: {
          p_bank: string
          p_holder: string
          p_ifsc: string
          p_number: string
        }
        Returns: undefined
      }
      kalzo_update_artist_location: {
        Args: {
          p_city: string
          p_rate: number
          p_state: string
          p_stay_charge: number
          p_travel: string
          p_travel_charge: number
        }
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
    Enums: {},
  },
} as const
