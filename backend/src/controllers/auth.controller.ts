import { Request, Response } from 'express';
import { query, queryOne, run } from '../db/database';
import { sseBroadcaster } from '../services/broadcaster';

export const pinLogin = (req: Request, res: Response): void => {
  try {
    const { pin_code, staff_id } = req.body;

    if (!pin_code) {
      res.status(400).json({ error: 'PIN code is required' });
      return;
    }

    let staff;
    if (staff_id) {
      staff = queryOne('SELECT * FROM staff WHERE id = ? AND pin_code = ?', [staff_id, String(pin_code).trim()]);
    } else {
      staff = queryOne('SELECT * FROM staff WHERE pin_code = ?', [String(pin_code).trim()]);
    }

    if (!staff) {
      res.status(401).json({ error: 'Invalid PIN code' });
      return;
    }

    const branch = queryOne('SELECT * FROM branches WHERE id = ?', [staff.branch_id]);

    res.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        branch_id: staff.branch_id,
        phone: staff.phone,
        status: staff.status,
        avatar_url: staff.avatar_url,
        specialty_category: staff.specialty_category,
        branch: branch || null
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getStaffList = (req: Request, res: Response): void => {
  try {
    const { branch_id, role } = req.query;
    let sql = `
      SELECT s.*, b.name as branch_name,
        (SELECT COUNT(*) FROM leads l WHERE l.assigned_to_staff_id = s.id AND l.status IN ('new', 'acknowledged', 'in_progress')) as active_leads_count
      FROM staff s
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (branch_id) {
      sql += ' AND s.branch_id = ?';
      params.push(branch_id);
    }
    if (role) {
      sql += ' AND s.role = ?';
      params.push(role);
    }

    sql += ' ORDER BY s.role ASC, s.name ASC';
    const staffList = query(sql, params).map(s => {
      const { pin_code, ...safeStaff } = s;
      return safeStaff;
    });

    res.json(staffList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateStaffStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'free', 'busy', 'with_customer', 'on_break'

    if (!['free', 'busy', 'with_customer', 'on_break'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    run('UPDATE staff SET status = ? WHERE id = ?', [status, id]);
    const updated = queryOne('SELECT * FROM staff WHERE id = ?', [id]);

    sseBroadcaster.broadcast('STAFF_STATUS_CHANGED', {
      staffId: id,
      name: updated?.name,
      status
    });

    res.json({ success: true, staff: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
