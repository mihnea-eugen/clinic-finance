-- =============================================
-- CLINIC FINANCE APP - SUPABASE SCHEMA
-- Project: mfhuomzltxvktjkmrucn
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CLINICS (colaboratori: Pogany etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  payment_terms TEXT DEFAULT 'monthly', -- 'monthly', 'per_procedure', 'weekly'
  rate_type TEXT DEFAULT 'percentage',  -- 'percentage', 'fixed_per_procedure', 'fixed_monthly'
  rate_value DECIMAL(8,2),              -- e.g., 40 (= 40%) sau 5000 (RON fix)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DOCUMENTS (fisiere incarcate)
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,              -- calea in Supabase Storage
  file_name TEXT NOT NULL,
  file_type TEXT,                       -- MIME type
  file_size INTEGER,                    -- bytes
  doc_type TEXT NOT NULL,               -- 'extras_bancar', 'factura_emisa', 'factura_primita', 'bon', 'fisa_clinica', 'programator', 'balanta', 'bilant', 'alt'
  doc_date DATE,                        -- data documentului (extrasa sau setata manual)
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  processed BOOLEAN DEFAULT FALSE,
  extracted_data JSONB,                 -- raw output AI
  extraction_error TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRANSACTIONS (incasari si plati)
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,        -- mereu pozitiv
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')),
  category TEXT,                        -- 'procedura', 'chirie', 'salarii', 'consumabile', 'clinica', 'taxe', 'marketing', 'alt'
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  reference TEXT,                       -- nr. tranzactie banca
  confirmed BOOLEAN DEFAULT FALSE,      -- confirmata manual de user
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DAILY REPORTS (copie programator zilnica)
-- =============================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  total_cash DECIMAL(12,2) DEFAULT 0,
  total_card DECIMAL(12,2) DEFAULT 0,
  total_transfer DECIMAL(12,2) DEFAULT 0,
  total_income DECIMAL(12,2) GENERATED ALWAYS AS (total_cash + total_card + total_transfer) STORED,
  procedures_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- =============================================
-- CLINIC BILLS (fise clinici - cat datoram)
-- =============================================
CREATE TABLE IF NOT EXISTS clinic_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  period_start DATE,
  period_end DATE,
  amount_owed DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_remaining DECIMAL(12,2) GENERATED ALWAYS AS (amount_owed - amount_paid) STORED,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'disputed')),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVOICES (facturi emise si primite)
-- =============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('issued', 'received')), -- emisa / primita
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  counterpart_name TEXT,               -- client sau furnizor
  counterpart_cui TEXT,
  subtotal DECIMAL(12,2),
  tax_rate DECIMAL(5,2) DEFAULT 19,    -- TVA %
  tax_amount DECIMAL(12,2),
  total_amount DECIMAL(12,2),
  currency TEXT DEFAULT 'RON',
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'cancelled', 'overdue')),
  amount_paid DECIMAL(12,2) DEFAULT 0,
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES pentru performanta
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_payment ON transactions(user_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_bills_status ON clinic_bills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_clinic_bills_clinic ON clinic_bills(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(user_id, invoice_type);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(user_id, doc_type);

-- =============================================
-- VIEWS utile
-- =============================================

-- Cash flow zilnic (ultimele 90 zile)
CREATE OR REPLACE VIEW v_daily_cashflow AS
SELECT
  user_id,
  date,
  SUM(CASE WHEN type = 'income' AND payment_method = 'cash' THEN amount ELSE 0 END) AS income_cash,
  SUM(CASE WHEN type = 'income' AND payment_method = 'card' THEN amount ELSE 0 END) AS income_card,
  SUM(CASE WHEN type = 'income' AND payment_method = 'transfer' THEN amount ELSE 0 END) AS income_transfer,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS net
FROM transactions
GROUP BY user_id, date
ORDER BY date DESC;

-- P&L lunar
CREATE OR REPLACE VIEW v_monthly_pl AS
SELECT
  user_id,
  DATE_TRUNC('month', date) AS month,
  TO_CHAR(DATE_TRUNC('month', date), 'Mon YYYY') AS month_label,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) AS profit,
  COUNT(CASE WHEN type = 'income' THEN 1 END) AS income_count,
  COUNT(CASE WHEN type = 'expense' THEN 1 END) AS expense_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', date)
ORDER BY month DESC;

-- Datorii clinici (total outstanding)
CREATE OR REPLACE VIEW v_clinic_debts AS
SELECT
  cb.user_id,
  c.id AS clinic_id,
  c.name AS clinic_name,
  COUNT(cb.id) AS bill_count,
  SUM(cb.amount_owed) AS total_owed,
  SUM(cb.amount_paid) AS total_paid,
  SUM(cb.amount_remaining) AS total_remaining,
  COUNT(CASE WHEN cb.status = 'pending' THEN 1 END) AS pending_bills,
  MAX(cb.due_date) AS next_due_date
FROM clinic_bills cb
JOIN clinics c ON c.id = cb.clinic_id
WHERE cb.status != 'paid'
GROUP BY cb.user_id, c.id, c.name;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Politici: userul vede doar datele lui
CREATE POLICY "clinics_own" ON clinics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "documents_own" ON documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "transactions_own" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "daily_reports_own" ON daily_reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "clinic_bills_own" ON clinic_bills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "invoices_own" ON invoices FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- STORAGE BUCKET (ruleaza separat in dashboard)
-- =============================================
-- In Supabase Dashboard → Storage → New Bucket:
-- Name: "finance-docs"
-- Public: NO (private)
-- File size limit: 50MB
-- Allowed MIME types: image/*, application/pdf

-- Sau prin SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'finance-docs',
  'finance-docs',
  false,
  52428800,  -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "storage_own_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'finance-docs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_own_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'finance-docs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_own_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'finance-docs' AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================
-- DATE DEMO (optional - sterge dupa test)
-- =============================================
-- Clinica Pogany e deja adaugata manual prin UI
