import { createClient, Client } from '@libsql/client';
import { Database } from 'sql.js';

let tursoClient: Client | null = null;

export function getTursoClient(): Client | null {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) return null;

  if (!tursoClient) {
    tursoClient = createClient({
      url,
      authToken
    });
  }

  return tursoClient;
}

export async function initTursoSync(db: Database): Promise<boolean> {
  const client = getTursoClient();
  if (!client) {
    console.log('ℹ️ Turso credentials not provided. Running in local SQLite mode.');
    return false;
  }

  try {
    console.log('🌐 Connecting to Turso Cloud SQLite...');

    // Ensure all tables exist on Turso Cloud with EXACT schema matching database.ts
    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        address TEXT,
        phone TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'free',
        pin_code TEXT NOT NULL,
        avatar_url TEXT,
        specialty_category TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id)
      );`,
      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        phone_number TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT,
        dob TEXT,
        anniversary TEXT,
        gender TEXT,
        referred_by TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        total_spend REAL NOT NULL DEFAULT 0,
        visit_count INTEGER NOT NULL DEFAULT 0,
        last_visit_date TEXT,
        is_imported_placeholder INTEGER NOT NULL DEFAULT 0,
        branch_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (branch_id) REFERENCES branches(id)
      );`,
      `CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        visit_type TEXT NOT NULL DEFAULT 'walk_in',
        handled_by_staff_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (handled_by_staff_id) REFERENCES staff(id)
      );`,
      `CREATE TABLE IF NOT EXISTS column_mapping_templates (
        id TEXT PRIMARY KEY,
        branch_id TEXT,
        name TEXT NOT NULL,
        billing_software_name TEXT NOT NULL,
        field_mapping TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS import_batches (
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
        log_summary TEXT,
        FOREIGN KEY (uploaded_by_staff_id) REFERENCES staff(id)
      );`,
      `CREATE TABLE IF NOT EXISTS purchases (
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
        row_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (source_import_id) REFERENCES import_batches(id)
      );`,
      `CREATE TABLE IF NOT EXISTS import_review_queue (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        raw_data TEXT NOT NULL,
        reason TEXT NOT NULL,
        invoice_number TEXT,
        purchase_date TEXT,
        amount REAL,
        item_name TEXT,
        resolved_customer_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (batch_id) REFERENCES import_batches(id),
        FOREIGN KEY (resolved_customer_id) REFERENCES customers(id)
      );`,
      `CREATE TABLE IF NOT EXISTS preferences (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        added_by_staff_id TEXT,
        staff_name TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (added_by_staff_id) REFERENCES staff(id)
      );`,
      `CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        assigned_to_staff_id TEXT NOT NULL,
        assigned_by_staff_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        walk_in_intent TEXT,
        outcome_notes TEXT,
        no_sale_reason TEXT,
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
      );`,
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        staff_id TEXT,
        staff_name TEXT,
        action_type TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL
      );`
    ];

    for (const stmt of schemaStatements) {
      try {
        await client.execute(stmt);
      } catch (e: any) {
        console.warn('Schema init note:', e.message);
      }
    }

    // Check if Turso has existing data to restore
    const custCountRes = await client.execute('SELECT COUNT(*) as cnt FROM customers');
    const cloudCustCount = (custCountRes.rows[0]?.cnt as number) || 0;

    console.log(`☁️ Turso Cloud holds ${cloudCustCount} customers.`);

    if (cloudCustCount > 0) {
      console.log('🔄 Restoring database state from Turso Cloud...');

      const tables = [
        'branches',
        'staff',
        'customers',
        'visits',
        'column_mapping_templates',
        'import_batches',
        'import_review_queue',
        'purchases',
        'preferences',
        'leads',
        'activity_logs'
      ];

      for (const table of tables) {
        try {
          const res = await client.execute(`SELECT * FROM ${table}`);
          if (res.rows.length > 0) {
            db.run(`DELETE FROM ${table}`);
            for (const row of res.rows) {
              const keys = Object.keys(row);
              const placeholders = keys.map(() => '?').join(',');
              const values = Object.values(row).map(v => (typeof v === 'bigint' ? Number(v) : v)) as any[];
              db.run(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values);
            }
          }
        } catch (e: any) {
          console.warn(`Table sync note for ${table}:`, e.message);
        }
      }
      console.log('✅ Successfully synced and restored state from Turso Cloud!');
    }

    return true;
  } catch (err) {
    console.error('⚠️ Turso Cloud sync connection error:', err);
    return false;
  }
}

export function asyncReplicateToTurso(sql: string, params: any[] = []): void {
  const client = getTursoClient();
  if (!client) return;

  client.execute({ sql, args: params }).catch(err => {
    // Only log if not a duplicate row ignore
    if (!err.message?.includes('UNIQUE constraint failed')) {
      console.error('Failed to replicate write to Turso Cloud:', err.message);
    }
  });
}

export function asyncReplicateBatchToTurso(queries: { sql: string; params: any[] }[]): void {
  const client = getTursoClient();
  if (!client) return;

  const stmts = queries.map(q => ({ sql: q.sql, args: q.params }));
  client.batch(stmts, 'write').catch(err => {
    if (!err.message?.includes('UNIQUE constraint failed')) {
      console.error('Failed to replicate batch to Turso Cloud:', err.message);
    }
  });
}

export async function checkTursoHealth(): Promise<{
  connected: boolean;
  configured: boolean;
  cloudCustomers?: number;
  cloudPurchases?: number;
  error?: string;
}> {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    return { configured: false, connected: false };
  }

  const client = getTursoClient();
  if (!client) {
    return { configured: true, connected: false, error: 'Could not initialize Turso client' };
  }

  try {
    const custRes = await client.execute('SELECT COUNT(*) as cnt FROM customers');
    const purchRes = await client.execute('SELECT COUNT(*) as cnt FROM purchases');
    return {
      configured: true,
      connected: true,
      cloudCustomers: (custRes.rows[0]?.cnt as number) || 0,
      cloudPurchases: (purchRes.rows[0]?.cnt as number) || 0
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      error: err.message
    };
  }
}
