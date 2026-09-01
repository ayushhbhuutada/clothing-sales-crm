import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, User, ShoppingBag, UserPlus, ArrowRight, Sparkles, X, Clock } from 'lucide-react';
import { Customer } from '../../types';
import { api } from '../../services/api';

interface PhoneSearchBarProps {
  onSelectCustomer: (customer: Customer) => void;
  onOpenNewCustomer: (prefillPhone: string) => void;
  onQuickAssign: (customer: Customer) => void;
}

export const PhoneSearchBar: React.FC<PhoneSearchBarProps> = ({
  onSelectCustomer,
  onOpenNewCustomer,
  onQuickAssign
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const matches = await api.searchCustomers(query);
        setResults(matches);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150); // 150ms debounce for lightning fast search

    return () => clearTimeout(timer);
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const isNumericOnly = /^\d+$/.test(query.replace(/[^\d]/g, ''));
  const cleanDigits = query.replace(/[^\d]/g, '');

  return (
    <div ref={searchContainerRef} className="relative w-full max-w-3xl mx-auto">
      
      {/* Search Input Bar */}
      <div className="relative flex items-center shadow-lg rounded-2xl bg-white border-2 border-stone-200 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all">
        
        {/* Country Code / Search Icon */}
        <div className="pl-4 pr-2 flex items-center text-stone-400 border-r border-stone-100 space-x-1.5 py-3">
          <Phone className="w-5 h-5 text-brand-600" />
          <span className="text-xs font-semibold text-stone-500 hidden sm:inline">+91</span>
        </div>

        {/* Input Field */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0 || query.length > 0) setIsOpen(true); }}
          placeholder="Type Customer Mobile Number (or Name) to lookup..."
          className="w-full px-4 py-3.5 text-base sm:text-lg text-stone-900 placeholder:text-stone-400 bg-transparent outline-none focus:outline-none ring-0 border-0 focus:ring-0 font-medium"
          autoFocus
        />

        {/* Loading Spinner or Clear Button */}
        <div className="pr-4 flex items-center space-x-2">
          {isLoading && (
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          )}

          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="hidden sm:flex items-center text-[11px] font-semibold text-stone-400 bg-stone-100 px-2 py-1 rounded-md border border-stone-200">
            <Search className="w-3 h-3 mr-1" /> Fast Lookup
          </div>
        </div>
      </div>

      {/* Autocomplete Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-stone-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-stone-100">
          
          {/* Matches Found */}
          {results.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <div className="px-4 py-2 bg-stone-50 text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Customer Profiles ({results.length})</span>
                <span>Sub-second Live Match</span>
              </div>

              {results.map((customer) => {
                const isVip = customer.tags && customer.tags.includes('VIP');

                return (
                  <div
                    key={customer.id}
                    className="p-3.5 sm:p-4 hover:bg-brand-50/50 transition-colors flex items-center justify-between group cursor-pointer"
                    onClick={() => {
                      onSelectCustomer(customer);
                      setIsOpen(false);
                    }}
                  >
                    {/* Left: Customer Info */}
                    <div className="flex items-start space-x-3.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-700 font-bold text-base shadow-2xs group-hover:from-brand-100 group-hover:to-brand-200 group-hover:text-brand-800 transition-colors shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm sm:text-base text-stone-900 group-hover:text-brand-900">
                            {customer.name}
                          </span>
                          {isVip && (
                            <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300">
                              ⭐ VIP
                            </span>
                          )}
                          {customer.is_imported_placeholder === 1 && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                              POS Imported
                            </span>
                          )}
                        </div>

                        {/* Phone & Stats */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500 mt-1">
                          <span className="font-mono font-medium text-stone-700">
                            📱 +91 {customer.phone_number}
                          </span>
                          <span>•</span>
                          <span>Visits: {customer.visit_count || 1}</span>
                          <span>•</span>
                          <span className="font-semibold text-brand-700">
                            LTV: ₹{(customer.total_spend || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Last Purchase Snippet */}
                        {customer.lastPurchase && (
                          <div className="text-[11px] text-stone-500 mt-1 flex items-center space-x-1.5">
                            <ShoppingBag className="w-3 h-3 text-stone-400" />
                            <span className="line-clamp-1">Last: <strong className="text-stone-700">{customer.lastPurchase.item_name}</strong> (₹{customer.lastPurchase.final_amount.toLocaleString('en-IN')})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAssign(customer);
                          setIsOpen(false);
                        }}
                        className="hidden sm:flex items-center space-x-1 text-xs font-bold text-brand-700 bg-brand-100 hover:bg-brand-200 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                        <span>Assign Rep</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectCustomer(customer);
                          setIsOpen(false);
                        }}
                        className="p-2 text-stone-400 group-hover:text-brand-600 group-hover:bg-white rounded-lg transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* No Matches Found -> Create New Profile Banner */
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-stone-900">
                No customer found matching "{query}"
              </h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                This appears to be a first-time visitor. Register them now in under 15 seconds!
              </p>

              <button
                onClick={() => {
                  onOpenNewCustomer(cleanDigits);
                  setIsOpen(false);
                }}
                className="mt-4 inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-brand-900/10 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create New Profile ({cleanDigits || 'Enter Phone'})</span>
              </button>
            </div>
          )}

          {/* Bottom Bar: Walk-in Quick Register Option */}
          {results.length > 0 && (
            <div className="p-3 bg-stone-50 flex items-center justify-between text-xs text-stone-600">
              <span>Customer not in the list?</span>
              <button
                onClick={() => {
                  onOpenNewCustomer(cleanDigits);
                  setIsOpen(false);
                }}
                className="text-brand-700 hover:text-brand-800 font-bold flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create New Profile</span>
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
