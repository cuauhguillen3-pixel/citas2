/*
  # Add Cash Register Shifts System

  1. New Tables
    - `cash_register_shifts`
      - `id` (uuid, primary key)
      - `opened_by` (uuid, references auth.users)
      - `closed_by` (uuid, references auth.users, nullable)
      - `opening_amount` (decimal) - initial cash amount
      - `closing_amount` (decimal, nullable) - final cash amount
      - `status` (text) - 'open' or 'closed'
      - `opened_at` (timestamptz)
      - `closed_at` (timestamptz, nullable)
      - `notes` (text)

  2. Updates
    - Add `cash_register_shift_id` to transactions table
    - Update payment methods to include more options

  3. Security
    - Enable RLS on cash_register_shifts table
    - Add policies for authenticated users
*/

-- Create cash_register_shifts table
CREATE TABLE IF NOT EXISTS cash_register_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by uuid REFERENCES auth.users NOT NULL,
  closed_by uuid REFERENCES auth.users,
  opening_amount decimal(10,2) NOT NULL DEFAULT 0,
  closing_amount decimal(10,2),
  expected_amount decimal(10,2),
  difference_amount decimal(10,2),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Add cash_register_shift_id to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'cash_register_shift_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN cash_register_shift_id uuid REFERENCES cash_register_shifts;
  END IF;
END $$;

-- Update payment method constraint to include more options
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
  CHECK (payment_method IN ('cash', 'card', 'transfer', 'debit', 'credit', 'paypal', 'other'));

-- Enable RLS
ALTER TABLE cash_register_shifts ENABLE ROW LEVEL SECURITY;

-- Cash register shifts policies
CREATE POLICY "Users can view all cash register shifts"
  ON cash_register_shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can open cash register"
  ON cash_register_shifts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "Users can close cash register"
  ON cash_register_shifts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to get current open shift
CREATE OR REPLACE FUNCTION get_current_open_shift()
RETURNS uuid AS $$
DECLARE
  shift_id uuid;
BEGIN
  SELECT id INTO shift_id
  FROM cash_register_shifts
  WHERE status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;
  
  RETURN shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
