/*
  # Create Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text) - Título de la notificación
      - `message` (text) - Mensaje descriptivo
      - `type` (text) - Tipo: appointment, transaction, system
      - `module` (text) - Módulo al que redirige: appointments, clients, cashier, services
      - `reference_id` (uuid) - ID del registro relacionado
      - `read` (boolean) - Si fue leída o no
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on notifications table
    - Users can only read their own notifications
    - Users can update their own notifications (mark as read)
    - System can insert notifications for any user

  3. Functions
    - Function to create appointment reminder notifications
    - Trigger to create notification when appointment is created
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('appointment', 'transaction', 'system', 'reminder')),
  module text NOT NULL CHECK (module IN ('appointments', 'clients', 'cashier', 'services', 'dashboard')),
  reference_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Function to create notification for all users or specific user
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_module text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, module, reference_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_module, p_reference_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create appointment notification for all staff
CREATE OR REPLACE FUNCTION notify_new_appointment()
RETURNS TRIGGER AS $$
DECLARE
  staff_user RECORD;
  client_name text;
  service_name text;
  appointment_time text;
BEGIN
  -- Get client name
  SELECT full_name INTO client_name FROM clients WHERE id = NEW.client_id;
  
  -- Get service name
  SELECT name INTO service_name FROM services WHERE id = NEW.service_id;
  
  -- Format appointment time
  appointment_time := to_char(NEW.appointment_date, 'DD/MM/YYYY HH24:MI');
  
  -- Create notification for all users
  FOR staff_user IN SELECT id FROM auth.users LOOP
    PERFORM create_notification(
      staff_user.id,
      'Nueva cita agendada',
      client_name || ' - ' || service_name || ' el ' || appointment_time,
      'appointment',
      'appointments',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new appointments
DROP TRIGGER IF EXISTS trigger_notify_new_appointment ON appointments;
CREATE TRIGGER trigger_notify_new_appointment
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_appointment();

-- Function to create reminder notifications for upcoming appointments (within 1 hour)
CREATE OR REPLACE FUNCTION create_appointment_reminders()
RETURNS void AS $$
DECLARE
  upcoming_appointment RECORD;
  client_name text;
  service_name text;
  staff_user RECORD;
BEGIN
  -- Find appointments in the next hour that haven't been reminded
  FOR upcoming_appointment IN 
    SELECT a.* 
    FROM appointments a
    WHERE a.status = 'scheduled'
      AND a.appointment_date BETWEEN now() AND now() + interval '1 hour'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.reference_id = a.id 
          AND n.type = 'reminder'
          AND n.created_at > now() - interval '2 hours'
      )
  LOOP
    -- Get client and service names
    SELECT full_name INTO client_name FROM clients WHERE id = upcoming_appointment.client_id;
    SELECT name INTO service_name FROM services WHERE id = upcoming_appointment.service_id;
    
    -- Create reminder for all users
    FOR staff_user IN SELECT id FROM auth.users LOOP
      PERFORM create_notification(
        staff_user.id,
        'Recordatorio de cita',
        client_name || ' tiene cita de ' || service_name || ' en menos de 1 hora',
        'reminder',
        'appointments',
        upcoming_appointment.id
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
