import React, { useState, useEffect } from 'react';
import { PhoneSearchBar } from './PhoneSearchBar';
import { Customer, Lead } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  UserPlus,
  Users,
  Clock,
  ShoppingBag,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Phone
} from 'lucide-react';

interface ReceptionViewProps {
  onOpenCustomerProfile: (customerId: string) => void;
  onOpenNewCustomer: (prefillPhone?: string) => void;
  onOpenLeadAssign: (customer: Customer) => void;
  onNavigateTab: (tab: string) => void;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({
  onOpenCustomerProfile,
  onOpenNewCustomer,
  onOpenLeadAssign,
  onNavigateTab
}) => {
  const { currentBranch, allStaff } = useAuth();
  const [activeLeads, setActiveLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);

  const loadFloorData = async () => {
    setLoadingLeads(true);
    try {
      const leads = await api.getActiveLeads(currentBranch?.id);
      setActiveLeads(leads);

      // Load a few top/recent customers for fast access
      const searchRes = await api.searchCustomers('9');
      setRecentCustomers(searchRes.slice(0, 4));
    } catch (err) {
      console.error('Failed to load reception floor data:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    loadFloorData();
    const interval = setInterval(loadFloorData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [currentBranch?.id]);

  const salesReps = allStaff.filter(s => s.role === 'sales_rep');
  const freeRepsCount = salesReps.filter(s => s.status === 'free').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Hero Phone Search Section */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-stone-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-stone-800 relative overflow-hidden text-center">
        {/* Subtle decorative glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-3 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-amber-300 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant In-Store Recognition & Lead Routing</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight">
            Front Desk Customer Lookup
          </h1>
          <p className="text-xs sm:text-sm text-stone-300">
            Enter mobile number to pull up purchase history, style preferences, and assign leads to on-floor stylists.
          </p>

          {/* Large Live Search Bar */}
          <div className="pt-4">
            <PhoneSearchBar
              onSelectCustomer={(c) => onOpenCustomerProfile(c.id)}
              onOpenNewCustomer={(phone) => onOpenNewCustomer(phone)}
              onQuickAssign={(c) => onOpenLeadAssign(c)}
            />
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-stone-400">
            <span>Fast shortcuts:</span>
            <button
              onClick={() => onOpenNewCustomer('')}
              className="inline-flex items-center space-x-1 text-amber-300 hover:text-amber-200 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Walk-in Registration</span>
            </button>
            <button
              onClick={() => onNavigateTab('import')}
              className="inline-flex items-center space-x-1 text-brand-300 hover:text-brand-200 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Universal POS Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floor Status & Live Lead Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Live Sales Floor Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-stone-900">Active Shop Floor Consultations</h2>
              <span className="text-xs bg-brand-100 text-brand-800 font-bold px-2 py-0.5 rounded-full">
                {activeLeads.length} active
              </span>
            </div>
            <button
              onClick={loadFloorData}
              className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              Refresh
            </button>
          </div>

          {activeLeads.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">All Walk-ins Handled!</h3>
              <p className="text-xs text-stone-500 mt-1">
                There are no waiting leads. Search a customer number above to route a new lead.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeLeads.map(lead => {
                const isVip = lead.customer_tags && lead.customer_tags.includes('VIP');
                const statusBadges: Record<string, { bg: string; text: string; label: string }> = {
                  new: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Assigned (Waiting)' },
                  acknowledged: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Rep Approaching' },
                  in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'In Consultation' }
                };
                const badge = statusBadges[lead.status] || statusBadges.new;

                return (
                  <div
                    key={lead.id}
                    className="bg-white rounded-2xl p-4 border border-stone-200 hover:border-brand-300 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-sm shrink-0">
                        {lead.customer_name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-stone-900">{lead.customer_name}</span>
                          {isVip && (
                            <span className="text-[9px] uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300">
                              VIP
                            </span>
                          )}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </div>

                        <div className="text-xs text-stone-500 flex items-center space-x-2 mt-1">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span className="font-mono">+91 {lead.customer_phone}</span>
                          <span>•</span>
                          <span className="text-brand-700 font-semibold">
                            LTV: ₹{(lead.customer_spend || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {lead.walk_in_intent && (
                          <div className="text-[11px] text-stone-600 font-medium mt-1 bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100 inline-block">
                            Intent: "{lead.walk_in_intent}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Rep Card */}
                    <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <div className="flex items-center space-x-2">
                        <img
                          src={lead.assigned_to_avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                          alt={lead.assigned_to_name}
                          className="w-8 h-8 rounded-full object-cover shadow-2xs"
                        />
                        <div className="text-left">
                          <div className="text-xs font-bold text-stone-900">{lead.assigned_to_name}</div>
                          <div className="text-[10px] text-stone-500">{lead.assigned_to_specialty || 'Sales Stylist'}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenCustomerProfile(lead.customer_id)}
                        className="p-2 rounded-xl bg-stone-100 hover:bg-brand-50 hover:text-brand-700 text-stone-600 transition-colors"
                        title="View Full Profile"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Floor Capacity & Quick Customer Access */}
        <div className="space-y-6">
          
          {/* Stylists on Floor Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Sales Reps Availability
              </h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {freeRepsCount} of {salesReps.length} Free
              </span>
            </div>

            <div className="space-y-2.5">
              {salesReps.map(rep => {
                const statusDot = rep.status === 'free' ? 'bg-emerald-500' :
                                  rep.status === 'busy' ? 'bg-amber-500' :
                                  rep.status === 'with_customer' ? 'bg-purple-500' : 'bg-stone-400';
                const statusText = rep.status === 'free' ? 'Free' :
                                   rep.status === 'busy' ? 'Busy' :
                                   rep.status === 'with_customer' ? 'Engaged' : 'Break';

                return (
                  <div key={rep.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={rep.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                        alt={rep.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-stone-900">{rep.name}</div>
                        <div className="text-[10px] text-stone-500">{rep.specialty_category}</div>
                      </div>
                    </div>
                    <span className="flex items-center space-x-1 font-medium text-stone-600">
                      <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                      <span>{statusText}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Spenders / Recent Checkins */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Frequent VIP Spenders
              </h3>
              <button
                onClick={() => onNavigateTab('customers')}
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold"
              >
                View All
              </button>
            </div>

            <div className="space-y-2">
              {recentCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => onOpenCustomerProfile(c.id)}
                  className="p-2.5 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900">{c.name}</div>
                    <div className="text-[11px] text-stone-500">+91 {c.phone_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-brand-700">₹{(c.total_spend || 0).toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-stone-400">{c.visit_count} visits</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
