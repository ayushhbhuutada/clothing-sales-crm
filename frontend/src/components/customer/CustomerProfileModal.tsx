import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ShoppingBag,
  Clock,
  Tag,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ThumbsDown,
  TrendingUp,
  CheckCircle,
  Building,
  AlertTriangle
} from 'lucide-react';
import { CustomerProfileResponse, api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Preference, Purchase } from '../../types';

interface CustomerProfileModalProps {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLeadAssign: (customer: any) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customerId,
  isOpen,
  onClose,
  onOpenLeadAssign
}) => {
  const { currentStaff } = useAuth();
  const [profile, setProfile] = useState<CustomerProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'preferences' | 'purchases' | 'activity' | 'notes'>('preferences');
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick preference addition state
  const [isAddingPref, setIsAddingPref] = useState(false);
  const [newPrefType, setNewPrefType] = useState<string>('top_size');
  const [newPrefValue, setNewPrefValue] = useState<string>('');

  // Quick style note addition state
  const [newNote, setNewNote] = useState<string>('');

  const loadProfile = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const data = await api.getCustomerProfile(customerId);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      loadProfile();
    }
  }, [isOpen, customerId]);

  if (!isOpen || !customerId) return null;

  const handleAddPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefValue.trim() || !profile) return;
    try {
      await api.addPreference(profile.id, {
        type: newPrefType,
        value: newPrefValue.trim(),
        staff_id: currentStaff?.id
      });
      setNewPrefValue('');
      setIsAddingPref(false);
      loadProfile();
    } catch (err) {
      console.error('Failed to add preference:', err);
    }
  };

  const handleDeletePreference = async (prefId: string) => {
    if (!profile) return;
    try {
      await api.deletePreference(profile.id, prefId);
      loadProfile();
    } catch (err) {
      console.error('Failed to delete preference:', err);
    }
  };

  const handleAddStyleNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !profile) return;
    try {
      await api.addPreference(profile.id, {
        type: 'style_note',
        value: newNote.trim(),
        staff_id: currentStaff?.id
      });
      setNewNote('');
      loadProfile();
    } catch (err) {
      console.error('Failed to add style note:', err);
    }
  };

  const handleLogWalkin = async () => {
    if (!profile) return;
    try {
      await api.logVisit(profile.id, {
        visit_type: 'walk_in',
        handled_by_staff_id: currentStaff?.id,
        notes: 'In-store browsing logged via reception'
      });
      loadProfile();
    } catch (err) {
      console.error('Failed to log walk-in:', err);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!profile) return;
    setIsDeleting(true);
    try {
      await api.deleteCustomer(profile.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      alert(`Failed to delete customer: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-full sm:h-auto max-h-[100dvh] sm:max-h-[92vh] rounded-none sm:rounded-3xl shadow-2xl border-0 sm:border border-stone-200 overflow-hidden flex flex-col">
        
        {/* Top Sticky Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-bold text-base sm:text-lg text-white shadow-md shrink-0">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h2 className="text-base sm:text-lg font-bold font-serif truncate">{profile?.name || 'Customer Profile'}</h2>
                {profile?.tags && profile.tags.includes('VIP') && (
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                    ⭐ VIP
                  </span>
                )}
                {profile?.is_imported_placeholder === 1 && (
                  <span className="text-[9px] sm:text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                    POS
                  </span>
                )}
              </div>
              <div className="text-[11px] sm:text-xs text-stone-300 flex items-center space-x-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                <span className="font-mono">+91 {profile?.phone_number}</span>
                {profile?.branch_name && (
                  <>
                    <span>•</span>
                    <span className="truncate hidden sm:inline">{profile.branch_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {profile && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLeadAssign(profile);
                }}
                className="bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-[11px] sm:text-xs font-bold px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-md transition-colors flex items-center space-x-1 sm:space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Assign to Sales Rep</span>
                <span className="sm:hidden">Assign</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1.5 sm:p-2 rounded-xl hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading || !profile ? (
          <div className="p-12 text-center text-stone-400 text-sm">Loading complete customer record...</div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            
            {/* Quick Metrics Header Card */}
            <div className="p-3.5 sm:p-6 bg-stone-50/70 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Lifetime Spend (LTV)</div>
                <div className="text-lg font-bold text-stone-900 mt-1 font-serif">
                  ₹{(profile.total_spend || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  <span>{profile.purchases?.length || 0} total invoices</span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Store Visits</div>
                <div className="text-lg font-bold text-stone-900 mt-1">
                  {profile.visit_count || 1} Visits
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  Last: {profile.last_visit_date || 'Recent'}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Customer Since</div>
                <div className="text-lg font-bold text-stone-900 mt-1">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recent'}
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  Source: {profile.referred_by || 'Walk-in'}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs">
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Demographics</div>
                <div className="text-sm font-bold text-stone-900 mt-1">
                  {profile.gender || 'Not specified'}
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">
                  {profile.dob ? `🎂 Birthday: ${profile.dob}` : 'Birthday not recorded'}
                </div>
              </div>
            </div>

            {/* Highlighted Last Purchase Card (Section 4.2 Spec) */}
            {profile.lastPurchase && (
              <div className="p-6 bg-amber-50/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <span>Last Purchase Summary (From Billing System)</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                    {profile.lastPurchase.invoice_number}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">{profile.lastPurchase.item_name}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
                      <span>Category: <strong className="text-stone-700">{profile.lastPurchase.category}</strong></span>
                      {profile.lastPurchase.size && <span>• Size: <strong className="text-stone-700">{profile.lastPurchase.size}</strong></span>}
                      {profile.lastPurchase.color && <span>• Color: <strong className="text-stone-700">{profile.lastPurchase.color}</strong></span>}
                      <span>• Date: {profile.lastPurchase.purchase_date}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-brand-700">₹{profile.lastPurchase.final_amount.toLocaleString('en-IN')}</div>
                    {profile.lastPurchase.sold_by_staff_name && (
                      <div className="text-[10px] text-stone-400">Sold by {profile.lastPurchase.sold_by_staff_name}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tabs Navigation */}
            <div className="px-6 border-b border-stone-200 flex space-x-6 text-xs font-bold">
              <button
                onClick={() => setActiveTab('preferences')}
                className={`py-3.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'preferences'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Preferences & Style Profile</span>
              </button>

              <button
                onClick={() => setActiveTab('purchases')}
                className={`py-3.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'purchases'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Full Purchase Timeline ({profile.purchases?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('activity')}
                className={`py-3.5 border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'activity'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-stone-500 hover:text-stone-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Visits & Activity Trail</span>
              </button>
            </div>

            {/* TAB 1: PREFERENCES & STYLE PROFILE (Section 4.5 Spec) */}
            {activeTab === 'preferences' && (
              <div className="p-6 space-y-6">
                
                {/* Structured Preference Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Sizes Panel */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Preferred Sizes
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-stone-400 text-[11px]">Tops / Kurtis:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {profile.prefSummary.top_sizes.length > 0 ? (
                            profile.prefSummary.top_sizes.map((s, i) => (
                              <span key={i} className="bg-white border border-stone-300 font-bold text-stone-800 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-stone-400 italic">Not set</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-stone-400 text-[11px]">Bottoms / Pants:</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {profile.prefSummary.bottom_sizes.length > 0 ? (
                            profile.prefSummary.bottom_sizes.map((s, i) => (
                              <span key={i} className="bg-white border border-stone-300 font-bold text-stone-800 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-stone-400 italic">Not set</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Colors & Fabrics */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Favorite Colors & Fabrics
                    </div>
                    <div>
                      <span className="text-stone-400 text-[11px]">Colors:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {profile.prefSummary.colors.length > 0 ? (
                          profile.prefSummary.colors.map((c, i) => (
                            <span key={i} className="bg-white border border-stone-300 font-medium text-stone-800 px-2 py-0.5 rounded-md text-xs shadow-2xs flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full bg-brand-500" />
                              <span>{c}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 italic text-xs">Not set</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[11px]">Fabrics:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {profile.prefSummary.fabrics.length > 0 ? (
                          profile.prefSummary.fabrics.map((f, i) => (
                            <span key={i} className="bg-white border border-stone-300 font-medium text-stone-800 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                              {f}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 italic text-xs">Not set</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Categories & Budget */}
                  <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      Categories & Budget Range
                    </div>
                    <div>
                      <span className="text-stone-400 text-[11px]">Favorite Categories:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {profile.prefSummary.categories.length > 0 ? (
                          profile.prefSummary.categories.map((cat, i) => (
                            <span key={i} className="bg-white border border-stone-300 font-medium text-stone-800 px-2 py-0.5 rounded-md text-xs shadow-2xs">
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 italic text-xs">Not set</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[11px]">Comfort Budget:</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {profile.prefSummary.budgets.length > 0 ? (
                          profile.prefSummary.budgets.map((b, i) => (
                            <span key={i} className="bg-brand-50 border border-brand-200 font-bold text-brand-900 px-2 py-0.5 rounded-md text-xs">
                              {b}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 italic text-xs">Not set</span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Freeform Style Notes & Observations (Spec 4.5) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <MessageSquare className="w-4 h-4 text-brand-600" />
                      <span>Free-text Style Notes & Preferences (Accumulative History)</span>
                    </div>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddStyleNote} className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add in-store observation, fitting note, or occasion detail..."
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
                    />
                    <button
                      type="submit"
                      className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0"
                    >
                      Add Note
                    </button>
                  </form>

                  {/* Notes List */}
                  <div className="space-y-2">
                    {profile.prefSummary.style_notes.length === 0 ? (
                      <div className="p-4 bg-stone-50 rounded-xl text-center text-xs text-stone-400 italic">
                        No freeform style notes recorded yet. Add one above after consultation.
                      </div>
                    ) : (
                      profile.prefSummary.style_notes.map((note) => (
                        <div key={note.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex items-start justify-between">
                          <div>
                            <p className="font-medium text-stone-800">"{note.value}"</p>
                            <div className="text-[10px] text-stone-400 mt-1 flex items-center space-x-2">
                              <span>Recorded by {note.staff_name || 'Staff'}</span>
                              <span>•</span>
                              <span>{new Date(note.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeletePreference(note.id)}
                            className="text-stone-400 hover:text-red-600 p-1 transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dislikes & Returns */}
                {profile.prefSummary.dislikes.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center space-x-1.5">
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                      <span>Customer Dislikes / Return Reasons</span>
                    </div>
                    <div className="space-y-1.5">
                      {profile.prefSummary.dislikes.map((dislike) => (
                        <div key={dislike.id} className="p-2.5 bg-red-50/60 border border-red-200 rounded-xl text-xs flex items-center justify-between text-red-900 font-medium">
                          <span>{dislike.value}</span>
                          <button
                            onClick={() => handleDeletePreference(dislike.id)}
                            className="text-red-400 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Add Preference Tag Form */}
                <div className="pt-2 border-t border-stone-100">
                  {!isAddingPref ? (
                    <button
                      onClick={() => setIsAddingPref(true)}
                      className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Tagged Preference (Size, Color, Fabric, Brand, Budget)</span>
                    </button>
                  ) : (
                    <form onSubmit={handleAddPreference} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-wrap gap-2 items-center">
                      <select
                        value={newPrefType}
                        onChange={(e) => setNewPrefType(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                      >
                        <option value="top_size">Top Size</option>
                        <option value="bottom_size">Bottom Size</option>
                        <option value="footwear_size">Footwear Size</option>
                        <option value="color">Favorite Color</option>
                        <option value="fabric">Preferred Fabric</option>
                        <option value="category">Category</option>
                        <option value="brand">Brand</option>
                        <option value="budget">Budget Comfort</option>
                        <option value="dislike">Dislike / Avoid</option>
                      </select>

                      <input
                        type="text"
                        required
                        value={newPrefValue}
                        onChange={(e) => setNewPrefValue(e.target.value)}
                        placeholder="e.g. Pure Silk, Pastel Mint, XL/42..."
                        className="flex-1 min-w-[160px] px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                      />

                      <button
                        type="submit"
                        className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingPref(false)}
                        className="text-stone-500 hover:text-stone-700 text-xs px-2 py-1.5"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: FULL PURCHASE TIMELINE (Section 4.4 Spec) */}
            {activeTab === 'purchases' && (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 gap-1">
                  <span>Showing {profile.purchases?.length || 0} billing transactions</span>
                  <span className="font-bold text-stone-900">Total Billed: ₹{(profile.total_spend || 0).toLocaleString('en-IN')}</span>
                </div>

                {profile.purchases && profile.purchases.length > 0 ? (
                  <>
                    {/* Mobile Purchase Cards (<sm) */}
                    <div className="sm:hidden space-y-3">
                      {profile.purchases.map((p) => (
                        <div key={p.id} className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-bold text-stone-900 text-sm">{p.item_name}</div>
                              <div className="text-[11px] text-stone-500">{p.category || 'Clothing'}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-brand-700 text-sm font-serif">₹{p.final_amount.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] font-mono text-stone-400">Qty: {p.quantity}</div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-200/60 text-[11px]">
                            {p.size && (
                              <span className="bg-white px-2 py-0.5 rounded-md border border-stone-200 font-semibold text-stone-700">
                                Size: {p.size}
                              </span>
                            )}
                            {p.color && (
                              <span className="bg-white px-2 py-0.5 rounded-md border border-stone-200 text-stone-600">
                                {p.color}
                              </span>
                            )}
                            <span className="font-mono text-stone-400 ml-auto text-[10px]">
                              {p.purchase_date} • {p.invoice_number}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Purchase Table (>=sm) */}
                    <div className="hidden sm:block overflow-x-auto rounded-2xl border border-stone-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Invoice #</th>
                            <th className="py-3 px-4">Item & Category</th>
                            <th className="py-3 px-4">Size & Color</th>
                            <th className="py-3 px-4 text-right">Qty</th>
                            <th className="py-3 px-4 text-right">Net Amount</th>
                            <th className="py-3 px-4">Sold By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {profile.purchases.map((p) => (
                            <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                              <td className="py-3 px-4 font-mono text-stone-600 whitespace-nowrap">{p.purchase_date}</td>
                              <td className="py-3 px-4 font-mono font-bold text-stone-900">{p.invoice_number}</td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-stone-900">{p.item_name}</div>
                                <div className="text-[10px] text-stone-400">{p.category}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="text-stone-700">{p.size || 'Free Size'}</div>
                                <div className="text-[10px] text-stone-400">{p.color || '-'}</div>
                              </td>
                              <td className="py-3 px-4 text-right font-medium text-stone-700">{p.quantity}</td>
                              <td className="py-3 px-4 text-right font-bold text-brand-700">₹{p.final_amount.toLocaleString('en-IN')}</td>
                              <td className="py-3 px-4 text-stone-500">{p.sold_by_staff_name || 'Store'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="p-8 bg-stone-50 rounded-2xl text-center text-xs text-stone-400">
                    No past purchases linked yet. Purchases are automatically synced when billing Excel/CSV files are uploaded.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: VISITS & ACTIVITY TRAIL (Section 4.8 Spec) */}
            {activeTab === 'activity' && (
              <div className="p-6 space-y-4">
                
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    In-Store Visits & Consultation Trail
                  </h4>
                  <button
                    onClick={handleLogWalkin}
                    className="text-xs font-semibold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors"
                  >
                    + Log Walk-in Visit Today
                  </button>
                </div>

                <div className="space-y-3">
                  {profile.activityLogs && profile.activityLogs.length > 0 ? (
                    profile.activityLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex items-start space-x-3">
                        <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {log.staff_name ? log.staff_name.charAt(0) : 'S'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-900">{log.description}</span>
                            <span className="text-[10px] text-stone-400">
                              {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-500 mt-0.5">
                            Staff: {log.staff_name || 'System'} • Event: {log.action_type}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-stone-400">No activity logs recorded.</div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Customer</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-700 shadow-2xs transition-colors"
          >
            Close Profile
          </button>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && profile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-stone-900">Delete {profile.name}'s Profile?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to permanently remove this customer (+91 {profile.phone_number}) and all their purchases, visits, and size preferences?
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md shadow-rose-900/20 transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
