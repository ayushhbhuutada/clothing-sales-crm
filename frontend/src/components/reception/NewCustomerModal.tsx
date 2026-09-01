import React, { useState, useEffect } from 'react';
import { X, UserPlus, Phone, User, Mail, Calendar, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  onCustomerCreated: (customerId: string, autoAssign: boolean) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  initialPhone = '',
  onCustomerCreated
}) => {
  const { currentStaff, currentBranch } = useAuth();

  const [formData, setFormData] = useState({
    phone_number: '',
    name: '',
    email: '',
    gender: 'Female',
    dob: '',
    anniversary: '',
    referred_by: 'Walk-in',
    walk_in_intent: 'Looking for Festive / Party Wear',
    initial_note: '',
    tags: ['First Time Shopper']
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPhone) {
      setFormData(prev => ({ ...prev, phone_number: initialPhone }));
    }
  }, [initialPhone]);

  if (!isOpen) return null;

  const intentOptions = [
    'Looking for Bridal / Wedding Wear',
    'Festive / Sangeet / Party Wear',
    'Casual Kurtis & Daily Wear',
    'Western Co-ords & Dresses',
    'Menswear & Sherwanis',
    'Saw Instagram Ad / Promotion',
    'Gift Shopping / General Browsing'
  ];

  const handleSubmit = async (e: React.FormEvent, autoAssign = true) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.createCustomer({
        ...formData,
        branch_id: currentBranch?.id || 'branch-1',
        staff_id: currentStaff?.id
      });

      if (res.success && res.customerId) {
        onCustomerCreated(res.customerId, autoAssign);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Register New Customer</h3>
              <p className="text-[11px] text-stone-400">Front desk instant registration & lead handoff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={(e) => handleSubmit(e, true)} className="p-6 overflow-y-auto space-y-4">
          
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Primary Details (Phone & Name) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="10-digit mobile"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Customer Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
          </div>

          {/* Walk-in Shopping Intent */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Walk-in Shopping Intent / Looking For:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {intentOptions.map(opt => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setFormData({ ...formData, walk_in_intent: opt })}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all text-left ${
                    formData.walk_in_intent === opt
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-2xs'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Gender & Referral Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Referred By</label>
              <select
                value={formData.referred_by}
                onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
              >
                <option value="Walk-in">Direct Walk-in</option>
                <option value="Instagram Ad">Instagram Ad</option>
                <option value="Friend / Family">Friend / Family</option>
                <option value="Google Search">Google Maps / Search</option>
                <option value="Influencer">Influencer Campaign</option>
              </select>
            </div>
          </div>

          {/* Email & Dates (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-stone-600 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@email.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Date of Birth</label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Anniversary</label>
              <input
                type="date"
                value={formData.anniversary}
                onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
              />
            </div>
          </div>

          {/* Initial Observation / Note */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Initial Receptionist Observation / Style Note
            </label>
            <input
              type="text"
              value={formData.initial_note}
              onChange={(e) => setFormData({ ...formData, initial_note: e.target.value })}
              placeholder="e.g. Came with family, interested in pastel lehengas or lightweight silk"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={(e) => handleSubmit(e, false)}
              className="py-2.5 px-4 rounded-xl border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 text-xs font-bold transition-colors"
            >
              Save Profile Only
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-xs font-bold shadow-md shadow-brand-900/10 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <span>Save & Assign Sales Rep</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
