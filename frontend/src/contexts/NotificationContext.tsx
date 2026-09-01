import React, { createContext, useContext, useState, useEffect } from 'react';
import { sseService } from '../services/sse';
import { soundService } from '../services/sound';
import { useAuth } from './AuthContext';
import { Lead } from '../types';

export interface AlertNotification {
  id: string;
  type: 'LEAD_ASSIGNED' | 'LEAD_CLOSED' | 'CUSTOMER_CREATED' | 'IMPORT_COMPLETED' | 'INFO';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

interface NotificationContextType {
  incomingLeadAlert: any | null;
  dismissLeadAlert: () => void;
  notifications: AlertNotification[];
  dismissNotification: (id: string) => void;
  isSoundEnabled: boolean;
  toggleSound: () => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentStaff } = useAuth();
  const [incomingLeadAlert, setIncomingLeadAlert] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);

  useEffect(() => {
    // Listen for lead assigned
    const unsubLeadAssigned = sseService.on('LEAD_ASSIGNED', (data: any) => {
      // If assigned to current staff member or current staff is manager/owner/receptionist
      const isTargetedToMe = currentStaff && data.assignedTo?.id === currentStaff.id;

      if (isTargetedToMe) {
        soundService.playLeadAlert();
        setIncomingLeadAlert(data);
      }

      addNotification({
        id: `alert_${Date.now()}`,
        type: 'LEAD_ASSIGNED',
        title: isTargetedToMe ? '🛎️ New Customer Assigned to You!' : `Lead Assigned: ${data.customer.name}`,
        message: `${data.customer.name} assigned to ${data.assignedTo.name}. Intent: ${data.walk_in_intent || 'In-store pitch'}`,
        data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    // Listen for lead closed
    const unsubLeadClosed = sseService.on('LEAD_CLOSED', (data: any) => {
      if (data.status === 'closed_sale') {
        if (currentStaff && data.assignedToStaffId === currentStaff.id) {
          soundService.playSaleSuccess();
        }
        addNotification({
          id: `alert_${Date.now()}`,
          type: 'LEAD_CLOSED',
          title: '🎉 Sale Completed!',
          message: `Lead closed as Sale (₹${data.saleAmount || 0})`,
          data,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    });

    // Listen for import completed
    const unsubImport = sseService.on('IMPORT_COMPLETED', (data: any) => {
      addNotification({
        id: `alert_${Date.now()}`,
        type: 'IMPORT_COMPLETED',
        title: '📥 Sales Billing Import Complete',
        message: `${data.rowsAdded} records added from ${data.filename} (${data.rowsDuplicate} duplicates skipped)`,
        data,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    return () => {
      unsubLeadAssigned();
      unsubLeadClosed();
      unsubImport();
    };
  }, [currentStaff]);

  const addNotification = (notif: AlertNotification) => {
    setNotifications(prev => [notif, ...prev.slice(0, 9)]);
  };

  const dismissLeadAlert = () => {
    setIncomingLeadAlert(null);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleToggleSound = () => {
    const updated = soundService.toggleSound();
    setIsSoundEnabled(updated);
    return updated;
  };

  return (
    <NotificationContext.Provider
      value={{
        incomingLeadAlert,
        dismissLeadAlert,
        notifications,
        dismissNotification,
        isSoundEnabled,
        toggleSound: handleToggleSound
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
