import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { Header } from './components/common/Header';
import { PINPadModal } from './components/common/PINPadModal';
import { IncomingLeadModal } from './components/common/IncomingLeadModal';
import { ReceptionView } from './components/reception/ReceptionView';
import { SalesFloorView } from './components/sales/SalesFloorView';
import { CustomerDirectoryView } from './components/customer/CustomerDirectoryView';
import { UniversalImportView } from './components/import/UniversalImportView';
import { AnalyticsDashboard } from './components/admin/AnalyticsDashboard';
import { CustomerProfileModal } from './components/customer/CustomerProfileModal';
import { NewCustomerModal } from './components/reception/NewCustomerModal';
import { LeadAssignModal } from './components/reception/LeadAssignModal';
import { Customer } from './types';

const MANAGER_TABS = ['import', 'analytics'];

const MainApp: React.FC = () => {
  const { currentStaff, isManager, isRestoringSession } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('reception');

  // After a staff switch, leave manager-only tabs the new user cannot access
  useEffect(() => {
    if (!isManager && MANAGER_TABS.includes(activeTab)) {
      setActiveTab('reception');
    }
  }, [isManager, activeTab]);

  // Modals state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [prefillPhone, setPrefillPhone] = useState('');
  const [customerToAssign, setCustomerToAssign] = useState<Customer | null>(null);

  const handleOpenCustomerProfile = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const handleOpenNewCustomer = (phone = '') => {
    setPrefillPhone(phone);
    setIsNewCustomerModalOpen(true);
  };

  const handleOpenLeadAssign = (customer: Customer) => {
    setCustomerToAssign(customer);
  };

  const handleCustomerCreated = (customerId: string, autoAssign: boolean) => {
    if (autoAssign) {
      // Fetch and open lead assign modal for this customer
      setSelectedCustomerId(customerId);
    } else {
      setSelectedCustomerId(customerId);
    }
  };

  // Nothing but the PIN pad is shown until a staff member signs in
  if (!currentStaff) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 flex items-center justify-center font-sans">
        {isRestoringSession && <p className="text-sm text-stone-500">Loading…</p>}
        {!isRestoringSession && <PINPadModal />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">

      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewCustomer={() => handleOpenNewCustomer('')}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-24 sm:pb-16">
        {activeTab === 'reception' && (
          <ReceptionView
            onOpenCustomerProfile={handleOpenCustomerProfile}
            onOpenNewCustomer={handleOpenNewCustomer}
            onOpenLeadAssign={handleOpenLeadAssign}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'sales' && (
          <SalesFloorView
            onOpenCustomerProfile={handleOpenCustomerProfile}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerDirectoryView
            onOpenCustomerProfile={handleOpenCustomerProfile}
            onOpenNewCustomer={handleOpenNewCustomer}
            onOpenLeadAssign={handleOpenLeadAssign}
          />
        )}

        {activeTab === 'import' && isManager && (
          <UniversalImportView
            onOpenCustomerProfile={handleOpenCustomerProfile}
          />
        )}

        {activeTab === 'analytics' && isManager && (
          <AnalyticsDashboard
            onOpenCustomerProfile={handleOpenCustomerProfile}
          />
        )}
      </main>

      {/* Global Modals */}
      <PINPadModal />

      <IncomingLeadModal
        onOpenCustomerProfile={handleOpenCustomerProfile}
      />

      <CustomerProfileModal
        customerId={selectedCustomerId}
        isOpen={!!selectedCustomerId}
        onClose={() => setSelectedCustomerId(null)}
        onOpenLeadAssign={(c) => {
          setSelectedCustomerId(null);
          setCustomerToAssign(c);
        }}
      />

      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        initialPhone={prefillPhone}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
      />

      <LeadAssignModal
        isOpen={!!customerToAssign}
        customer={customerToAssign}
        onClose={() => setCustomerToAssign(null)}
        onLeadAssigned={() => {
          // Stay on view or refresh
        }}
      />

    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
