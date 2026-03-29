// Setup tables via Supabase Management API (SQL endpoint)
// Set these environment variables before running:
//   SUPABASE_URL=https://your-project.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
  process.exit(1);
}

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    // Try the SQL via the query endpoint
    throw new Error(`SQL failed: ${res.status} ${text}`);
  }
  return await res.json();
}

async function runSQLDirect(sql) {
  // Use the Supabase SQL endpoint
  const res = await fetch(`${SUPABASE_URL}/pg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return res;
}

async function setup() {
  const sql = `
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

    -- RLS
    ALTER TABLE inv_clients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE inv_products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE inv_invoices ENABLE ROW LEVEL SECURITY;
    ALTER TABLE inv_invoice_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE inv_settings ENABLE ROW LEVEL SECURITY;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_inv_clients_user ON inv_clients(user_id);
    CREATE INDEX IF NOT EXISTS idx_inv_products_user ON inv_products(user_id);
    CREATE INDEX IF NOT EXISTS idx_inv_invoices_user ON inv_invoices(user_id);
    CREATE INDEX IF NOT EXISTS idx_inv_invoices_status ON inv_invoices(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_inv_invoices_date ON inv_invoices(user_id, issue_date);
    CREATE INDEX IF NOT EXISTS idx_inv_invoice_items_invoice ON inv_invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_inv_settings_user ON inv_settings(user_id);
  `;

  // Try via the Supabase query endpoint used by the dashboard
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  console.log('Connection test:', res.status);

  // Use the createClient approach to run raw SQL
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Run SQL statements one by one via rpc
  // First, let's check if we can use the SQL function
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

  for (const stmt of statements) {
    console.log('Running:', stmt.substring(0, 60) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql_string: stmt });
    if (error) {
      console.log('RPC not available, will use REST approach. Error:', error.message);
      break;
    }
  }

  console.log('Done - please run the SQL manually in the Supabase Dashboard SQL Editor if RPC failed.');
  console.log('\nSQL to run:\n');
  console.log(sql);
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
