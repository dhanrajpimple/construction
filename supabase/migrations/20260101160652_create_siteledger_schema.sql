/*
  # SiteLedger Database Schema

  ## Overview
  Creates the core database structure for the SiteLedger construction expense tracking app.
  
  ## New Tables
  
  ### `projects`
  Stores construction project information
  - `id` (uuid, primary key) - Unique project identifier
  - `user_id` (uuid) - Owner of the project (links to auth.users)
  - `name` (text) - Project name
  - `location` (text) - Project site location
  - `project_type` (text) - Type of construction project
  - `base_contract_amount` (numeric) - Initial contract value
  - `created_at` (timestamptz) - Project creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### `transactions`
  Stores all financial transactions (credits and debits) for projects
  - `id` (uuid, primary key) - Unique transaction identifier
  - `project_id` (uuid, foreign key) - Links to projects table
  - `type` (text) - Transaction type: 'credit' or 'debit'
  - `amount` (numeric) - Transaction amount (always positive)
  - `description` (text) - Transaction description/note
  - `transaction_date` (date) - Date of transaction
  - `category` (text) - Expense category (materials, labor, etc.)
  - `created_at` (timestamptz) - Record creation timestamp
  
  ## Security
  - Enable Row Level Security (RLS) on both tables
  - Users can only access their own projects and related transactions
  - Policies enforce authentication and ownership checks
  
  ## Notes
  1. All monetary amounts use numeric type for precision
  2. Transactions are linked to projects via foreign key with cascade delete
  3. Timestamps use timestamptz for timezone awareness
  4. RLS ensures data isolation between users
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  location text NOT NULL,
  project_type text NOT NULL,
  base_contract_amount numeric(15, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount numeric(15, 2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  category text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for transactions table
CREATE POLICY "Users can view transactions for own projects"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = transactions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions for own projects"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = transactions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transactions for own projects"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = transactions.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = transactions.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transactions for own projects"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = transactions.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for projects updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();