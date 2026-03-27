-- InvoiceForge テーブル作成SQL
-- Supabase Dashboard の SQL Editor で実行してください

-- 取引先マスター
CREATE TABLE IF NOT EXISTS inv_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  memo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 商品・サービスマスター
CREATE TABLE IF NOT EXISTS inv_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  unit_price INTEGER NOT NULL DEFAULT 0,
  tax_rate NUMERIC(4,2) NOT NULL DEFAULT 0.1,
  category TEXT NOT NULL DEFAULT 'service',
  memo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 請求書本体
CREATE TABLE IF NOT EXISTS inv_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_number TEXT NOT NULL DEFAULT '',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  client_id UUID,
  client_name TEXT NOT NULL DEFAULT '',
  client_zip TEXT NOT NULL DEFAULT '',
  client_address TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  clinic_name TEXT NOT NULL DEFAULT '',
  clinic_zip TEXT NOT NULL DEFAULT '',
  clinic_address TEXT NOT NULL DEFAULT '',
  clinic_phone TEXT NOT NULL DEFAULT '',
  clinic_email TEXT NOT NULL DEFAULT '',
  clinic_logo TEXT NOT NULL DEFAULT '',
  clinic_stamp TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 請求書明細行
CREATE TABLE IF NOT EXISTS inv_invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES inv_invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  tax_rate NUMERIC(4,2) NOT NULL DEFAULT 0.1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 設定テーブル
CREATE TABLE IF NOT EXISTS inv_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  clinic_name TEXT NOT NULL DEFAULT '',
  clinic_zip TEXT NOT NULL DEFAULT '',
  clinic_address TEXT NOT NULL DEFAULT '',
  clinic_phone TEXT NOT NULL DEFAULT '',
  clinic_email TEXT NOT NULL DEFAULT '',
  clinic_logo TEXT NOT NULL DEFAULT '',
  clinic_stamp TEXT NOT NULL DEFAULT '',
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
  bank_info TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS有効化
ALTER TABLE inv_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_settings ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: inv_clients
DROP POLICY IF EXISTS "inv_clients_select" ON inv_clients;
DROP POLICY IF EXISTS "inv_clients_insert" ON inv_clients;
DROP POLICY IF EXISTS "inv_clients_update" ON inv_clients;
DROP POLICY IF EXISTS "inv_clients_delete" ON inv_clients;
CREATE POLICY "inv_clients_select" ON inv_clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inv_clients_insert" ON inv_clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inv_clients_update" ON inv_clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "inv_clients_delete" ON inv_clients FOR DELETE USING (auth.uid() = user_id);

-- RLSポリシー: inv_products
DROP POLICY IF EXISTS "inv_products_select" ON inv_products;
DROP POLICY IF EXISTS "inv_products_insert" ON inv_products;
DROP POLICY IF EXISTS "inv_products_update" ON inv_products;
DROP POLICY IF EXISTS "inv_products_delete" ON inv_products;
CREATE POLICY "inv_products_select" ON inv_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inv_products_insert" ON inv_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inv_products_update" ON inv_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "inv_products_delete" ON inv_products FOR DELETE USING (auth.uid() = user_id);

-- RLSポリシー: inv_invoices
DROP POLICY IF EXISTS "inv_invoices_select" ON inv_invoices;
DROP POLICY IF EXISTS "inv_invoices_insert" ON inv_invoices;
DROP POLICY IF EXISTS "inv_invoices_update" ON inv_invoices;
DROP POLICY IF EXISTS "inv_invoices_delete" ON inv_invoices;
CREATE POLICY "inv_invoices_select" ON inv_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inv_invoices_insert" ON inv_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inv_invoices_update" ON inv_invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "inv_invoices_delete" ON inv_invoices FOR DELETE USING (auth.uid() = user_id);

-- RLSポリシー: inv_invoice_items
DROP POLICY IF EXISTS "inv_invoice_items_select" ON inv_invoice_items;
DROP POLICY IF EXISTS "inv_invoice_items_insert" ON inv_invoice_items;
DROP POLICY IF EXISTS "inv_invoice_items_update" ON inv_invoice_items;
DROP POLICY IF EXISTS "inv_invoice_items_delete" ON inv_invoice_items;
CREATE POLICY "inv_invoice_items_select" ON inv_invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM inv_invoices WHERE inv_invoices.id = inv_invoice_items.invoice_id AND inv_invoices.user_id = auth.uid()));
CREATE POLICY "inv_invoice_items_insert" ON inv_invoice_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM inv_invoices WHERE inv_invoices.id = inv_invoice_items.invoice_id AND inv_invoices.user_id = auth.uid()));
CREATE POLICY "inv_invoice_items_update" ON inv_invoice_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM inv_invoices WHERE inv_invoices.id = inv_invoice_items.invoice_id AND inv_invoices.user_id = auth.uid()));
CREATE POLICY "inv_invoice_items_delete" ON inv_invoice_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM inv_invoices WHERE inv_invoices.id = inv_invoice_items.invoice_id AND inv_invoices.user_id = auth.uid()));

-- RLSポリシー: inv_settings
DROP POLICY IF EXISTS "inv_settings_select" ON inv_settings;
DROP POLICY IF EXISTS "inv_settings_insert" ON inv_settings;
DROP POLICY IF EXISTS "inv_settings_update" ON inv_settings;
DROP POLICY IF EXISTS "inv_settings_delete" ON inv_settings;
CREATE POLICY "inv_settings_select" ON inv_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "inv_settings_insert" ON inv_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inv_settings_update" ON inv_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "inv_settings_delete" ON inv_settings FOR DELETE USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_inv_clients_user ON inv_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_products_user ON inv_products(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_invoices_user ON inv_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_invoices_status ON inv_invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_inv_invoices_date ON inv_invoices(user_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_inv_invoice_items_invoice ON inv_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inv_settings_user ON inv_settings(user_id);
