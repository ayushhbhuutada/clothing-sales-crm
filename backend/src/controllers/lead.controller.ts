import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database';
import { sseBroadcaster } from '../services/broadcaster';
import { recommendSalesRep } from '../services/routing.service';
import { isManager } from '../services/auth.service';

export const assignLead = (req: Request, res: Response): void => {
  try {
    const {
      customer_id,
      assigned_to_staff_id,
      branch_id,
      walk_in_intent,
      notes
    } = req.body;
    const assigned_by_staff_id = req.staff!.id;

    if (!customer_id || !assigned_to_staff_id) {
      res.status(400).json({ error: 'customer_id and assigned_to_staff_id are required' });
      return;
    }

    const customer = queryOne('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const assignedTo = queryOne('SELECT * FROM staff WHERE id = ?', [assigned_to_staff_id]);
    if (!assignedTo) {
      res.status(404).json({ error: 'Assigned staff member not found' });
      return;
    }
    const assignedBy = queryOne('SELECT * FROM staff WHERE id = ?', [assigned_by_staff_id]);

    const leadId = uuidv4();
    const now = new Date().toISOString();
    const defaultBranchId = branch_id || customer.branch_id || 'branch-1';

    run(`
      INSERT INTO leads (id, customer_id, branch_id, assigned_to_staff_id, assigned_by_staff_id, status, walk_in_intent, outcome_notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, ?)
    `, [
      leadId,
      customer_id,
      defaultBranchId,
      assigned_to_staff_id,
      assigned_by_staff_id,
      walk_in_intent || 'Assigned from Front Desk',
      notes || null,
      now,
      now
    ]);

    // Update staff status to 'with_customer'
    run('UPDATE staff SET status = ? WHERE id = ?', ['with_customer', assigned_to_staff_id]);

    // Pull quick context for notification
    const lastPurchase = queryOne(`
      SELECT item_name, final_amount, purchase_date, size, category 
      FROM purchases 
      WHERE customer_id = ? 
      ORDER BY purchase_date DESC LIMIT 1
    `, [customer_id]);

    const topPreferences = query(`
      SELECT type, value FROM preferences 
      WHERE customer_id = ? 
      ORDER BY created_at DESC LIMIT 5
    `, [customer_id]);

    // Activity log
    run(`
      INSERT INTO activity_logs (id, customer_id, staff_id, staff_name, action_type, description, metadata, created_at)
      VALUES (?, ?, ?, ?, 'lead_assigned', ?, ?, ?)
    `, [
      uuidv4(),
      customer_id,
      assigned_by_staff_id,
      assignedBy?.name || 'Reception Staff',
      `Assigned lead to ${assignedTo?.name || 'Sales Rep'} (Intent: ${walk_in_intent || 'In-store consultation'})`,
      JSON.stringify({ leadId, assigned_to: assignedTo?.name, walk_in_intent }),
      now
    ]);

    // Broadcast Realtime SSE Alert specifically targeted to the assigned sales rep and global dashboard
    const alertData = {
      leadId,
      customer: {
        id: customer.id,
        name: customer.name,
        phone_number: customer.phone_number,
        total_spend: customer.total_spend,
        visit_count: customer.visit_count,
        last_visit_date: customer.last_visit_date,
        tags: JSON.parse(customer.tags || '[]')
      },
      assignedTo: {
        id: assignedTo?.id,
        name: assignedTo?.name
      },
      assignedBy: {
        id: assignedBy?.id,
        name: assignedBy?.name
      },
      walk_in_intent,
      notes,
      lastPurchase,
      topPreferences,
      created_at: now
    };

    sseBroadcaster.broadcast('LEAD_ASSIGNED', alertData, assigned_to_staff_id);

    res.status(201).json({
      success: true,
      leadId,
      message: `Lead successfully assigned to ${assignedTo?.name}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getActiveLeads = (req: Request, res: Response): void => {
  try {
    const { branch_id } = req.query;
    let sql = `
      SELECT l.*,
        c.name as customer_name, c.phone_number as customer_phone, c.total_spend as customer_spend, c.tags as customer_tags,
        s1.name as assigned_to_name, s1.avatar_url as assigned_to_avatar, s1.specialty_category as assigned_to_specialty,
        s2.name as assigned_by_name
      FROM leads l
      JOIN customers c ON l.customer_id = c.id
      JOIN staff s1 ON l.assigned_to_staff_id = s1.id
      LEFT JOIN staff s2 ON l.assigned_by_staff_id = s2.id
      WHERE l.status IN ('new', 'acknowledged', 'in_progress')
    `;
    const params: any[] = [];

    if (branch_id) {
      sql += ' AND l.branch_id = ?';
      params.push(branch_id);
    }

    sql += ' ORDER BY l.created_at DESC';
    const leads = query(sql, params).map(l => ({
      ...l,
      customer_tags: JSON.parse(l.customer_tags || '[]')
    }));

    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyLeads = (req: Request, res: Response): void => {
  try {
    const { staffId } = req.params;
    const { include_closed } = req.query;

    let statusFilter = `l.status IN ('new', 'acknowledged', 'in_progress')`;
    if (include_closed === 'true') {
      statusFilter = `1=1`;
    }

    const leads = query(`
      SELECT l.*,
        c.name as customer_name, c.phone_number as customer_phone, c.total_spend as customer_spend, c.tags as customer_tags, c.last_visit_date,
        s2.name as assigned_by_name
      FROM leads l
      JOIN customers c ON l.customer_id = c.id
      LEFT JOIN staff s2 ON l.assigned_by_staff_id = s2.id
      WHERE l.assigned_to_staff_id = ? AND ${statusFilter}
      ORDER BY 
        CASE WHEN l.status = 'new' THEN 0
             WHEN l.status = 'acknowledged' THEN 1
             WHEN l.status = 'in_progress' THEN 2
             ELSE 3 END,
        l.created_at DESC
    `, [staffId]);

    const enriched = leads.map(l => {
      const lastPurchase = queryOne(`
        SELECT item_name, final_amount, purchase_date, size, category 
        FROM purchases 
        WHERE customer_id = ? 
        ORDER BY purchase_date DESC LIMIT 1
      `, [l.customer_id]);

      const topPreferences = query(`
        SELECT type, value FROM preferences 
        WHERE customer_id = ? 
        ORDER BY created_at DESC
      `, [l.customer_id]);

      return {
        ...l,
        customer_tags: JSON.parse(l.customer_tags || '[]'),
        lastPurchase: lastPurchase || null,
        preferences: topPreferences
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateLeadStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status, outcome_notes } = req.body;
    const staff_id = req.staff!.id;

    if (!['new', 'acknowledged', 'in_progress'].includes(status)) {
      res.status(400).json({ error: 'Invalid lead status' });
      return;
    }

    const lead = queryOne('SELECT * FROM leads WHERE id = ?', [id]);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (lead.assigned_to_staff_id !== staff_id && !isManager(req.staff!.role)) {
      res.status(403).json({ error: 'Only the assigned stylist or a manager can update this lead' });
      return;
    }

    const now = new Date().toISOString();
    let ackTime = lead.acknowledged_at;
    if (status === 'acknowledged' && !ackTime) {
      ackTime = now;
    }

    run(`
      UPDATE leads 
      SET status = ?, 
          acknowledged_at = COALESCE(?, acknowledged_at), 
          outcome_notes = COALESCE(?, outcome_notes),
          updated_at = ?
      WHERE id = ?
    `, [status, ackTime, outcome_notes || null, now, id]);

    run(`
      INSERT INTO activity_logs (id, customer_id, staff_id, staff_name, action_type, description, metadata, created_at)
      VALUES (?, ?, ?, ?, 'lead_status_updated', ?, ?, ?)
    `, [
      uuidv4(),
      lead.customer_id,
      staff_id,
      req.staff!.name,
      `Lead status updated to "${status}"`,
      JSON.stringify({ leadId: id, status }),
      now
    ]);

    sseBroadcaster.broadcast('LEAD_UPDATED', {
      leadId: id,
      status,
      customerId: lead.customer_id,
      assignedToStaffId: lead.assigned_to_staff_id
    });

    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const closeLead = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const {
      status, // 'closed_sale', 'closed_no_sale', 'follow_up_needed'
      outcome_notes,
      no_sale_reason,
      linked_invoice_number,
      sale_amount,
      follow_up_date
    } = req.body;

    if (!['closed_sale', 'closed_no_sale', 'follow_up_needed'].includes(status)) {
      res.status(400).json({ error: 'Invalid closing status' });
      return;
    }

    const lead = queryOne('SELECT * FROM leads WHERE id = ?', [id]);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (lead.assigned_to_staff_id !== req.staff!.id && !isManager(req.staff!.role)) {
      res.status(403).json({ error: 'Only the assigned stylist or a manager can close this lead' });
      return;
    }

    const now = new Date().toISOString();
    // The stylist whose availability is freed is always the assigned one, even when a manager closes the lead
    const activeStaffId = lead.assigned_to_staff_id;

    run(`
      UPDATE leads 
      SET status = ?,
          outcome_notes = ?,
          no_sale_reason = ?,
          linked_invoice_number = ?,
          sale_amount = ?,
          follow_up_date = ?,
          closed_at = ?,
          updated_at = ?
      WHERE id = ?
    `, [
      status,
      outcome_notes || null,
      no_sale_reason || null,
      linked_invoice_number || null,
      parseFloat(sale_amount) || null,
      follow_up_date || null,
      now,
      now,
      id
    ]);

    // Check if staff has any other active leads; if not, set status back to 'free'
    const remainingLeads = queryOne(`
      SELECT COUNT(*) as count FROM leads 
      WHERE assigned_to_staff_id = ? AND status IN ('new', 'acknowledged', 'in_progress') AND id != ?
    `, [activeStaffId, id]);

    if (!remainingLeads || remainingLeads.count === 0) {
      run('UPDATE staff SET status = ? WHERE id = ?', ['free', activeStaffId]);
      sseBroadcaster.broadcast('STAFF_STATUS_CHANGED', { staffId: activeStaffId, status: 'free' });
    }

    let outcomeDesc = `Lead closed with status "${status}"`;
    if (status === 'closed_sale') outcomeDesc = `Sale completed! Invoice: ${linked_invoice_number || 'N/A'}, Amount: ₹${sale_amount || 0}`;
    if (status === 'closed_no_sale') outcomeDesc = `Closed (No Sale) — Reason: ${no_sale_reason || 'Not specified'}`;
    if (status === 'follow_up_needed') outcomeDesc = `Marked for follow-up on ${follow_up_date || 'future date'}`;

    run(`
      INSERT INTO activity_logs (id, customer_id, staff_id, staff_name, action_type, description, metadata, created_at)
      VALUES (?, ?, ?, ?, 'lead_closed', ?, ?, ?)
    `, [
      uuidv4(),
      lead.customer_id,
      req.staff!.id,
      req.staff!.name,
      outcomeDesc,
      JSON.stringify({ leadId: id, status, no_sale_reason, sale_amount }),
      now
    ]);

    sseBroadcaster.broadcast('LEAD_CLOSED', {
      leadId: id,
      customerId: lead.customer_id,
      status,
      saleAmount: sale_amount,
      assignedToStaffId: activeStaffId
    });

    res.json({ success: true, message: 'Lead closed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getRecommendedRep = (req: Request, res: Response): void => {
  try {
    const customerId = String(req.query.customerId || '');
    const branchId = req.query.branchId ? String(req.query.branchId) : undefined;
    const recommendation = recommendSalesRep(customerId, branchId);
    res.json(recommendation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
