import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../db/database';
import { AuthStaff, StaffRole, MANAGER_ROLES, isManager, verifyToken } from '../services/auth.service';

declare global {
  namespace Express {
    interface Request {
      staff?: AuthStaff;
    }
  }
}

function loadStaff(staffId: string): AuthStaff | null {
  return queryOne<AuthStaff>('SELECT id, name, role, branch_id FROM staff WHERE id = ?', [staffId]);
}

// Verifies the Bearer session token and re-reads the staff row so role changes / removals apply immediately
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const staffId = token ? verifyToken(token, 'session') : null;
  const staff = staffId ? loadStaff(staffId) : null;

  if (!staff) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  req.staff = staff;
  next();
};

export const requireRole = (...roles: StaffRole[]) => (req: Request, res: Response, next: NextFunction): void => {
  if (!req.staff || !roles.includes(req.staff.role)) {
    res.status(403).json({ error: 'You do not have permission to perform this action' });
    return;
  }
  next();
};

export const requireManager = requireRole(...MANAGER_ROLES);

// Allows the staff member named in :param, or any manager
export const requireSelfOrManager = (param: string) => (req: Request, res: Response, next: NextFunction): void => {
  if (!req.staff || (req.staff.id !== req.params[param] && !isManager(req.staff.role))) {
    res.status(403).json({ error: 'You do not have permission to perform this action' });
    return;
  }
  next();
};

export function resolveSseTicket(ticket: string): AuthStaff | null {
  const staffId = verifyToken(ticket, 'sse');
  return staffId ? loadStaff(staffId) : null;
}
