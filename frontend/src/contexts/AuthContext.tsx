import React, { createContext, useContext, useState, useEffect } from 'react';
import { Staff, Branch, StaffStatus } from '../types';
import { api } from '../services/api';
import { sseService } from '../services/sse';

interface AuthContextType {
  currentStaff: Staff | null;
  allStaff: Staff[];
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch) => void;
  isPinModalOpen: boolean;
  setIsPinModalOpen: (open: boolean) => void;
  loginWithPin: (pin: string, staffId?: string) => Promise<boolean>;
  logout: () => void;
  updateStatus: (status: StaffStatus) => Promise<void>;
  refreshStaff: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(() => {
    const saved = localStorage.getItem('aura_current_staff');
    return saved ? JSON.parse(saved) : null;
  });

  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  const refreshStaff = async () => {
    try {
      const list = await api.getStaffList(currentBranch?.id);
      setAllStaff(list);
      if (currentStaff) {
        const updated = list.find(s => s.id === currentStaff.id);
        if (updated) {
          setCurrentStaff(updated);
          localStorage.setItem('aura_current_staff', JSON.stringify(updated));
        }
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  useEffect(() => {
    // Initial fetch of branches and staff
    const init = async () => {
      try {
        const bList = await api.getBranches();
        setBranches(bList);
        if (bList.length > 0) {
          const defaultB = bList[0];
          setCurrentBranch(defaultB);
        }

        const sList = await api.getStaffList();
        setAllStaff(sList);

        // If no user is logged in, default to receptionist for convenient demo access
        if (!currentStaff && sList.length > 0) {
          const receptionist = sList.find(s => s.role === 'receptionist') || sList[0];
          setCurrentStaff(receptionist);
          localStorage.setItem('aura_current_staff', JSON.stringify(receptionist));
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (currentStaff) {
      sseService.connect(currentStaff.id);
    } else {
      sseService.connect();
    }
  }, [currentStaff?.id]);

  // Listen to live staff status changes
  useEffect(() => {
    const unsubscribe = sseService.on('STAFF_STATUS_CHANGED', (data: { staffId: string; status: StaffStatus }) => {
      setAllStaff(prev => prev.map(s => s.id === data.staffId ? { ...s, status: data.status } : s));
      if (currentStaff && currentStaff.id === data.staffId) {
        setCurrentStaff(prev => prev ? { ...prev, status: data.status } : null);
      }
    });
    return () => unsubscribe();
  }, [currentStaff]);

  const loginWithPin = async (pin: string, staffId?: string): Promise<boolean> => {
    try {
      const res = await api.pinLogin(pin, staffId);
      if (res.success && res.staff) {
        setCurrentStaff(res.staff);
        localStorage.setItem('aura_current_staff', JSON.stringify(res.staff));
        setIsPinModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('PIN Login failed:', err);
      throw err;
    }
  };

  const logout = () => {
    setCurrentStaff(null);
    localStorage.removeItem('aura_current_staff');
    setIsPinModalOpen(true);
  };

  const updateStatus = async (status: StaffStatus) => {
    if (!currentStaff) return;
    try {
      await api.updateStaffStatus(currentStaff.id, status);
      setCurrentStaff(prev => prev ? { ...prev, status } : null);
      setAllStaff(prev => prev.map(s => s.id === currentStaff.id ? { ...s, status } : s));
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentStaff,
        allStaff,
        branches,
        currentBranch,
        setCurrentBranch,
        isPinModalOpen,
        setIsPinModalOpen,
        loginWithPin,
        logout,
        updateStatus,
        refreshStaff
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
