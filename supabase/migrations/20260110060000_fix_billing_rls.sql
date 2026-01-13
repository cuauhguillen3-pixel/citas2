CREATE POLICY "Users can insert own billing history"
  ON billing_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
