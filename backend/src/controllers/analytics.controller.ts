import { Request, Response } from 'express';
import { query, queryOne } from '../db/database';

export const getKpis = (req: Request, res: Response): void => {
  try {
    const { branch_id, time_range } = req.query;
    const branchFilter = branch_id ? `AND branch_id = '${branch_id}'` : '';

    // Footfall (total visits)
    const totalVisitsRow = queryOne(`SELECT COUNT(*) as count FROM visits WHERE 1=1 ${branchFilter}`);
    const totalVisits = totalVisitsRow?.count || 0;

    // Leads metrics
    const totalLeadsRow = queryOne(`SELECT COUNT(*) as count FROM leads WHERE 1=1 ${branchFilter}`);
    const totalLeads = totalLeadsRow?.count || 0;

    const closedSaleLeadsRow = queryOne(`SELECT COUNT(*) as count FROM leads WHERE status = 'closed_sale' ${branchFilter}`);
    const closedSaleLeads = closedSaleLeadsRow?.count || 0;

    const closedNoSaleLeadsRow = queryOne(`SELECT COUNT(*) as count FROM leads WHERE status = 'closed_no_sale' ${branchFilter}`);
    const closedNoSaleLeads = closedNoSaleLeadsRow?.count || 0;

    const activeLeadsRow = queryOne(`SELECT COUNT(*) as count FROM leads WHERE status IN ('new', 'acknowledged', 'in_progress') ${branchFilter}`);
    const activeLeads = activeLeadsRow?.count || 0;

    // Conversion rate
    const conversionRate = totalLeads > 0 ? ((closedSaleLeads / totalLeads) * 100).toFixed(1) : '0';

    // Revenue & AOV
    const revenueRow = queryOne(`SELECT SUM(final_amount) as total_rev, COUNT(*) as tx_count FROM purchases WHERE 1=1 ${branchFilter}`);
    const totalRevenue = revenueRow?.total_rev || 0;
    const totalPurchases = revenueRow?.tx_count || 0;
    const avgOrderValue = totalPurchases > 0 ? (totalRevenue / totalPurchases).toFixed(0) : '0';

    // Total unique customers
    const totalCustomersRow = queryOne(`SELECT COUNT(*) as count FROM customers WHERE 1=1 ${branchFilter}`);
    const totalCustomers = totalCustomersRow?.count || 0;

    // Footfall vs. Conversion comparison by day (last 7 days)
    const dailyStats = query(`
      SELECT 
        DATE(created_at) as day,
        COUNT(CASE WHEN visit_type = 'walk_in' THEN 1 END) as walkins,
        COUNT(CASE WHEN visit_type = 'purchase' THEN 1 END) as purchases
      FROM visits
      GROUP BY DATE(created_at)
      ORDER BY day DESC
      LIMIT 7
    `);

    res.json({
      totalVisits,
      totalLeads,
      closedSaleLeads,
      closedNoSaleLeads,
      activeLeads,
      conversionRate: parseFloat(conversionRate),
      totalRevenue,
      totalPurchases,
      avgOrderValue: parseFloat(avgOrderValue),
      totalCustomers,
      dailyStats: dailyStats.reverse()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getRepPerformance = (req: Request, res: Response): void => {
  try {
    const { branch_id } = req.query;
    const branchFilter = branch_id ? `AND s.branch_id = '${branch_id}'` : '';

    const reps = query(`
      SELECT 
        s.id, s.name, s.avatar_url, s.specialty_category, s.status,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'closed_sale' THEN 1 END) as sales_closed,
        COUNT(CASE WHEN l.status = 'closed_no_sale' THEN 1 END) as no_sales,
        COUNT(CASE WHEN l.status = 'follow_up_needed' THEN 1 END) as follow_ups,
        COUNT(CASE WHEN l.status IN ('new', 'acknowledged', 'in_progress') THEN 1 END) as active_leads,
        COALESCE(SUM(l.sale_amount), 0) as total_lead_revenue
      FROM staff s
      LEFT JOIN leads l ON l.assigned_to_staff_id = s.id
      WHERE s.role = 'sales_rep' ${branchFilter}
      GROUP BY s.id
      ORDER BY sales_closed DESC, total_leads DESC
    `);

    const enriched = reps.map(r => {
      const convRate = r.total_leads > 0 ? ((r.sales_closed / r.total_leads) * 100).toFixed(1) : '0';
      return {
        ...r,
        conversion_rate: parseFloat(convRate)
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getTrends = (req: Request, res: Response): void => {
  try {
    // 1. Top Categories
    const categories = query(`
      SELECT category, COUNT(*) as count, SUM(final_amount) as total_revenue
      FROM purchases
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY total_revenue DESC
      LIMIT 6
    `);

    // 2. Top Sizes requested
    const sizes = query(`
      SELECT size, COUNT(*) as count
      FROM purchases
      WHERE size IS NOT NULL AND size != '' AND size != 'Free Size'
      GROUP BY size
      ORDER BY count DESC
      LIMIT 8
    `);

    // 3. Top Preferred Colors
    const colors = query(`
      SELECT value as color, COUNT(*) as count
      FROM preferences
      WHERE type = 'color'
      GROUP BY value
      ORDER BY count DESC
      LIMIT 8
    `);

    // 4. Top Fabrics
    const fabrics = query(`
      SELECT value as fabric, COUNT(*) as count
      FROM preferences
      WHERE type = 'fabric'
      GROUP BY value
      ORDER BY count DESC
      LIMIT 6
    `);

    // 5. Top Spenders
    const topSpenders = query(`
      SELECT id, name, phone_number, total_spend, visit_count, tags, last_visit_date
      FROM customers
      ORDER BY total_spend DESC
      LIMIT 5
    `).map(c => ({
      ...c,
      tags: JSON.parse(c.tags || '[]')
    }));

    res.json({
      categories,
      sizes,
      colors,
      fabrics,
      topSpenders
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getRemindersAndLapsed = (req: Request, res: Response): void => {
  try {
    // 1. Scheduled follow-ups
    const scheduledFollowUps = query(`
      SELECT l.*, c.name as customer_name, c.phone_number as customer_phone, s.name as staff_name
      FROM leads l
      JOIN customers c ON l.customer_id = c.id
      JOIN staff s ON l.assigned_to_staff_id = s.id
      WHERE l.status = 'follow_up_needed' AND l.follow_up_date IS NOT NULL
      ORDER BY l.follow_up_date ASC
    `);

    // 2. Lapsed Regular Customers (>30-45 days since last visit)
    const lapsedCustomers = query(`
      SELECT c.*, b.name as branch_name,
        (SELECT item_name FROM purchases WHERE customer_id = c.id ORDER BY purchase_date DESC LIMIT 1) as last_item
      FROM customers c
      LEFT JOIN branches b ON c.branch_id = b.id
      WHERE c.total_spend >= 20000 
        AND c.last_visit_date <= DATE('now', '-30 days')
      ORDER BY c.total_spend DESC
      LIMIT 10
    `).map(c => ({
      ...c,
      tags: JSON.parse(c.tags || '[]')
    }));

    // 3. Upcoming Birthdays & Anniversaries (within 30 days)
    const upcomingCelebrations = query(`
      SELECT id, name, phone_number, dob, anniversary, total_spend, tags
      FROM customers
      WHERE dob IS NOT NULL OR anniversary IS NOT NULL
      ORDER BY total_spend DESC
    `).map(c => ({
      ...c,
      tags: JSON.parse(c.tags || '[]')
    }));

    res.json({
      scheduledFollowUps,
      lapsedCustomers,
      upcomingCelebrations
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getBranches = (req: Request, res: Response): void => {
  try {
    const branches = query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM staff s WHERE s.branch_id = b.id) as staff_count,
        (SELECT COUNT(*) FROM customers c WHERE c.branch_id = b.id) as customer_count
      FROM branches b
    `);
    res.json(branches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
