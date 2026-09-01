import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  Store,
  User,
  KeyRound,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2,
  Clock,
  Coffee,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { StaffStatus } from '../../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewCustomer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewCustomer
}) => {
  const { currentStaff, allStaff, currentBranch, branches, setCurrentBranch, setIsPinModalOpen, updateStatus } = useAuth();
  const { isSoundEnabled, toggleSound, notifications } = useNotification();
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const statusColors: Record<StaffStatus, { bg: string; dot: string; text: string; label: string }> = {
    free: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Available / Free' },
    busy: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', text: 'text-amber-700', label: 'Busy' },
    with_customer: { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', text: 'text-purple-700', label: 'With Customer' },
    on_break: { bg: 'bg-stone-100 text-stone-600 border-stone-300', dot: 'bg-stone-400', text: 'text-stone-600', label: 'On Break' }
  };

  const currentStatusInfo = currentStaff ? statusColors[currentStaff.status] : statusColors.free;

  const roleLabels: Record<string, string> = {
    receptionist: 'Reception / Front Desk',
    sales_rep: 'Sales Representative',
    store_manager: 'Store Manager',
    admin: 'Administrator',
    owner: 'Store Owner'
  };

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center text-white shadow-md shadow-brand-900/10">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-xl tracking-tight text-stone-900">Aura Couture</span>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded">CRM</span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">Retail Profile & Lead Management</p>
            </div>

            {/* Branch Switcher */}
            <div className="relative ml-4 hidden md:block">
              <button
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex items-center space-x-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 px-2.5 py-1.5 rounded-lg border border-stone-200 transition-colors"
              >
                <Store className="w-3.5 h-3.5 text-stone-500" />
                <span>{currentBranch ? currentBranch.name.split('-')[1]?.trim() || currentBranch.name : 'Select Branch'}</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isBranchDropdownOpen && (
                <div className="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-40">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                    Select Store Location
                  </div>
                  {branches.map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setCurrentBranch(b);
                        setIsBranchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-stone-50 transition-colors ${currentBranch?.id === b.id ? 'bg-brand-50 text-brand-900 font-semibold' : 'text-stone-700'}`}
                    >
                      <div>
                        <div>{b.name}</div>
                        <div className="text-[10px] text-stone-400">{b.address}</div>
                      </div>
                      {currentBranch?.id === b.id && <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Actions & Staff Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              title={isSoundEnabled ? "Mute in-store chimes" : "Unmute in-store chimes"}
              className={`p-2 rounded-lg border transition-colors ${isSoundEnabled ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100' : 'text-stone-400 bg-stone-100 border-stone-200'}`}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 border border-stone-200 relative transition-colors"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-stone-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-100 flex items-center justify-between">
                    <span className="font-semibold text-xs text-stone-900">Live In-Store Activity</span>
                    <span className="text-[10px] text-stone-400">{notifications.length} alerts</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-stone-400">No alerts yet. Front-desk assignments and sales will appear here live.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 hover:bg-stone-50 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-900">{n.title}</span>
                            <span className="text-[10px] text-stone-400">{n.timestamp}</span>
                          </div>
                          <p className="text-stone-600 text-[11px] mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active Staff Card & Status Switcher */}
            {currentStaff ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-stone-200">
                
                {/* Status Badge Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${currentStatusInfo.bg}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${currentStatusInfo.dot} animate-pulse`} />
                    <span className="hidden sm:inline">{currentStatusInfo.label}</span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {isStatusDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-40">
                      <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                        Set Your Status
                      </div>
                      {(['free', 'busy', 'with_customer', 'on_break'] as StaffStatus[]).map(status => (
                        <button
                          key={status}
                          onClick={() => {
                            updateStatus(status);
                            setIsStatusDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center space-x-2 hover:bg-stone-50 ${currentStaff.status === status ? 'font-semibold bg-stone-50' : ''}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusColors[status].dot}`} />
                          <span>{statusColors[status].label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Staff Avatar & PIN Switch Button */}
                <button
                  onClick={() => setIsPinModalOpen(true)}
                  title="Switch staff member via PIN"
                  className="flex items-center space-x-2 p-1.5 pr-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors text-left"
                >
                  <img
                    src={currentStaff.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={currentStaff.name}
                    className="w-7 h-7 rounded-lg object-cover"
                  />
                  <div className="hidden lg:block">
                    <div className="text-xs font-bold text-stone-900 leading-tight">{currentStaff.name}</div>
                    <div className="text-[10px] text-stone-500 leading-tight">{roleLabels[currentStaff.role]}</div>
                  </div>
                  <KeyRound className="w-3.5 h-3.5 text-stone-400 ml-1" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsPinModalOpen(true)}
                className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Staff Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar (Desktop / Tablet Scroll) */}
        <div className="hidden sm:flex space-x-1 overflow-x-auto py-2 -mb-px scrollbar-none border-t border-stone-100">
          <button
            onClick={() => setActiveTab('reception')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1.5 ${activeTab === 'reception' ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            <span>🛎️ Reception Desk</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1.5 ${activeTab === 'sales' ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            <span>👗 Sales Floor (My Leads)</span>
            {currentStaff && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'sales' ? 'bg-brand-700 text-white' : 'bg-stone-200 text-stone-700 font-bold'}`}>
                {currentStaff.active_leads_count || 0}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1.5 ${activeTab === 'customers' ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            <span>👥 Customer 360° Directory</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1.5 ${activeTab === 'import' ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            <span>📥 Universal POS / Excel Import</span>
          </button>

          {(currentStaff?.role === 'store_manager' || currentStaff?.role === 'owner' || currentStaff?.role === 'admin' || !currentStaff) && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1.5 ${activeTab === 'analytics' ? 'bg-brand-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              <span>📊 Manager Analytics & Radar</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed at bottom on smartphones) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 flex justify-around items-center shadow-lg safe-area-inset-bottom">
        <button
          onClick={() => setActiveTab('reception')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'reception' ? 'text-brand-700 font-bold' : 'text-stone-500'
          }`}
        >
          <span className="text-base">🛎️</span>
          <span className="text-[10px] mt-0.5">Reception</span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative ${
            activeTab === 'sales' ? 'text-brand-700 font-bold' : 'text-stone-500'
          }`}
        >
          <span className="text-base">👗</span>
          <span className="text-[10px] mt-0.5">My Leads</span>
          {currentStaff && (currentStaff.active_leads_count || 0) > 0 && (
            <span className="absolute top-0 right-1 w-4 h-4 bg-brand-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse">
              {currentStaff.active_leads_count}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'customers' ? 'text-brand-700 font-bold' : 'text-stone-500'
          }`}
        >
          <span className="text-base">👥</span>
          <span className="text-[10px] mt-0.5">Profiles</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
            activeTab === 'import' ? 'text-brand-700 font-bold' : 'text-stone-500'
          }`}
        >
          <span className="text-base">📥</span>
          <span className="text-[10px] mt-0.5">Import</span>
        </button>

        {(currentStaff?.role === 'store_manager' || currentStaff?.role === 'owner' || currentStaff?.role === 'admin' || !currentStaff) && (
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              activeTab === 'analytics' ? 'text-brand-700 font-bold' : 'text-stone-500'
            }`}
          >
            <span className="text-base">📊</span>
            <span className="text-[10px] mt-0.5">Radar</span>
          </button>
        )}
      </nav>
    </header>
  );
};
