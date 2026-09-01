import React, { useState, useEffect } from 'react';
import { X, Sparkles, User, CheckCircle, Clock, AlertCircle, Phone, ArrowRight } from 'lucide-react';
import { Customer, Staff, StaffStatus } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface LeadAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onLeadAssigned: () => void;
}

export const LeadAssignModal: React.FC<LeadAssignModalProps> = ({
  isOpen,
  onClose,
  customer,
  onLeadAssigned
}) => {
  const { currentStaff, currentBranch, allStaff } = useAuth();

  const [salesReps, setSalesReps] = useState<Staff[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [recommendedRep, setRecommendedRep] = useState<Staff | null>(null);
  const [recommendationReason, setRecommendationReason] = useState<string>('');
  const [intent, setIntent] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      loadRecommendationAndReps();
      setIntent('Customer walk-in consultation');
    }
  }, [isOpen, customer]);

  const loadRecommendationAndReps = async () => {
    if (!customer) return;
    setLoading(true);
    setError(null);
    try {
      const rec = await api.getRecommendedRep(customer.id, currentBranch?.id);
      setSalesReps(rec.availableReps || []);
      if (rec.recommendedRep) {
        setRecommendedRep(rec.recommendedRep);
        setSelectedRepId(rec.recommendedRep.id);
        setRecommendationReason(rec.reason);
      } else if (rec.availableReps && rec.availableReps.length > 0) {
        setSelectedRepId(rec.availableReps[0].id);
      }
    } catch (err: any) {
      console.error('Failed to get recommendation:', err);
      // Fallback: filter from allStaff
      const reps = allStaff.filter(s => s.role === 'sales_rep');
      setSalesReps(reps);
      if (reps.length > 0) setSelectedRepId(reps[0].id);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  const handleAssign = async () => {
    if (!selectedRepId) {
      setError('Please select a sales representative');
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      await api.assignLead({
        customer_id: customer.id,
        assigned_to_staff_id: selectedRepId,
        assigned_by_staff_id: currentStaff?.id || 'staff-1',
        branch_id: currentBranch?.id || customer.branch_id || 'branch-1',
        walk_in_intent: intent,
        notes: notes || undefined
      });

      onLeadAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch lead');
    } finally {
      setAssigning(false);
    }
  };

  const statusColors: Record<StaffStatus, { bg: string; dot: string; label: string }> = {
    free: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Available' },
    busy: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Busy' },
    with_customer: { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', label: 'Engaged' },
    on_break: { bg: 'bg-stone-100 text-stone-600 border-stone-300', dot: 'bg-stone-400', label: 'On Break' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-brand-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Assign Lead to Sales Floor</h3>
              <p className="text-[11px] text-brand-100">Live sales representative routing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Customer Summary Card */}
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 font-bold text-base flex items-center justify-center">
                {customer.name.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-sm text-stone-900 flex items-center space-x-1.5">
                  <span>{customer.name}</span>
                  {customer.tags && customer.tags.includes('VIP') && (
                    <span className="text-[9px] uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300">
                      VIP
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 flex items-center space-x-2 mt-0.5">
                  <span className="font-mono">+91 {customer.phone_number}</span>
                  <span>•</span>
                  <span>Spend: ₹{(customer.total_spend || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Recommendation Banner */}
          {recommendedRep && recommendationReason && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-start space-x-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-amber-900">
                  Recommended: {recommendedRep.name}
                </div>
                <div className="text-amber-800 text-[11px] mt-0.5">{recommendationReason}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Available Sales Reps List */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Select Sales Representative on Floor:
            </label>

            {loading ? (
              <div className="py-6 text-center text-xs text-stone-400">Loading available reps...</div>
            ) : salesReps.length === 0 ? (
              <div className="p-4 bg-stone-50 rounded-xl text-center text-xs text-stone-500">
                No sales reps registered for this store branch.
              </div>
            ) : (
              <div className="space-y-2">
                {salesReps.map(rep => {
                  const isSelected = selectedRepId === rep.id;
                  const statusInfo = statusColors[rep.status] || statusColors.free;

                  return (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedRepId(rep.id)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/60 shadow-2xs ring-2 ring-brand-500/20'
                          : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={rep.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
                          alt={rep.name}
                          className="w-10 h-10 rounded-xl object-cover shadow-2xs"
                        />
                        <div>
                          <div className="text-xs font-bold text-stone-900 flex items-center space-x-2">
                            <span>{rep.name}</span>
                            {recommendedRep?.id === rep.id && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300 flex items-center space-x-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>Best Match</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {rep.specialty_category || 'Fashion Stylist'}
                          </div>
                        </div>
                      </div>

                      {/* Status & Load Indicator */}
                      <div className="flex items-center space-x-2 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${statusInfo.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                            <span>{statusInfo.label}</span>
                          </span>
                          <span className="text-[10px] text-stone-400 mt-0.5">
                            {rep.active_leads_count || 0} active lead{(rep.active_leads_count || 0) === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300'}`}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Context / Walk-in Intent */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Customer Shopping Intent / Handoff Note for Rep
            </label>
            <input
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g. Inquiring for silk saree / Sangeet outfit"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Special Instructions (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Escort to VIP trial room #1"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-3 border-t border-stone-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning || !selectedRepId}
              className="flex-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-bold shadow-md shadow-brand-900/10 flex items-center justify-center space-x-2 transition-colors disabled:opacity-60"
            >
              {assigning ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Dispatch Lead Alert</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
