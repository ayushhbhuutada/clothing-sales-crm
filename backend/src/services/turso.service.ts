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

    // Ensure all tables exist on Turso Cloud
    await client.batch([
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
        created_at TEXT NOT NULL
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
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        visit_date TEXT NOT NULL,
        visit_type TEXT NOT NULL DEFAULT 'walk_in',
        handled_by_staff_id TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS column_mapping_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        software_type TEXT NOT NULL,
        mapping_json TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        total_rows INTEGER NOT NULL,
        rows_added INTEGER NOT NULL,
        rows_duplicate INTEGER NOT NULL,
        rows_needs_review INTEGER NOT NULL,
        uploaded_by_staff_id TEXT,
        uploaded_by_name TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS import_review_queue (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        raw_row_data TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        suggested_phone TEXT,
        linked_customer_id TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        invoice_number TEXT NOT NULL,
        purchase_date TEXT NOT NULL,
        item_name TEXT NOT NULL,
        category TEXT,
        size TEXT,
        color TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        price REAL NOT NULL,
        discount REAL NOT NULL DEFAULT 0,
        final_amount REAL NOT NULL,
        branch_id TEXT,
        sold_by_staff_id TEXT,
        sold_by_staff_name TEXT,
        import_batch_id TEXT,
        row_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS preferences (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        created_by_staff_id TEXT,
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_spend REAL DEFAULT 0,
        customer_tags TEXT DEFAULT '[]',
        assigned_to_staff_id TEXT NOT NULL,
        assigned_to_name TEXT NOT NULL,
        assigned_by_staff_id TEXT,
        assigned_by_name TEXT,
        branch_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        walk_in_intent TEXT,
        notes TEXT,
        close_outcome TEXT,
        linked_invoice_number TEXT,
        sale_amount REAL,
        outcome_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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
    ], 'write');

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
    console.error('Failed to replicate write to Turso Cloud:', err);
  });
}

export function asyncReplicateBatchToTurso(queries: { sql: string; params: any[] }[]): void {
  const client = getTursoClient();
  if (!client) return;

  const stmts = queries.map(q => ({ sql: q.sql, args: q.params }));
  client.batch(stmts, 'write').catch(err => {
    console.error('Failed to replicate batch to Turso Cloud:', err);
  });
}
