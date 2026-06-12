export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      item_images: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };
      item_likes: {
        Row: {
          created_at: string;
          from_item_id: string;
          id: string;
          liker_id: string;
          to_item_id: string;
        };
        Insert: {
          created_at?: string;
          from_item_id: string;
          id?: string;
          liker_id: string;
          to_item_id: string;
        };
        Update: {
          created_at?: string;
          from_item_id?: string;
          id?: string;
          liker_id?: string;
          to_item_id?: string;
        };
        Relationships: [];
      };
      item_skips: {
        Row: {
          created_at: string;
          from_item_id: string;
          id: string;
          skipper_id: string;
          to_item_id: string;
        };
        Insert: {
          created_at?: string;
          from_item_id: string;
          id?: string;
          skipper_id: string;
          to_item_id: string;
        };
        Update: {
          created_at?: string;
          from_item_id?: string;
          id?: string;
          skipper_id?: string;
          to_item_id?: string;
        };
        Relationships: [];
      };
      items: {
        Row: {
          category: Database["public"]["Enums"]["item_category"];
          city: string;
          created_at: string;
          description: string;
          estimated_worth_cents: number;
          id: string;
          owner_id: string;
          status: Database["public"]["Enums"]["item_status"];
          swap_type: Database["public"]["Enums"]["swap_type"];
          title: string;
          wanted_categories: Database["public"]["Enums"]["item_category"][];
        };
        Insert: {
          category: Database["public"]["Enums"]["item_category"];
          city?: string;
          created_at?: string;
          description?: string;
          estimated_worth_cents?: number;
          id?: string;
          owner_id: string;
          status?: Database["public"]["Enums"]["item_status"];
          swap_type?: Database["public"]["Enums"]["swap_type"];
          title: string;
          wanted_categories?: Database["public"]["Enums"]["item_category"][];
        };
        Update: {
          category?: Database["public"]["Enums"]["item_category"];
          city?: string;
          created_at?: string;
          description?: string;
          estimated_worth_cents?: number;
          id?: string;
          owner_id?: string;
          status?: Database["public"]["Enums"]["item_status"];
          swap_type?: Database["public"]["Enums"]["swap_type"];
          title?: string;
          wanted_categories?: Database["public"]["Enums"]["item_category"][];
        };
        Relationships: [
          {
            foreignKeyName: "items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          offer_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          offer_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          offer_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          created_at: string;
          from_user_id: string;
          id: string;
          message: string;
          offered_item_id: string;
          requested_item_id: string;
          return_by: string | null;
          status: Database["public"]["Enums"]["offer_status"];
          swap_type: Database["public"]["Enums"]["swap_type"];
          to_user_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          from_user_id: string;
          id?: string;
          message?: string;
          offered_item_id: string;
          requested_item_id: string;
          return_by?: string | null;
          status?: Database["public"]["Enums"]["offer_status"];
          swap_type?: Database["public"]["Enums"]["swap_type"];
          to_user_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          from_user_id?: string;
          id?: string;
          message?: string;
          offered_item_id?: string;
          requested_item_id?: string;
          return_by?: string | null;
          status?: Database["public"]["Enums"]["offer_status"];
          swap_type?: Database["public"]["Enums"]["swap_type"];
          to_user_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_from_user_id_fkey";
            columns: ["from_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_offered_item_id_fkey";
            columns: ["offered_item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_requested_item_id_fkey";
            columns: ["requested_item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offers_to_user_id_fkey";
            columns: ["to_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string;
          city: string;
          country: string;
          created_at: string;
          display_name: string;
          id: string;
          lat: number | null;
          lng: number | null;
          postcode: string;
          verified: boolean;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string;
          city?: string;
          country?: string;
          created_at?: string;
          display_name?: string;
          id: string;
          lat?: number | null;
          lng?: number | null;
          postcode?: string;
          verified?: boolean;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string;
          city?: string;
          country?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          postcode?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          comment: string;
          created_at: string;
          grade: number;
          id: string;
          offer_id: string;
          reviewee_id: string;
          reviewer_id: string;
        };
        Insert: {
          comment?: string;
          created_at?: string;
          grade: number;
          id?: string;
          offer_id: string;
          reviewee_id: string;
          reviewer_id: string;
        };
        Update: {
          comment?: string;
          created_at?: string;
          grade?: number;
          id?: string;
          offer_id?: string;
          reviewee_id?: string;
          reviewer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey";
            columns: ["reviewee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_my_profile: {
        Args: never;
        Returns: {
          avatar_url: string | null;
          bio: string;
          city: string;
          country: string;
          created_at: string;
          display_name: string;
          id: string;
          lat: number | null;
          lng: number | null;
          postcode: string;
          verified: boolean;
        }[];
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      get_nearby_profiles: {
        Args: { p_deg_pad?: number; p_lat: number; p_lng: number };
        Returns: {
          avatar_url: string;
          city: string;
          country: string;
          display_name: string;
          id: string;
          lat: number;
          lng: number;
          verified: boolean;
        }[];
      };
      record_game_like: {
        Args: { p_from_item_id: string; p_to_item_id: string };
        Returns: {
          matched: boolean;
          offer_id: string;
        }[];
      };
      request_verification: { Args: never; Returns: undefined };
    };
    Enums: {
      item_category:
        | "house_garden"
        | "clothing"
        | "beauty"
        | "electronics"
        | "animals"
        | "children"
        | "activities"
        | "art_design"
        | "music_movies"
        | "books";
      item_status: "available" | "reserved" | "swapped";
      offer_status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
      swap_type: "temporary" | "definitive";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      item_category: [
        "house_garden",
        "clothing",
        "beauty",
        "electronics",
        "animals",
        "children",
        "activities",
        "art_design",
        "music_movies",
        "books",
      ],
      item_status: ["available", "reserved", "swapped"],
      offer_status: ["pending", "accepted", "declined", "completed", "cancelled"],
      swap_type: ["temporary", "definitive"],
    },
  },
} as const;
