import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Search, UserPlus, Phone, Sparkles, Filter, ArrowRight, User, Trash2, AlertTriangle, X, Check } from 'lucide-react';

interface CustomerDirectoryViewProps {
  onOpenCustomerProfile: (customerId: string) => void;
  onOpenNewCustomer: (prefillPhone?: string) => void;
  onOpenLeadAssign: (customer: Customer) => void;
}

export const CustomerDirectoryView: React.FC<CustomerDirectoryViewProps> = ({
  onOpenCustomerProfile,
  onOpenNewCustomer,
  onOpenLeadAssign
}) => {
  const { isManager } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.searchCustomers(searchQuery.trim());
      setCustomers(res);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteCustomer(customerToDelete.id);
      setDeleteSuccessMsg(`Deleted ${customerToDelete.name}'s profile & purchase history.`);
      setCustomerToDelete(null);
      await loadCustomers();
      setTimeout(() => setDeleteSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Failed to delete customer: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const allTags = ['all', 'VIP', 'Wedding Shopper', 'First Time Shopper', 'Handloom Enthusiast', 'Formal Wear', 'Created via Import'];

  const filteredCustomers = customers.filter(c => {
    if (selectedTag === 'all') return true;
    if (!c.tags) return false;
    return Array.isArray(c.tags) ? c.tags.includes(selectedTag) : String(c.tags).includes(selectedTag);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Toast Banner on successful delete */}
      {deleteSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{deleteSuccessMsg}</span>
          </div>
          <button onClick={() => setDeleteSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-serif text-stone-900">Customer 360° Directory</h1>
          <p className="text-xs text-stone-500">
            Search, filter, manage profiles, view purchase histories, or delete customer records.
          </p>
        </div>

        <button
          onClick={() => onOpenNewCustomer('')}
          className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-brand-900/10 transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Register New Customer</span>
        </button>
      </div>

      {/* Search & Tag Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer phone number or name..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-stone-400 flex items-center font-medium mr-1">
            <Filter className="w-3 h-3 mr-1" /> Tags:
          </span>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedTag === tag
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tag === 'all' ? 'All Customers' : tag}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-400">Searching customer database...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">No Customers Found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try a different search query or register a new customer profile.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const isVip = customer.tags && (Array.isArray(customer.tags) ? customer.tags.includes('VIP') : String(customer.tags).includes('VIP'));

            return (
              <div
                key={customer.id}
                onClick={() => onOpenCustomerProfile(customer.id)}
                className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-brand-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group relative"
              >
                <div>
                  {/* Top line: Name + VIP tag + Delete Button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-bold flex items-center justify-center group-hover:bg-brand-100 group-hover:text-brand-800 transition-colors shrink-0">
                        {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-stone-900 group-hover:text-brand-900 truncate">
                          {customer.name}
                        </h3>
                        <div className="text-xs font-mono text-stone-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>+91 {customer.phone_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {isVip && (
                        <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                          ⭐ VIP
                        </span>
                      )}
                      {isManager && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomerToDelete(customer);
                          }}
                          title="Delete customer and data"
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LTV & Visits */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-100 text-xs">
                    <div className="bg-stone-50 p-2 rounded-xl">
                      <div className="text-[10px] text-stone-400 font-medium">Lifetime Value</div>
                      <div className="font-bold text-stone-900 font-serif mt-0.5">
                        ₹{(customer.total_spend || 0).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="bg-stone-50 p-2 rounded-xl">
                      <div className="text-[10px] text-stone-400 font-medium">Total Visits</div>
                      <div className="font-bold text-stone-900 mt-0.5">
                        {customer.visit_count || 1} Visits
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {customer.tags && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(Array.isArray(customer.tags) ? customer.tags : [String(customer.tags)]).map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Last Purchase Snippet */}
                  {customer.lastPurchase && (
                    <div className="text-[11px] text-stone-600 bg-brand-50/50 p-2.5 rounded-xl border border-brand-100 mt-3">
                      <div className="font-semibold text-brand-900 line-clamp-1">
                        Last: {customer.lastPurchase.item_name}
                      </div>
                      <div className="text-[10px] text-stone-500 mt-0.5 flex items-center justify-between">
                        <span>{customer.lastPurchase.category}</span>
                        <span className="font-bold text-brand-700">₹{customer.lastPurchase.final_amount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLeadAssign(customer);
                    }}
                    className="text-xs font-bold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Assign Rep</span>
                  </button>

                  <span className="text-xs font-semibold text-stone-400 group-hover:text-brand-600 flex items-center space-x-1">
                    <span>View 360°</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-5 animate-in zoom-in-95">
            
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeleting}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-stone-900">Delete Customer & Data?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Are you sure you want to permanently delete <strong className="text-stone-800">{customerToDelete.name}</strong> (+91 {customerToDelete.phone_number})?
              </p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 mt-3 space-y-1">
                <div className="font-bold">⚠️ This will delete:</div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                  <li>Customer profile and personal details</li>
                  <li>All past purchase records & bills</li>
                  <li>Recorded style sizes & preferences</li>
                  <li>Assigned sales leads & walk-in history</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
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
