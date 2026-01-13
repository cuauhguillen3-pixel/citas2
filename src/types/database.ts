export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: 'admin' | 'staff';
          subscription_status: 'trial' | 'active' | 'past_due' | 'canceled';
          trial_ends_at: string;
          current_period_end: string | null;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          role?: 'admin' | 'staff';
          subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled';
          trial_ends_at?: string;
          current_period_end?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          role?: 'admin' | 'staff';
          subscription_status?: 'trial' | 'active' | 'past_due' | 'canceled';
          trial_ends_at?: string;
          current_period_end?: string | null;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string;
          duration_minutes: number;
          price: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          duration_minutes?: number;
          price: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          duration_minutes?: number;
          price?: number;
          active?: boolean;
          created_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          phone: string;
          email: string | null;
          notes: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone: string;
          email?: string | null;
          notes?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string;
          email?: string | null;
          notes?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      appointments: {
        Row: {
          id: string;
          client_id: string;
          service_id: string;
          appointment_date: string;
          status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          notes: string;
          whatsapp_sent: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          service_id: string;
          appointment_date: string;
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          notes?: string;
          whatsapp_sent?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          service_id?: string;
          appointment_date?: string;
          status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
          notes?: string;
          whatsapp_sent?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          client_id: string | null;
          appointment_id: string | null;
          cash_register_shift_id: string | null;
          total_amount: number;
          payment_method: 'cash' | 'card' | 'transfer' | 'debit' | 'credit' | 'paypal' | 'other';
          status: 'completed' | 'pending' | 'cancelled';
          notes: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          appointment_id?: string | null;
          cash_register_shift_id?: string | null;
          total_amount: number;
          payment_method: 'cash' | 'card' | 'transfer' | 'debit' | 'credit' | 'paypal' | 'other';
          status?: 'completed' | 'pending' | 'cancelled';
          notes?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          appointment_id?: string | null;
          cash_register_shift_id?: string | null;
          total_amount?: number;
          payment_method?: 'cash' | 'card' | 'transfer' | 'debit' | 'credit' | 'paypal' | 'other';
          status?: 'completed' | 'pending' | 'cancelled';
          notes?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      cash_register_shifts: {
        Row: {
          id: string;
          opened_by: string;
          closed_by: string | null;
          opening_amount: number;
          closing_amount: number | null;
          expected_amount: number | null;
          difference_amount: number | null;
          status: 'open' | 'closed';
          opened_at: string;
          closed_at: string | null;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          opened_by: string;
          closed_by?: string | null;
          opening_amount: number;
          closing_amount?: number | null;
          expected_amount?: number | null;
          difference_amount?: number | null;
          status?: 'open' | 'closed';
          opened_at?: string;
          closed_at?: string | null;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          opened_by?: string;
          closed_by?: string | null;
          opening_amount?: number;
          closing_amount?: number | null;
          expected_amount?: number | null;
          difference_amount?: number | null;
          status?: 'open' | 'closed';
          opened_at?: string;
          closed_at?: string | null;
          notes?: string;
          created_at?: string;
        };
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          service_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          service_id: string;
          quantity?: number;
          unit_price: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          service_id?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          created_at?: string;
        };
      };
    };
  };
}
