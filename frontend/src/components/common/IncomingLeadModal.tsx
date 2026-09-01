import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { BellRing, User, ShoppingBag, Sparkles, ArrowRight, X, Phone, Tag } from 'lucide-react';
import { api } from '../../services/api';

interface IncomingLeadModalProps {
  onOpenCustomerProfile: (customerId: string) => void;
  onLeadAcknowledged?: () => void;
}

export const IncomingLeadModal: React.FC<IncomingLeadModalProps> = ({
  onOpenCustomerProfile,
  onLeadAcknowledged
}) => {
  const { incomingLeadAlert, dismissLeadAlert } = useNotification();
  const { currentStaff } = useAuth();

  if (!incomingLeadAlert) return null;

  const { customer, walk_in_intent, lastPurchase, topPreferences, leadId, assignedBy } = incomingLeadAlert;

  const handleAcknowledge = async () => {
    try {
      if (leadId) {
        await api.updateLeadStatus(leadId, {
          status: 'acknowledged',
          staff_id: currentStaff?.id
        });
      }
      dismissLeadAlert();
      if (onLeadAcknowledged) onLeadAcknowledged();
      if (customer?.id) onOpenCustomerProfile(customer.id);
    } catch (err) {
      console.error('Failed to acknowledge lead:', err);
      dismissLeadAlert();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/70 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-white w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-brand-500 flex flex-col">
        
        {/* Pulsating Header */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-amber-600 p-4 sm:p-5 text-white flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="flex items-center space-x-3 z-10">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <BellRing className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-amber-200">
                Front Desk Lead Routing
              </div>
              <h2 className="text-base sm:text-lg font-serif font-bold leading-tight">
                New Customer Assigned to You!
              </h2>
            </div>
          </div>
          <button
            onClick={dismissLeadAlert}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Context Summary */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Customer Main Info */}
          <div className="flex items-start justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-stone-900 flex items-center space-x-2">
                <span>{customer.name}</span>
                {customer.tags && customer.tags.includes('VIP') && (
                  <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                    ⭐ VIP Client
                  </span>
                )}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-stone-500 mt-1">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>+91 {customer.phone_number}</span>
                <span>•</span>
                <span>Visits: {customer.visit_count || 1}</span>
                <span>•</span>
                <span className="font-semibold text-stone-700">LTV: ₹{(customer.total_spend || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Walk-in Intent / Pitch Context */}
          {walk_in_intent && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5">
              <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Today's Shopping Intent:</span>
              </div>
              <p className="text-sm font-medium text-amber-950 mt-1">
                "{walk_in_intent}"
              </p>
              <div className="text-[10px] text-amber-700 mt-1">
                Handed off by {assignedBy?.name || 'Reception'}
              </div>
            </div>
          )}

          {/* Quick Context Highlights (Last Purchase + Preferences) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Last Purchase */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                <ShoppingBag className="w-3 h-3 text-stone-500" />
                <span>Last Purchased</span>
              </div>
              {lastPurchase ? (
                <div>
                  <div className="text-xs font-semibold text-stone-800 line-clamp-1">{lastPurchase.item_name}</div>
                  <div className="text-[11px] text-brand-700 font-bold mt-0.5">₹{lastPurchase.final_amount.toLocaleString('en-IN')} ({lastPurchase.purchase_date})</div>
                </div>
              ) : (
                <div className="text-xs text-stone-400 italic">No past bills recorded</div>
              )}
            </div>

            {/* Top Preferences & Sizes */}
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center space-x-1 mb-1">
                <Tag className="w-3 h-3 text-stone-500" />
                <span>Key Preferences</span>
              </div>
              {topPreferences && topPreferences.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {topPreferences.slice(0, 3).map((p: any, idx: number) => (
                    <span key={idx} className="text-[10px] bg-white border border-stone-200 px-1.5 py-0.5 rounded text-stone-700 font-medium">
                      {p.value}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-stone-400 italic">First-time profile</div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={dismissLeadAlert}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleAcknowledge}
              className="flex-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-bold shadow-md shadow-brand-900/10 flex items-center justify-center space-x-2 transition-colors"
            >
              <span>Acknowledge & Approach</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
