import React, { useState, useEffect } from 'react';
import { Lead } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { QuickPreferenceTagger } from './QuickPreferenceTagger';
import { CloseLeadModal } from './CloseLeadModal';
import {
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Tag,
  Phone,
  User,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  BellRing
} from 'lucide-react';

interface SalesFloorViewProps {
  onOpenCustomerProfile: (customerId: string) => void;
}

export const SalesFloorView: React.FC<SalesFloorViewProps> = ({
  onOpenCustomerProfile
}) => {
  const { currentStaff, updateStatus } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewTab, setViewTab] = useState<'active' | 'completed'>('active');

  // Modal states
  const [selectedLeadForTagger, setSelectedLeadForTagger] = useState<Lead | null>(null);
  const [selectedLeadForClose, setSelectedLeadForClose] = useState<Lead | null>(null);

  const loadMyLeads = async () => {
    if (!currentStaff) return;
    setLoading(true);
    try {
      const data = await api.getMyLeads(currentStaff.id, viewTab === 'completed');
      setLeads(data);
    } catch (err) {
      console.error('Failed to load my leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyLeads();
    const interval = setInterval(loadMyLeads, 8000); // 8s auto refresh
    return () => clearInterval(interval);
  }, [currentStaff?.id, viewTab]);

  const handleAcknowledge = async (leadId: string) => {
    try {
      await api.updateLeadStatus(leadId, {
        status: 'acknowledged',
        staff_id: currentStaff?.id
      });
      loadMyLeads();
    } catch (err) {
      console.error('Failed to acknowledge lead:', err);
    }
  };

  const handleStartConsultation = async (leadId: string) => {
    try {
      await api.updateLeadStatus(leadId, {
        status: 'in_progress',
        staff_id: currentStaff?.id
      });
      loadMyLeads();
    } catch (err) {
      console.error('Failed to start consultation:', err);
    }
  };

  const activeLeads = leads.filter(l => ['new', 'acknowledged', 'in_progress'].includes(l.status));
  const completedLeads = leads.filter(l => ['closed_sale', 'closed_no_sale', 'follow_up_needed'].includes(l.status));
  const displayedLeads = viewTab === 'active' ? activeLeads : completedLeads;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Sales Rep Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <img
            src={currentStaff?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
            alt={currentStaff?.name || 'Staff'}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-500 shadow-md"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-serif">{currentStaff?.name || 'Stylist'}</h1>
              <span className="text-[10px] uppercase font-bold bg-brand-500/20 text-brand-300 border border-brand-400/30 px-2 py-0.5 rounded-full">
                {currentStaff?.specialty_category || 'Sales Floor'}
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              Live customer leads assigned to you from front desk reception.
            </p>
          </div>
        </div>

        {/* Quick Presence Status Switcher */}
        <div className="flex items-center space-x-2 bg-stone-800/80 p-1.5 rounded-2xl border border-stone-700">
          <button
            onClick={() => updateStatus('free')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentStaff?.status === 'free'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            🟢 Available
          </button>

          <button
            onClick={() => updateStatus('with_customer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentStaff?.status === 'with_customer'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            🟣 With Customer
          </button>

          <button
            onClick={() => updateStatus('on_break')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentStaff?.status === 'on_break'
                ? 'bg-stone-600 text-white shadow-xs'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            ☕ Break
          </button>
        </div>
      </div>

      {/* View Tabs Bar */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewTab === 'active'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active In-Store Leads ({activeLeads.length})</span>
          </button>

          <button
            onClick={() => setViewTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              viewTab === 'completed'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Handled / Closed History</span>
          </button>
        </div>

        <button
          onClick={loadMyLeads}
          className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
          title="Refresh leads"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Leads List */}
      {displayedLeads.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-900">
            {viewTab === 'active' ? 'No Active Leads Right Now' : 'No Closed Leads Recorded Today'}
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {viewTab === 'active'
              ? 'When the receptionist searches a phone number and assigns a walk-in, your phone/tablet will chime and the customer profile will appear here instantly.'
              : 'Completed and closed consultations will be summarized here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedLeads.map(lead => {
            const isVip = lead.customer_tags && lead.customer_tags.includes('VIP');

            const statusColors: Record<string, { bg: string; text: string; label: string }> = {
              new: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-900', label: '⚡ New Assignment' },
              acknowledged: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-900', label: 'Approaching Customer' },
              in_progress: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-900', label: 'Consulting / Fitting' },
              closed_sale: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-900', label: '🎉 Sale Completed' },
              closed_no_sale: { bg: 'bg-red-100 border-red-300', text: 'text-red-900', label: 'Closed (No Sale)' },
              follow_up_needed: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-900', label: 'Follow-up Scheduled' }
            };

            const statusInfo = statusColors[lead.status] || statusColors.new;

            return (
              <div
                key={lead.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-stone-200 hover:border-brand-400 shadow-sm transition-all space-y-4"
              >
                {/* Top Bar: Customer Info + Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-800 font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
                      {lead.customer_name?.charAt(0) || 'C'}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-bold text-stone-900">{lead.customer_name}</h3>
                        {isVip && (
                          <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                            ⭐ VIP
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.text}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
                        <span className="font-mono">+91 {lead.customer_phone}</span>
                        <span>•</span>
                        <span className="font-semibold text-brand-700">
                          Lifetime Spend: ₹{(lead.customer_spend || 0).toLocaleString('en-IN')}
                        </span>
                        <span>•</span>
                        <span>Assigned by {lead.assigned_by_name || 'Reception'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 360 Profile Shortcut */}
                  <button
                    onClick={() => onOpenCustomerProfile(lead.customer_id)}
                    className="self-start sm:self-auto text-xs font-bold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3.5 py-2 rounded-xl border border-brand-200 transition-colors flex items-center space-x-1.5"
                  >
                    <span>View Full 360° Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Walk-in Intent / Pitch Context */}
                {lead.walk_in_intent && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5">
                    <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Today's Shopping Intent:</span>
                    </div>
                    <p className="text-xs font-semibold text-amber-950 mt-0.5">
                      "{lead.walk_in_intent}"
                    </p>
                  </div>
                )}

                {/* Past Purchase & Sizes Context */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  
                  {/* Last Purchase */}
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                      <ShoppingBag className="w-3 h-3 text-stone-500" />
                      <span>Past Purchase Context</span>
                    </div>
                    {lead.lastPurchase ? (
                      <div>
                        <div className="font-semibold text-stone-900">{lead.lastPurchase.item_name}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5 flex items-center justify-between">
                          <span>{lead.lastPurchase.category} ({lead.lastPurchase.size || 'Free Size'})</span>
                          <span className="font-bold text-brand-700">₹{lead.lastPurchase.final_amount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-stone-400 italic">First-time visitor / No past bills</div>
                    )}
                  </div>

                  {/* Known Preferences */}
                  <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                      <Tag className="w-3 h-3 text-stone-500" />
                      <span>Stated Preferences / Sizes</span>
                    </div>
                    {lead.preferences && lead.preferences.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lead.preferences.slice(0, 4).map((p: any, i: number) => (
                          <span key={i} className="text-[10px] bg-white border border-stone-200 font-medium px-2 py-0.5 rounded-md text-stone-800">
                            {p.value}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-stone-400 italic">No preferences tagged yet</div>
                    )}
                  </div>

                </div>

                {/* Action Workflow Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  
                  {/* Left Action: Quick Preference Tagger */}
                  <button
                    onClick={() => setSelectedLeadForTagger(lead)}
                    className="text-xs font-bold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3.5 py-2 rounded-xl transition-colors flex items-center space-x-1.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-brand-600" />
                    <span>Quick Update Style Tags (30s)</span>
                  </button>

                  {/* Right Actions: Workflow Stepper */}
                  <div className="flex items-center space-x-2">
                    {lead.status === 'new' && (
                      <button
                        onClick={() => handleAcknowledge(lead.id)}
                        className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>Acknowledge Lead</span>
                      </button>
                    )}

                    {lead.status === 'acknowledged' && (
                      <button
                        onClick={() => handleStartConsultation(lead.id)}
                        className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
                      >
                        <span>Start In-Store Pitch / Fitting</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {['new', 'acknowledged', 'in_progress'].includes(lead.status) && (
                      <button
                        onClick={() => setSelectedLeadForClose(lead)}
                        className="bg-stone-900 hover:bg-stone-800 active:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors flex items-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Close Lead</span>
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Quick Preference Tagger Modal */}
      {selectedLeadForTagger && (
        <QuickPreferenceTagger
          customerId={selectedLeadForTagger.customer_id}
          customerName={selectedLeadForTagger.customer_name || 'Customer'}
          isOpen={true}
          onClose={() => setSelectedLeadForTagger(null)}
          onPreferencesUpdated={() => loadMyLeads()}
        />
      )}

      {/* Close Lead Modal */}
      {selectedLeadForClose && (
        <CloseLeadModal
          lead={selectedLeadForClose}
          isOpen={true}
          onClose={() => setSelectedLeadForClose(null)}
          onLeadClosed={() => loadMyLeads()}
        />
      )}

    </div>
  );
};
