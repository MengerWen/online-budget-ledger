export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      finance_postings: {
        Row: { id: string; user_id: string; canonical_id: string; date: string; amount_cents: number; direction: string; target: string; category: string; payload: Json; refund_of: string | null; created_at: string };
        Insert: { user_id: string; canonical_id: string; date: string; amount_cents: number; direction: string; target: string; category: string; payload: Json; refund_of?: string };
        Update: Record<string, never>;
      };
      finance_keys: {
        Row: { user_id: string; identity_key: string; posting_id: string; payload: Json };
        Insert: { user_id: string; identity_key: string; posting_id: string; payload: Json };
        Update: Record<string, never>;
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          monthly_amount: number;
          currency: "CNY";
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          monthly_amount: number;
          currency?: "CNY";
          is_default?: boolean;
        };
        Update: {
          name?: string;
          monthly_amount?: number;
          currency?: "CNY";
          is_default?: boolean;
          updated_at?: string;
        };
      };
      day_records: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          breakfast: number | null;
          lunch: number | null;
          dinner: number | null;
          breakfast_note: string | null;
          lunch_note: string | null;
          dinner_note: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          breakfast?: number | null;
          lunch?: number | null;
          dinner?: number | null;
          breakfast_note?: string | null;
          lunch_note?: string | null;
          dinner_note?: string | null;
          note?: string | null;
        };
        Update: {
          breakfast?: number | null;
          lunch?: number | null;
          dinner?: number | null;
          breakfast_note?: string | null;
          lunch_note?: string | null;
          dinner_note?: string | null;
          note?: string | null;
          updated_at?: string;
        };
      };
      extra_expenses: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          amount: number;
          category: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          amount: number;
          category: string;
          note?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          note?: string | null;
          updated_at?: string;
        };
      };
      app_settings: {
        Row: {
          user_id: string;
          default_budget_id: string | null;
          week_starts_on: 1;
          meal_weights: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          default_budget_id?: string | null;
          week_starts_on?: 1;
          meal_weights?: Json;
        };
        Update: {
          default_budget_id?: string | null;
          week_starts_on?: 1;
          meal_weights?: Json;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: { import_finance_batch: { Args: { p_entries: Json }; Returns: Json } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
