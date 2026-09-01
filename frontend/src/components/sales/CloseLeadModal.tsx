import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Calendar, Sparkles, ShoppingBag, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Lead } from '../../types';

interface CloseLeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadClosed: () => void;
}

export const CloseLeadModal: React.FC<CloseLeadModalProps> = ({
  lead,
  isOpen,
  onClose,
  onLeadClosed
}) => {
  const { currentStaff } = useAuth();
  const [outcomeType, setOutcomeType] = useState<'closed_sale' | 'closed_no_sale' | 'follow_up_needed'>('closed_sale');
  
  // Sale details
  const [invoiceNo, setInvoiceNo] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  
  // No sale details
  const [noSaleReason, setNoSaleReason] = useState('just_browsing');
  
  // Follow up details
  const [followUpDate, setFollowUpDate] = useState('');
  
  // General notes
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !lead) return null;

  const noSaleReasons = [
    { value: 'price_high', label: 'Price higher than customer budget' },
    { value: 'size_unavailable', label: 'Required size out of stock / unavailable' },
    { value: 'color_out_of_stock', label: 'Color or shade unavailable' },
    { value: 'just_browsing', label: 'Just browsing / exploring options' },
    { value: 'style_mismatch', label: 'Style / cut did not match customer taste' },
    { value: 'alteration_delay', label: 'Alteration / delivery timeline too long' },
    { value: 'other', label: 'Other reason' }
  ];

  const handleCloseLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.closeLead(lead.id, {
        status: outcomeType,
        outcome_notes: outcomeNotes,
        no_sale_reason: outcomeType === 'closed_no_sale' ? noSaleReason : undefined,
        linked_invoice_number: outcomeType === 'closed_sale' ? invoiceNo : undefined,
        sale_amount: outcomeType === 'closed_sale' && saleAmount ? parseFloat(saleAmount) : undefined,
        follow_up_date: outcomeType === 'follow_up_needed' ? followUpDate : undefined,
        staff_id: currentStaff?.id
      });

      if (outcomeType === 'closed_sale') {
        // Trigger celebratory confetti on screen!
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
      }

      onLeadClosed();
      onClose();
    } catch (err) {
      console.error('Failed to close lead:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Close In-Store Lead</h3>
            <p className="text-[11px] text-stone-300">Customer: <strong className="text-white">{lead.customer_name}</strong></p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCloseLead} className="p-6 overflow-y-auto space-y-4">
          
          {/* Outcome Type Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
              Select Lead Outcome:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setOutcomeType('closed_sale')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 ${
                  outcomeType === 'closed_sale'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <CheckCircle2 className={`w-5 h-5 ${outcomeType === 'closed_sale' ? 'text-emerald-600' : 'text-stone-400'}`} />
                <span className="text-xs">Sale Made</span>
              </button>

              <button
                type="button"
                onClick={() => setOutcomeType('closed_no_sale')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 ${
                  outcomeType === 'closed_no_sale'
                    ? 'bg-red-50 border-red-500 text-red-900 font-bold ring-2 ring-red-500/20 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <XCircle className={`w-5 h-5 ${outcomeType === 'closed_no_sale' ? 'text-red-600' : 'text-stone-400'}`} />
                <span className="text-xs">No Sale</span>
              </button>

              <button
                type="button"
                onClick={() => setOutcomeType('follow_up_needed')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 ${
                  outcomeType === 'follow_up_needed'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Calendar className={`w-5 h-5 ${outcomeType === 'follow_up_needed' ? 'text-amber-600' : 'text-stone-400'}`} />
                <span className="text-xs">Follow-up</span>
              </button>
            </div>
          </div>

          {/* Conditional Fields based on Outcome */}
          {outcomeType === 'closed_sale' && (
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-3">
              <div className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>Link Generated Invoice / Bill Details</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">Invoice / Bill #</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-2026-0922"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-900 mb-1">Total Bill Amount (₹)</label>
                  <input
                    type="number"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    placeholder="e.g. 24500"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {outcomeType === 'closed_no_sale' && (
            <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200 space-y-3">
              <label className="block text-xs font-bold text-red-900">
                Reason for No Sale:
              </label>
              <select
                value={noSaleReason}
                onChange={(e) => setNoSaleReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-red-200 bg-white font-medium text-stone-800"
              >
                {noSaleReasons.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {outcomeType === 'follow_up_needed' && (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
              <label className="block text-xs font-bold text-amber-900">
                Follow-up Callback / Visit Reminder Date:
              </label>
              <input
                type="date"
                required
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 bg-white"
              />
            </div>
          )}

          {/* Outcome Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Final Interaction Summary / Stylist Notes:
            </label>
            <textarea
              rows={3}
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="e.g. Client loved the raw silk kurti, decided to purchase along with matching organza dupatta."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center space-x-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold shadow-md transition-colors flex items-center justify-center space-x-1.5"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Confirm & Complete Lead</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
