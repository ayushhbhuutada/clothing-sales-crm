import {
  Customer,
  Preference,
  PreferenceSummary,
  Purchase,
  Visit,
  Lead,
  Staff,
  Branch,
  ColumnMappingTemplate,
  ImportBatch,
  ReviewQueueItem,
  KpiData,
  RepPerformance
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${BASE_URL}/api`;
const TOKEN_KEY = 'aura_auth_token';

let unauthorizedHandler: (() => void) | null = null;

export const authToken = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // storage unavailable (private mode); session lasts until reload
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  },
  // Decodes the JWT payload locally only to skip restoring an already-expired session
  isExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
};

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

// fetch wrapper that attaches the session token and signs the user out when it is rejected
async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = authToken.get();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && token) {
    authToken.clear();
    unauthorizedHandler?.();
  }
  return res;
}

export interface CustomerProfileResponse extends Customer {
  lastPurchase: Purchase | null;
  purchases: Purchase[];
  preferences: Preference[];
  prefSummary: PreferenceSummary;
  visits: Visit[];
  leads: Lead[];
  activityLogs: {
    id: string;
    customer_id: string;
    staff_name: string;
    action_type: string;
    description: string;
    created_at: string;
  }[];
}

export const api = {
  // Auth & Staff
  async pinLogin(pin_code: string, staff_id: string): Promise<{ success: boolean; token: string; staff: Staff & { branch?: Branch } }> {
    const res = await fetch(`${API_BASE}/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin_code, staff_id })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async getMe(): Promise<Staff & { branch?: Branch }> {
    const res = await apiFetch(`${API_BASE}/auth/me`);
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },

  // Public list of staff names for the PIN pad (no phone numbers or status)
  async getStaffDirectory(): Promise<Staff[]> {
    const res = await fetch(`${API_BASE}/auth/staff-directory`);
    if (!res.ok) throw new Error('Failed to load staff');
    return res.json();
  },

  async getSseTicket(): Promise<string> {
    const res = await apiFetch(`${API_BASE}/auth/sse-ticket`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to get live updates ticket');
    const data = await res.json();
    return data.ticket;
  },

  async getStaffList(branch_id?: string): Promise<Staff[]> {
    const params = new URLSearchParams();
    if (branch_id) params.append('branch_id', branch_id);
    const res = await apiFetch(`${API_BASE}/auth/staff-list?${params.toString()}`);
    return res.json();
  },

  async updateStaffStatus(staff_id: string, status: string): Promise<any> {
    const res = await apiFetch(`${API_BASE}/auth/staff/${staff_id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Customers
  async searchCustomers(q?: string): Promise<Customer[]> {
    const queryStr = q && q.trim().length > 0 ? `?q=${encodeURIComponent(q.trim())}` : '';
    const res = await apiFetch(`${API_BASE}/customers/search${queryStr}`);
    return res.json();
  },

  async getCustomerProfile(id: string): Promise<CustomerProfileResponse> {
    const res = await apiFetch(`${API_BASE}/customers/${id}`);
    if (!res.ok) throw new Error('Customer not found');
    return res.json();
  },

  async createCustomer(data: {
    phone_number: string;
    name: string;
    email?: string;
    dob?: string;
    anniversary?: string;
    gender?: string;
    referred_by?: string;
    tags?: string[];
    branch_id?: string;
    walk_in_intent?: string;
    initial_note?: string;
    staff_id?: string;
  }): Promise<{ success: boolean; customerId: string }> {
    const res = await apiFetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create customer');
    }
    return res.json();
  },

  async updateCustomer(id: string, data: any): Promise<any> {
    const res = await apiFetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteCustomer(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch(`${API_BASE}/customers/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete customer');
    }
    return res.json();
  },

  async addPreference(customerId: string, data: { type: string; value: string; staff_id?: string }): Promise<any> {
    const res = await apiFetch(`${API_BASE}/customers/${customerId}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deletePreference(customerId: string, prefId: string): Promise<any> {
    const res = await apiFetch(`${API_BASE}/customers/${customerId}/preferences/${prefId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async logVisit(customerId: string, data: { branch_id?: string; visit_type?: string; handled_by_staff_id?: string; notes?: string }): Promise<any> {
    const res = await apiFetch(`${API_BASE}/customers/${customerId}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Leads
  async assignLead(data: {
    customer_id: string;
    assigned_to_staff_id: string;
    assigned_by_staff_id?: string;
    branch_id?: string;
    walk_in_intent?: string;
    notes?: string;
  }): Promise<{ success: boolean; leadId: string; message: string }> {
    const res = await apiFetch(`${API_BASE}/leads/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to assign lead');
    }
    return res.json();
  },

  async getActiveLeads(branchId?: string): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branch_id', branchId);
    const res = await apiFetch(`${API_BASE}/leads/active?${params.toString()}`);
    return res.json();
  },

  async getMyLeads(staffId: string, includeClosed = false): Promise<Lead[]> {
    const res = await apiFetch(`${API_BASE}/leads/my-leads/${staffId}?include_closed=${includeClosed}`);
    return res.json();
  },

  async updateLeadStatus(leadId: string, data: { status: string; outcome_notes?: string; staff_id?: string }): Promise<any> {
    const res = await apiFetch(`${API_BASE}/leads/${leadId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async closeLead(leadId: string, data: {
    status: 'closed_sale' | 'closed_no_sale' | 'follow_up_needed';
    outcome_notes?: string;
    no_sale_reason?: string;
    linked_invoice_number?: string;
    sale_amount?: number;
    follow_up_date?: string;
    staff_id?: string;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE}/leads/${leadId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getRecommendedRep(customerId: string, branchId?: string): Promise<{
    recommendedRep: Staff | null;
    reason: string;
    availableReps: Staff[];
  }> {
    const params = new URLSearchParams({ customerId });
    if (branchId) params.append('branchId', branchId);
    const res = await apiFetch(`${API_BASE}/leads/recommend-rep?${params.toString()}`);
    return res.json();
  },

  // Imports
  async getTemplates(): Promise<ColumnMappingTemplate[]> {
    const res = await apiFetch(`${API_BASE}/imports/templates`);
    return res.json();
  },

  async saveTemplate(data: { id?: string; name: string; billing_software_name: string; field_mapping: Record<string, string>; branch_id?: string }): Promise<any> {
    const res = await apiFetch(`${API_BASE}/imports/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async previewImportFile(file: File): Promise<{
    filename: string;
    totalRows: number;
    headers: string[];
    sampleRows: any[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiFetch(`${API_BASE}/imports/preview`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Preview failed');
    }
    return res.json();
  },

  async uploadAndImport(file: File, options: {
    mapping?: Record<string, string>;
    template_id?: string;
    staff_id?: string;
    branch_id?: string;
  }): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.mapping) formData.append('mapping', JSON.stringify(options.mapping));
    if (options.template_id) formData.append('template_id', options.template_id);
    if (options.staff_id) formData.append('staff_id', options.staff_id);
    if (options.branch_id) formData.append('branch_id', options.branch_id);

    const res = await apiFetch(`${API_BASE}/imports/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Import failed');
    }
    return res.json();
  },

  async getImportBatches(): Promise<ImportBatch[]> {
    const res = await apiFetch(`${API_BASE}/imports/batches`);
    return res.json();
  },

  async getReviewQueue(): Promise<ReviewQueueItem[]> {
    const res = await apiFetch(`${API_BASE}/imports/review-queue`);
    return res.json();
  },

  async resolveReviewItem(id: string, data: {
    action: 'link' | 'discard';
    customer_id?: string;
    phone_number?: string;
    customer_name?: string;
    staff_id?: string;
  }): Promise<any> {
    const res = await apiFetch(`${API_BASE}/imports/review-queue/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getSampleTemplates(): Promise<any> {
    const res = await apiFetch(`${API_BASE}/imports/sample-templates`);
    return res.json();
  },

  // Analytics
  async getKpis(branchId?: string): Promise<KpiData> {
    const params = new URLSearchParams();
    if (branchId) params.append('branch_id', branchId);
    const res = await apiFetch(`${API_BASE}/analytics/kpis?${params.toString()}`);
    return res.json();
  },

  async getRepPerformance(branchId?: string): Promise<RepPerformance[]> {
    const params = new URLSearchParams();
    if (branchId) params.append('branch_id', branchId);
    const res = await apiFetch(`${API_BASE}/analytics/rep-performance?${params.toString()}`);
    return res.json();
  },

  async getTrends(): Promise<{
    categories: { category: string; count: number; total_revenue: number }[];
    sizes: { size: string; count: number }[];
    colors: { color: string; count: number }[];
    fabrics: { fabric: string; count: number }[];
    topSpenders: Customer[];
  }> {
    const res = await apiFetch(`${API_BASE}/analytics/trends`);
    return res.json();
  },

  async getRemindersAndLapsed(): Promise<{
    scheduledFollowUps: any[];
    lapsedCustomers: any[];
    upcomingCelebrations: any[];
  }> {
    const res = await apiFetch(`${API_BASE}/analytics/reminders`);
    return res.json();
  },

  async getBranches(): Promise<Branch[]> {
    const res = await apiFetch(`${API_BASE}/branches`);
    return res.json();
  }
};
