import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { initTursoSync, asyncReplicateToTurso, asyncReplicateBatchToTurso } from '../services/turso.service';

let dbInstance: Database | null = null;
const dbDir = path.resolve(__dirname, '../../data');
const dbPath = path.resolve(dbDir, 'retail.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  await initTursoSync(dbInstance);
  persistDb();
  return dbInstance;
}

export function persistDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Error persisting database to disk:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      address TEXT,
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'receptionist', 'sales_rep', 'store_manager', 'admin', 'owner'
      branch_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'free', -- 'free', 'busy', 'with_customer', 'on_break'
      pin_code TEXT NOT NULL,
      avatar_url TEXT,
      specialty_category TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      phone_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT,
      dob TEXT,
      anniversary TEXT,
      gender TEXT, -- 'Female', 'Male', 'Non-Binary', 'Other'
      referred_by TEXT,
      tags TEXT NOT NULL DEFAULT '[]', -- JSON array of tags (e.g. ["VIP", "Wedding Shopper", "Bulk Buyer"])
      total_spend REAL NOT NULL DEFAULT 0,
      visit_count INTEGER NOT NULL DEFAULT 0,
      last_visit_date TEXT,
      is_imported_placeholder INTEGER NOT NULL DEFAULT 0,
      branch_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      visit_type TEXT NOT NULL DEFAULT 'walk_in', -- 'walk_in', 'purchase', 'inquiry', 'appointment'
      handled_by_staff_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (handled_by_staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS column_mapping_templates (
      id TEXT PRIMARY KEY,
      branch_id TEXT,
      name TEXT NOT NULL,
      billing_software_name TEXT NOT NULL, -- 'Tally', 'Marg ERP', 'Vyapar', 'Custom'
      field_mapping TEXT NOT NULL, -- JSON mapping: { "system_field": "source_column_name" }
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id TEXT PRIMARY KEY,
      uploaded_by_staff_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      uploaded_at TEXT NOT NULL,
      mapping_template_id TEXT,
      rows_processed INTEGER NOT NULL DEFAULT 0,
      rows_added INTEGER NOT NULL DEFAULT 0,
      rows_duplicate INTEGER NOT NULL DEFAULT 0,
      rows_needs_review INTEGER NOT NULL DEFAULT 0,
      rows_failed INTEGER NOT NULL DEFAULT 0,
      log_summary TEXT, -- JSON summary array
      FOREIGN KEY (uploaded_by_staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      item_name TEXT NOT NULL,
      sku TEXT,
      category TEXT NOT NULL,
      size TEXT,
      color TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      final_amount REAL NOT NULL,
      purchase_date TEXT NOT NULL,
      branch_id TEXT,
      sold_by_staff_id TEXT,
      source_import_id TEXT,
      row_hash TEXT NOT NULL UNIQUE, -- composite hash (invoice + date + item + amount) for deduplication
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (source_import_id) REFERENCES import_batches(id)
    );

    CREATE TABLE IF NOT EXISTS import_review_queue (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      raw_data TEXT NOT NULL, -- JSON raw row data
      reason TEXT NOT NULL, -- e.g. 'missing_phone_number', 'invalid_date'
      invoice_number TEXT,
      purchase_date TEXT,
      amount REAL,
      item_name TEXT,
      resolved_customer_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'discarded'
      created_at TEXT NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES import_batches(id),
      FOREIGN KEY (resolved_customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS preferences (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'top_size', 'bottom_size', 'footwear_size', 'color', 'category', 'fabric', 'brand', 'budget', 'style_note', 'dislike'
      value TEXT NOT NULL,
      added_by_staff_id TEXT,
      staff_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (added_by_staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      assigned_to_staff_id TEXT NOT NULL,
      assigned_by_staff_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', -- 'new', 'acknowledged', 'in_progress', 'closed_sale', 'closed_no_sale', 'follow_up_needed'
      walk_in_intent TEXT, -- 'Looking for wedding wear', 'Festive collection', 'Office formal', 'Casuals', 'Sale inquiry'
      outcome_notes TEXT,
      no_sale_reason TEXT, -- 'price_high', 'size_unavailable', 'color_out_of_stock', 'just_browsing', 'style_mismatch', 'other'
      linked_invoice_number TEXT,
      sale_amount REAL,
      follow_up_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      acknowledged_at TEXT,
      closed_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (assigned_to_staff_id) REFERENCES staff(id),
      FOREIGN KEY (assigned_by_staff_id) REFERENCES staff(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      staff_id TEXT,
      staff_name TEXT,
      action_type TEXT NOT NULL, -- 'lead_assigned', 'lead_acknowledged', 'lead_closed', 'preference_added', 'visit_logged', 'profile_created', 'data_imported'
      description TEXT NOT NULL,
      metadata TEXT, -- JSON metadata
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Indices for high performance (<50ms lookups)
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_number);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_purchases_cust ON purchases(customer_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_invoice ON purchases(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_purchases_hash ON purchases(row_hash);
    CREATE INDEX IF NOT EXISTS idx_leads_staff_status ON leads(assigned_to_staff_id, status);
    CREATE INDEX IF NOT EXISTS idx_leads_cust ON leads(customer_id);
    CREATE INDEX IF NOT EXISTS idx_preferences_cust ON preferences(customer_id);
    CREATE INDEX IF NOT EXISTS idx_activity_cust ON activity_logs(customer_id);
  `);
}

// Database helper functions
export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): void {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  persistDb();
  asyncReplicateToTurso(sql, params);
}

export function runBatch(queries: { sql: string; params: any[] }[]): void {
  if (!dbInstance) throw new Error('Database not initialized');
  for (const q of queries) {
    dbInstance.run(q.sql, q.params);
  }
  persistDb();
  asyncReplicateBatchToTurso(queries);
}
