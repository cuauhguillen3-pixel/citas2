/*
  # Add Subscription System

  1. New Columns in `profiles`
    - `subscription_status` (text): 'trial', 'active', 'past_due', 'canceled'
    - `trial_ends_at` (timestamptz): When the trial expires
    - `current_period_end` (timestamptz): When the paid subscription expires
    - `stripe_customer_id` (text): Stripe Customer ID

  2. New Table `billing_history`
    - Records payments made by the user
*/

-- Add subscription fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '7 days');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Create billing_history table
CREATE TABLE IF NOT EXISTS billing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed')),
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own billing history"
  ON billing_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
