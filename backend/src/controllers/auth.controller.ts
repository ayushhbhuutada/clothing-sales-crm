import { Request, Response } from 'express';
import { query, queryOne, run } from '../db/database';
import { sseBroadcaster } from '../services/broadcaster';
import { isManager, isValidPinFormat, signSessionToken, signSseTicket, verifyPin } from '../services/auth.service';

function toSafeStaff(staff: any) {
  const { pin_code, ...safeStaff } = staff;
  return safeStaff;
}

export const pinLogin = (req: Request, res: Response): void => {
  try {
    const { pin_code, staff_id } = req.body;
    const pin = String(pin_code ?? '').trim();

    // A staff member must be selected: PIN-only login would let one guess be tested against every account
    if (!staff_id || !isValidPinFormat(pin)) {
      res.status(400).json({ error: 'Select your name and enter your PIN' });
      return;
    }

    const staff = queryOne('SELECT * FROM staff WHERE id = ?', [String(staff_id)]);
    if (!staff || !verifyPin(pin, staff.pin_code)) {
      res.status(401).json({ error: 'Invalid PIN code' });
      return;
    }

    const branch = queryOne('SELECT * FROM branches WHERE id = ?', [staff.branch_id]);
    const token = signSessionToken({ id: staff.id, name: staff.name, role: staff.role, branch_id: staff.branch_id });

    res.json({
      success: true,
      token,
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

export const getMe = (req: Request, res: Response): void => {
  try {
    const staff = queryOne('SELECT * FROM staff WHERE id = ?', [req.staff!.id]);
    const branch = queryOne('SELECT * FROM branches WHERE id = ?', [staff.branch_id]);
    res.json({ ...toSafeStaff(staff), branch: branch || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Public: only what the PIN pad needs to show who is on shift
export const getStaffDirectory = (req: Request, res: Response): void => {
  try {
    const staffList = query(`
      SELECT id, name, role, branch_id, avatar_url, specialty_category
      FROM staff
      ORDER BY role ASC, name ASC
    `);
    res.json(staffList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSseTicket = (req: Request, res: Response): void => {
  res.json({ ticket: signSseTicket(req.staff!.id) });
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
    const staffList = query(sql, params).map(toSafeStaff);

    res.json(staffList);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateStaffStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'free', 'busy', 'with_customer', 'on_break'

    if (req.staff!.id !== id && !isManager(req.staff!.role)) {
      res.status(403).json({ error: 'You can only change your own status' });
      return;
    }

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

    res.json({ success: true, staff: updated ? toSafeStaff(updated) : null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
