import { query, queryOne } from '../db/database';

export interface RepRecommendation {
  recommendedRep: any;
  reason: string;
  availableReps: any[];
}

export function recommendSalesRep(customerId: string, branchId?: string): RepRecommendation {
  const branchFilter = branchId ? 'AND s.branch_id = ?' : '';
  const branchParams = branchId ? [branchId] : [];

  // Get all sales reps with their active lead count
  const reps = query(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM leads l WHERE l.assigned_to_staff_id = s.id AND l.status IN ('new', 'acknowledged', 'in_progress')) as active_leads_count
    FROM staff s
    WHERE s.role = 'sales_rep' ${branchFilter}
    ORDER BY 
      CASE WHEN s.status = 'free' THEN 0 WHEN s.status = 'with_customer' THEN 1 WHEN s.status = 'busy' THEN 2 ELSE 3 END,
      active_leads_count ASC
  `, branchParams);

  if (reps.length === 0) {
    return {
      recommendedRep: null,
      reason: 'No sales representatives found for this branch',
      availableReps: []
    };
  }

  // Check customer's top preference category or purchase history
  const topCategoryPref = queryOne(`
    SELECT value FROM preferences 
    WHERE customer_id = ? AND type = 'category'
    ORDER BY created_at DESC LIMIT 1
  `, [customerId]);

  const topPurchaseCategory = queryOne(`
    SELECT category, COUNT(*) as cnt 
    FROM purchases 
    WHERE customer_id = ? 
    GROUP BY category 
    ORDER BY cnt DESC LIMIT 1
  `, [customerId]);

  const preferredCategory = (topCategoryPref?.value || topPurchaseCategory?.category || '').toLowerCase();

  // 1. Try to find a FREE rep matching the specialty
  if (preferredCategory) {
    const specialtyMatch = reps.find(r => 
      r.status === 'free' && 
      r.specialty_category && 
      r.specialty_category.toLowerCase().includes(preferredCategory.substring(0, 5))
    );

    if (specialtyMatch) {
      return {
        recommendedRep: specialtyMatch,
        reason: `Specialist in ${specialtyMatch.specialty_category} and currently free (${specialtyMatch.active_leads_count} active leads)`,
        availableReps: reps
      };
    }
  }

  // 2. Otherwise pick the FREE rep with the fewest active leads
  const leastBusyFreeRep = reps.find(r => r.status === 'free');
  if (leastBusyFreeRep) {
    return {
      recommendedRep: leastBusyFreeRep,
      reason: `Available now with least load (${leastBusyFreeRep.active_leads_count} active lead${leastBusyFreeRep.active_leads_count === 1 ? '' : 's'})`,
      availableReps: reps
    };
  }

  // 3. Fallback: Rep with fewest active leads overall
  const leastBusyOverall = reps[0];
  return {
    recommendedRep: leastBusyOverall,
    reason: `All reps currently engaged; ${leastBusyOverall.name} has the lowest queue (${leastBusyOverall.active_leads_count} active leads)`,
    availableReps: reps
  };
}
