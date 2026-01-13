/*
  # Fix Duplicate Open Shifts

  1. Changes
    - Close all open shifts except the most recent one
    - Add unique constraint to prevent multiple open shifts
    - Add function to safely manage shift opening

  2. Security
    - Ensures data integrity for cash register operations
*/

-- Close all open shifts except the most recent one
DO $$
DECLARE
  most_recent_shift_id uuid;
BEGIN
  -- Get the most recent open shift
  SELECT id INTO most_recent_shift_id
  FROM cash_register_shifts
  WHERE status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;
  
  -- Close all other open shifts
  UPDATE cash_register_shifts
  SET 
    status = 'closed',
    closed_at = now(),
    notes = CASE 
      WHEN notes = '' THEN 'Cerrado automáticamente - turno duplicado'
      ELSE notes || ' (Cerrado automáticamente - turno duplicado)'
    END
  WHERE status = 'open' AND id != most_recent_shift_id;
END $$;

-- Create a unique partial index to ensure only one open shift at a time
CREATE UNIQUE INDEX IF NOT EXISTS unique_open_shift 
ON cash_register_shifts (status) 
WHERE status = 'open';

-- Create function to safely open a new shift
CREATE OR REPLACE FUNCTION open_new_shift(
  p_opened_by uuid,
  p_opening_amount decimal
)
RETURNS uuid AS $$
DECLARE
  new_shift_id uuid;
  existing_shift_id uuid;
BEGIN
  -- Check if there's already an open shift
  SELECT id INTO existing_shift_id
  FROM cash_register_shifts
  WHERE status = 'open'
  LIMIT 1;
  
  -- If there's an open shift, close it first
  IF existing_shift_id IS NOT NULL THEN
    UPDATE cash_register_shifts
    SET 
      status = 'closed',
      closed_at = now(),
      closed_by = p_opened_by,
      closing_amount = opening_amount,
      expected_amount = opening_amount,
      difference_amount = 0,
      notes = CASE 
        WHEN notes = '' THEN 'Cerrado automáticamente al abrir nuevo turno'
        ELSE notes || ' (Cerrado automáticamente al abrir nuevo turno)'
      END
    WHERE id = existing_shift_id;
  END IF;
  
  -- Create new shift
  INSERT INTO cash_register_shifts (opened_by, opening_amount, status)
  VALUES (p_opened_by, p_opening_amount, 'open')
  RETURNING id INTO new_shift_id;
  
  RETURN new_shift_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
