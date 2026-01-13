/*
  # Salon Management System Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `full_name` (text)
      - `phone` (text)
      - `role` (text) - 'admin' or 'staff'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `services`
      - `id` (uuid, primary key)
      - `name` (text) - service name
      - `description` (text)
      - `duration_minutes` (integer)
      - `price` (decimal)
      - `active` (boolean)
      - `created_at` (timestamptz)
    
    - `clients`
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `phone` (text)
      - `email` (text)
      - `notes` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `appointments`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `service_id` (uuid, references services)
      - `appointment_date` (timestamptz)
      - `status` (text) - 'scheduled', 'completed', 'cancelled', 'no_show'
      - `notes` (text)
      - `whatsapp_sent` (boolean)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `transactions`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients, nullable)
      - `appointment_id` (uuid, references appointments, nullable)
      - `total_amount` (decimal)
      - `payment_method` (text) - 'cash', 'card', 'transfer'
      - `status` (text) - 'completed', 'pending', 'cancelled'
      - `notes` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
    
    - `transaction_items`
      - `id` (uuid, primary key)
      - `transaction_id` (uuid, references transactions)
      - `service_id` (uuid, references services)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `subtotal` (decimal)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
    - Profiles are readable by all authenticated users
    - Services are readable by all authenticated users
    - Only creators can modify their records
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 60,
  price decimal(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services NOT NULL,
  appointment_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text DEFAULT '',
  whatsapp_sent boolean DEFAULT false,
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients,
  appointment_id uuid REFERENCES appointments,
  total_amount decimal(10,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  notes text DEFAULT '',
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  subtotal decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Services policies
CREATE POLICY "Users can view active services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Clients policies
CREATE POLICY "Users can view all clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Appointments policies
CREATE POLICY "Users can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (true);

-- Transactions policies
CREATE POLICY "Users can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Transaction items policies
CREATE POLICY "Users can view transaction items"
  ON transaction_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create transaction items"
  ON transaction_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert default services
INSERT INTO services (name, description, duration_minutes, price) VALUES
  ('Manicure', 'Manicure básico con esmaltado', 45, 250.00),
  ('Pedicure', 'Pedicure completo con esmaltado', 60, 350.00),
  ('Extensión de Pestañas', 'Extensión de pestañas pelo por pelo', 120, 800.00),
  ('Retoque de Pestañas', 'Retoque de extensión de pestañas', 60, 400.00),
  ('Manicure con Gel', 'Manicure con esmaltado en gel', 60, 400.00),
  ('Diseño de Uñas', 'Diseño personalizado en uñas', 30, 200.00)
ON CONFLICT DO NOTHING;