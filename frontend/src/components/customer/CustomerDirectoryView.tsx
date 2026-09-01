import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { api } from '../../services/api';
import { Search, UserPlus, Phone, ShoppingBag, Sparkles, Filter, ArrowRight, User } from 'lucide-react';

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      // If search query, use search; else fetch with default prefix
      const res = await api.searchCustomers(searchQuery || '9');
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

  const allTags = ['all', 'VIP', 'Wedding Shopper', 'First Time Shopper', 'Handloom Enthusiast', 'Formal Wear'];

  const filteredCustomers = customers.filter(c => {
    if (selectedTag === 'all') return true;
    return c.tags && c.tags.includes(selectedTag);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-serif text-stone-900">Customer 360° Directory</h1>
          <p className="text-xs text-stone-500">
            Search, filter, and inspect detailed profiles, sizes, and past purchases across all store locations.
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
            const isVip = customer.tags && customer.tags.includes('VIP');

            return (
              <div
                key={customer.id}
                onClick={() => onOpenCustomerProfile(customer.id)}
                className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-brand-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Top line: Name + VIP tag */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 font-bold flex items-center justify-center group-hover:bg-brand-100 group-hover:text-brand-800 transition-colors">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-stone-900 group-hover:text-brand-900">
                          {customer.name}
                        </h3>
                        <div className="text-xs font-mono text-stone-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>+91 {customer.phone_number}</span>
                        </div>
                      </div>
                    </div>

                    {isVip && (
                      <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                        ⭐ VIP
                      </span>
                    )}
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
                  {customer.tags && customer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {customer.tags.map((t, idx) => (
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

    </div>
  );
};
