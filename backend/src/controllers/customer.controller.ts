import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database';
import { cleanPhoneNumber } from '../services/import.service';
import { sseBroadcaster } from '../services/broadcaster';

export const searchCustomers = (req: Request, res: Response): void => {
  try {
    const q = String(req.query.q || '').trim();
    let customers: any[] = [];

    if (!q) {
      // Default: Return top and recently active customers for directory list
      customers = query(`
        SELECT c.*, b.name as branch_name,
          (SELECT COUNT(*) FROM visits v WHERE v.customer_id = c.id) as total_visits,
          (SELECT COUNT(*) FROM purchases p WHERE p.customer_id = c.id) as total_purchases
        FROM customers c
        LEFT JOIN branches b ON c.branch_id = b.id
        ORDER BY c.total_spend DESC, c.updated_at DESC
        LIMIT 100
      `);
    } else {
      const cleanDigits = q.replace(/[^\d]/g, '');

      if (cleanDigits.length >= 2) {
        // Phone number prefix or exact match
        customers = query(`
          SELECT c.*, b.name as branch_name,
            (SELECT COUNT(*) FROM visits v WHERE v.customer_id = c.id) as total_visits,
            (SELECT COUNT(*) FROM purchases p WHERE p.customer_id = c.id) as total_purchases
          FROM customers c
          LEFT JOIN branches b ON c.branch_id = b.id
          WHERE c.phone_number LIKE ? OR c.phone_number LIKE ?
          ORDER BY 
            CASE WHEN c.phone_number = ? THEN 0
                 WHEN c.phone_number LIKE ? THEN 1
                 ELSE 2 END,
            c.total_spend DESC
          LIMIT 25
        `, [`%${cleanDigits}%`, `${cleanDigits}%`, cleanDigits, `${cleanDigits}%`]);
      }

      // Fallback: search by name if less than 10 matches or query has letters
      if (customers.length < 10 && /[a-zA-Z]/.test(q)) {
        const nameMatches = query(`
          SELECT c.*, b.name as branch_name,
            (SELECT COUNT(*) FROM visits v WHERE v.customer_id = c.id) as total_visits,
            (SELECT COUNT(*) FROM purchases p WHERE p.customer_id = c.id) as total_purchases
          FROM customers c
          LEFT JOIN branches b ON c.branch_id = b.id
          WHERE c.name LIKE ? OR c.email LIKE ?
          ORDER BY c.total_spend DESC
          LIMIT 25
        `, [`%${q}%`, `%${q}%`]);

        // Merge results uniquely
        const seen = new Set(customers.map(c => c.id));
        for (const m of nameMatches) {
          if (!seen.has(m.id)) {
            customers.push(m);
            seen.add(m.id);
          }
        }
      }
    }

    // Parse tags JSON
    const enriched = customers.map(c => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(c.tags || '[]');
      } catch {
        tags = [];
      }

      // Quick last purchase snippet
      const lastPurchase = queryOne(`
        SELECT invoice_number, item_name, final_amount, purchase_date, category
        FROM purchases 
        WHERE customer_id = ? 
        ORDER BY purchase_date DESC, created_at DESC LIMIT 1
      `, [c.id]);

      // Quick top preference tags
      const topPrefs = query(`
        SELECT type, value FROM preferences 
        WHERE customer_id = ? 
        ORDER BY created_at DESC LIMIT 4
      `, [c.id]);

      return {
        ...c,
        tags,
        lastPurchase: lastPurchase || null,
        topPreferences: topPrefs
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getCustomerProfile = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const customer = queryOne(`
      SELECT c.*, b.name as branch_name 
      FROM customers c
      LEFT JOIN branches b ON c.branch_id = b.id
      WHERE c.id = ? OR c.phone_number = ?
    `, [id, id]);

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Parse tags
    let tags: string[] = [];
    try {
      tags = JSON.parse(customer.tags || '[]');
    } catch {
      tags = [];
    }

    // Purchases
    const purchases = query(`
      SELECT p.*, s.name as sold_by_staff_name, b.name as branch_name
      FROM purchases p
      LEFT JOIN staff s ON p.sold_by_staff_id = s.id
      LEFT JOIN branches b ON p.branch_id = b.id
      WHERE p.customer_id = ?
      ORDER BY p.purchase_date DESC, p.created_at DESC
    `, [customer.id]);

    // Preferences
    const preferences = query(`
      SELECT * FROM preferences 
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `, [customer.id]);

    // Group preferences
    const prefSummary = {
      top_sizes: preferences.filter(p => p.type === 'top_size').map(p => p.value),
      bottom_sizes: preferences.filter(p => p.type === 'bottom_size').map(p => p.value),
      footwear_sizes: preferences.filter(p => p.type === 'footwear_size').map(p => p.value),
      colors: preferences.filter(p => p.type === 'color').map(p => p.value),
      categories: preferences.filter(p => p.type === 'category').map(p => p.value),
      fabrics: preferences.filter(p => p.type === 'fabric').map(p => p.value),
      brands: preferences.filter(p => p.type === 'brand').map(p => p.value),
      budgets: preferences.filter(p => p.type === 'budget').map(p => p.value),
      style_notes: preferences.filter(p => p.type === 'style_note'),
      dislikes: preferences.filter(p => p.type === 'dislike')
    };

    // Visits
    const visits = query(`
      SELECT v.*, s.name as staff_name, b.name as branch_name
      FROM visits v
      LEFT JOIN staff s ON v.handled_by_staff_id = s.id
      LEFT JOIN branches b ON v.branch_id = b.id
      WHERE v.customer_id = ?
      ORDER BY v.visit_date DESC, v.created_at DESC
    `, [customer.id]);

    // Active or past leads
    const leads = query(`
      SELECT l.*, 
        s1.name as assigned_to_name, s1.avatar_url as assigned_to_avatar,
        s2.name as assigned_by_name
      FROM leads l
      LEFT JOIN staff s1 ON l.assigned_to_staff_id = s1.id
      LEFT JOIN staff s2 ON l.assigned_by_staff_id = s2.id
      WHERE l.customer_id = ?
      ORDER BY l.created_at DESC
    `, [customer.id]);

    // Activity timeline
    const activityLogs = query(`
      SELECT * FROM activity_logs 
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `, [customer.id]);

    // Last purchase itemized
    const lastPurchase = purchases.length > 0 ? purchases[0] : null;

    res.json({
      ...customer,
      tags,
      lastPurchase,
      purchases,
      preferences,
      prefSummary,
      visits,
      leads,
      activityLogs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const createCustomer = (req: Request, res: Response): void => {
  try {
    const {
      phone_number,
      name,
      email,
      dob,
      anniversary,
      gender,
      referred_by,
      tags,
      branch_id,
      walk_in_intent,
      initial_note
    } = req.body;
    const staff_id = req.staff!.id;

    const cleanedPhone = cleanPhoneNumber(phone_number);
    if (!cleanedPhone) {
      res.status(400).json({ error: 'A valid 10-digit phone number is required' });
      return;
    }

    if (!name || String(name).trim().length === 0) {
      res.status(400).json({ error: 'Customer name is required' });
      return;
    }

    // Check existing
    const existing = queryOne('SELECT id FROM customers WHERE phone_number = ?', [cleanedPhone]);
    if (existing) {
      res.status(400).json({ error: 'A customer with this phone number already exists', customerId: existing.id });
      return;
    }

    const customerId = uuidv4();
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const parsedTags = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify(['First Time Shopper']);
    const defaultBranchId = branch_id || 'branch-1';

    run(`
      INSERT INTO customers (id, phone_number, name, email, dob, anniversary, gender, referred_by, tags, total_spend, visit_count, last_visit_date, is_imported_placeholder, branch_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, 0, ?, ?, ?)
    `, [
      customerId,
      cleanedPhone,
      String(name).trim(),
      email ? String(email).trim() : null,
      dob || null,
      anniversary || null,
      gender || 'Female',
      referred_by || 'Walk-in',
      parsedTags,
      today,
      defaultBranchId,
      now,
      now
    ]);

    // Log initial visit
    run(`
      INSERT INTO visits (id, customer_id, branch_id, visit_date, visit_type, handled_by_staff_id, notes, created_at)
      VALUES (?, ?, ?, ?, 'walk_in', ?, ?, ?)
    `, [
      uuidv4(),
      customerId,
      defaultBranchId,
      today,
      staff_id || null,
      walk_in_intent || 'First-time registration at reception desk',
      now
    ]);

    // If initial style note provided
    if (initial_note) {
      const staffObj = staff_id ? queryOne('SELECT name FROM staff WHERE id = ?', [staff_id]) : null;
      run(`
        INSERT INTO preferences (id, customer_id, type, value, added_by_staff_id, staff_name, created_at)
        VALUES (?, ?, 'style_note', ?, ?, ?, ?)
      `, [
        uuidv4(),
        customerId,
        initial_note,
        staff_id || null,
        staffObj?.name || 'Reception Desk',
        now
      ]);
    }

    // Activity log
    const staff = staff_id ? queryOne('SELECT name FROM staff WHERE id = ?', [staff_id]) : null;
    run(`
      INSERT INTO activity_logs (id, customer_id, staff_id, staff_name, action_type, description, metadata, created_at)
      VALUES (?, ?, ?, ?, 'profile_created', ?, ?, ?)
    `, [
      uuidv4(),
      customerId,
      staff_id || null,
      staff?.name || 'Reception Staff',
      `Registered new customer ${name} (${cleanedPhone}) with intent: ${walk_in_intent || 'Walk-in'}`,
      JSON.stringify({ walk_in_intent }),
      now
    ]);

    sseBroadcaster.broadcast('CUSTOMER_CREATED', {
      customerId,
      name,
      phoneNumber: cleanedPhone,
      walk_in_intent
    });

    res.status(201).json({
      success: true,
      customerId,
      message: 'Customer registered successfully'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCustomer = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { name, email, dob, anniversary, gender, referred_by, tags } = req.body;

    const existing = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const parsedTags = Array.isArray(tags) ? JSON.stringify(tags) : existing.tags;
    const now = new Date().toISOString();

    run(`
      UPDATE customers 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          dob = COALESCE(?, dob),
          anniversary = COALESCE(?, anniversary),
          gender = COALESCE(?, gender),
          referred_by = COALESCE(?, referred_by),
          tags = ?,
          is_imported_placeholder = 0,
          updated_at = ?
      WHERE id = ?
    `, [
      name || null,
      email || null,
      dob || null,
      anniversary || null,
      gender || null,
      referred_by || null,
      parsedTags,
      now,
      id
    ]);

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const addPreference = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { type, value } = req.body;
    const staff_id = req.staff!.id;

    if (!type || !value) {
      res.status(400).json({ error: 'Preference type and value are required' });
      return;
    }

    const staff = staff_id ? queryOne('SELECT name FROM staff WHERE id = ?', [staff_id]) : null;
    const prefId = uuidv4();
    const now = new Date().toISOString();

    run(`
      INSERT INTO preferences (id, customer_id, type, value, added_by_staff_id, staff_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      prefId,
      id,
      type,
      String(value).trim(),
      staff_id || null,
      staff?.name || 'Sales Staff',
      now
    ]);

    // Activity log
    run(`
      INSERT INTO activity_logs (id, customer_id, staff_id, staff_name, action_type, description, metadata, created_at)
      VALUES (?, ?, ?, ?, 'preference_added', ?, ?, ?)
    `, [
      uuidv4(),
      id,
      staff_id || null,
      staff?.name || 'Sales Staff',
      `Added ${type.replace('_', ' ')}: "${value}"`,
      JSON.stringify({ type, value }),
      now
    ]);

    res.status(201).json({ success: true, preferenceId: prefId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deletePreference = (req: Request, res: Response): void => {
  try {
    const { id, prefId } = req.params;
    run('DELETE FROM preferences WHERE id = ? AND customer_id = ?', [prefId, id]);
    res.json({ success: true, message: 'Preference removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const logVisit = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { branch_id, visit_type, handled_by_staff_id, notes } = req.body;

    const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const visitId = uuidv4();
    const defaultBranchId = branch_id || customer.branch_id || 'branch-1';

    run(`
      INSERT INTO visits (id, customer_id, branch_id, visit_date, visit_type, handled_by_staff_id, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      visitId,
      id,
      defaultBranchId,
      today,
      visit_type || 'walk_in',
      handled_by_staff_id || null,
      notes || null,
      now
    ]);

    // Increment visit count and update last_visit_date
    run(`
      UPDATE customers 
      SET visit_count = visit_count + 1, last_visit_date = ?, updated_at = ?
      WHERE id = ?
    `, [today, now, id]);

    const staff = handled_by_staff_id ? queryOne('SELECT name FROM staff WHERE id = ?', [handled_by_staff_id]) : null;
    run(`
      INSERT INTO activity_logs (id, customer_id, staff_id, staff_name, action_type, description, metadata, created_at)
      VALUES (?, ?, ?, ?, 'visit_logged', ?, ?, ?)
    `, [
      uuidv4(),
      id,
      handled_by_staff_id || null,
      staff?.name || 'Reception Staff',
      `Logged in-store visit (${visit_type || 'walk_in'})${notes ? ': ' + notes : ''}`,
      JSON.stringify({ visit_type, notes }),
      now
    ]);

    res.status(201).json({ success: true, visitId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteCustomer = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const customer = queryOne('SELECT id, name, phone_number FROM customers WHERE id = ? OR phone_number = ?', [id, id]);

    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const customerId = customer.id;

    // Delete associated records in correct relational sequence
    run('DELETE FROM purchases WHERE customer_id = ?', [customerId]);
    run('DELETE FROM preferences WHERE customer_id = ?', [customerId]);
    run('DELETE FROM leads WHERE customer_id = ?', [customerId]);
    run('DELETE FROM visits WHERE customer_id = ?', [customerId]);
    run('DELETE FROM activity_logs WHERE customer_id = ?', [customerId]);
    run('DELETE FROM customers WHERE id = ?', [customerId]);

    res.json({
      success: true,
      message: `Customer ${customer.name} and all associated purchase history deleted successfully.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

