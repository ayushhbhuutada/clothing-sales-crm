export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  created_at: string;
}

export type StaffRole = 'receptionist' | 'sales_rep' | 'store_manager' | 'admin' | 'owner';
export type StaffStatus = 'free' | 'busy' | 'with_customer' | 'on_break';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  branch_id: string;
  phone: string;
  status: StaffStatus;
  avatar_url?: string;
  specialty_category?: string;
  branch_name?: string;
  active_leads_count?: number;
  created_at: string;
}

export interface Customer {
  id: string;
  phone_number: string;
  name: string;
  email?: string;
  dob?: string;
  anniversary?: string;
  gender?: string;
  referred_by?: string;
  tags: string[];
  total_spend: number;
  visit_count: number;
  last_visit_date?: string;
  is_imported_placeholder: number;
  branch_id?: string;
  branch_name?: string;
  total_visits?: number;
  total_purchases?: number;
  lastPurchase?: PurchaseSummary | null;
  topPreferences?: { type: string; value: string }[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseSummary {
  invoice_number: string;
  item_name: string;
  final_amount: number;
  purchase_date: string;
  category: string;
  size?: string;
  color?: string;
}

export interface Purchase {
  id: string;
  customer_id: string;
  invoice_number: string;
  item_name: string;
  sku?: string;
  category: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  discount: number;
  final_amount: number;
  purchase_date: string;
  branch_id?: string;
  branch_name?: string;
  sold_by_staff_id?: string;
  sold_by_staff_name?: string;
  source_import_id?: string;
  row_hash: string;
  created_at: string;
}

export interface Preference {
  id: string;
  customer_id: string;
  type: 'top_size' | 'bottom_size' | 'footwear_size' | 'color' | 'category' | 'fabric' | 'brand' | 'budget' | 'style_note' | 'dislike';
  value: string;
  added_by_staff_id?: string;
  staff_name?: string;
  created_at: string;
}

export interface PreferenceSummary {
  top_sizes: string[];
  bottom_sizes: string[];
  footwear_sizes: string[];
  colors: string[];
  categories: string[];
  fabrics: string[];
  brands: string[];
  budgets: string[];
  style_notes: Preference[];
  dislikes: Preference[];
}

export interface Visit {
  id: string;
  customer_id: string;
  branch_id: string;
  branch_name?: string;
  visit_date: string;
  visit_type: 'walk_in' | 'purchase' | 'inquiry' | 'appointment';
  handled_by_staff_id?: string;
  staff_name?: string;
  notes?: string;
  created_at: string;
}

export type LeadStatus = 'new' | 'acknowledged' | 'in_progress' | 'closed_sale' | 'closed_no_sale' | 'follow_up_needed';

export interface Lead {
  id: string;
  customer_id: string;
  branch_id: string;
  assigned_to_staff_id: string;
  assigned_by_staff_id: string;
  status: LeadStatus;
  walk_in_intent?: string;
  outcome_notes?: string;
  no_sale_reason?: string;
  linked_invoice_number?: string;
  sale_amount?: number;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
  acknowledged_at?: string;
  closed_at?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_spend?: number;
  customer_tags?: string[];
  customer_last_visit?: string;
  assigned_to_name?: string;
  assigned_to_avatar?: string;
  assigned_to_specialty?: string;
  assigned_by_name?: string;
  lastPurchase?: PurchaseSummary | null;
  preferences?: Preference[];
}

export interface ColumnMappingTemplate {
  id: string;
  branch_id?: string;
  name: string;
  billing_software_name: string;
  field_mapping: Record<string, string>;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  uploaded_by_staff_id: string;
  uploaded_by_name?: string;
  template_name?: string;
  filename: string;
  file_size: number;
  uploaded_at: string;
  mapping_template_id?: string;
  rows_processed: number;
  rows_added: number;
  rows_duplicate: number;
  rows_needs_review: number;
  rows_failed: number;
  log_summary: {
    addedCount: number;
    duplicatesCount: number;
    reviewCount: number;
    failedCount: number;
    newCustomersCount: number;
  };
}

export interface ReviewQueueItem {
  id: string;
  batch_id: string;
  batch_filename: string;
  raw_data: Record<string, any>;
  reason: string;
  invoice_number?: string;
  purchase_date?: string;
  amount?: number;
  item_name?: string;
  status: 'pending' | 'resolved' | 'discarded';
  created_at: string;
}

export interface KpiData {
  totalVisits: number;
  totalLeads: number;
  closedSaleLeads: number;
  closedNoSaleLeads: number;
  activeLeads: number;
  conversionRate: number;
  totalRevenue: number;
  totalPurchases: number;
  avgOrderValue: number;
  totalCustomers: number;
  dailyStats: { day: string; walkins: number; purchases: number }[];
}

export interface RepPerformance {
  id: string;
  name: string;
  avatar_url?: string;
  specialty_category?: string;
  status: StaffStatus;
  total_leads: number;
  sales_closed: number;
  no_sales: number;
  follow_ups: number;
  active_leads: number;
  total_lead_revenue: number;
  conversion_rate: number;
}
