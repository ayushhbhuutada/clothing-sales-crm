import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Staff, Branch, StaffStatus } from '../types';
import { api, authToken, setUnauthorizedHandler } from '../services/api';
import { sseService } from '../services/sse';

const MANAGER_ROLES = ['store_manager', 'admin', 'owner'];

interface AuthContextType {
  currentStaff: Staff | null;
  isManager: boolean;
  isRestoringSession: boolean;
  allStaff: Staff[];
  branches: Branch[];
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch) => void;
  isPinModalOpen: boolean;
  setIsPinModalOpen: (open: boolean) => void;
  loginWithPin: (pin: string, staffId: string) => Promise<boolean>;
  logout: () => void;
  updateStatus: (status: StaffStatus) => Promise<void>;
  refreshStaff: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Before login only the public staff directory (names for the PIN pad) is available
  const loadStaffDirectory = useCallback(async () => {
    try {
      setAllStaff(await api.getStaffDirectory());
    } catch (err) {
      console.error('Failed to load staff directory:', err);
    }
  }, []);

  const loadSessionData = useCallback(async () => {
    const [bList, sList] = await Promise.all([api.getBranches(), api.getStaffList()]);
    setBranches(bList);
    setCurrentBranch(prev => prev || bList[0] || null);
    setAllStaff(sList);
    // Pick up live fields (e.g. active lead count) for the signed-in staff member
    setCurrentStaff(prev => (prev && sList.find(s => s.id === prev.id)) || prev);
  }, []);

  const endSession = useCallback(() => {
    authToken.clear();
    sseService.disconnect();
    setCurrentStaff(null);
    setBranches([]);
    setCurrentBranch(null);
    setIsPinModalOpen(true);
    loadStaffDirectory();
  }, [loadStaffDirectory]);

  const refreshStaff = async () => {
    if (!currentStaff) return;
    try {
      const list = await api.getStaffList(currentBranch?.id);
      setAllStaff(list);
      const updated = list.find(s => s.id === currentStaff.id);
      if (updated) setCurrentStaff(updated);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  useEffect(() => {
    setUnauthorizedHandler(endSession);
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // Restore a still-valid session; otherwise require a PIN login (no automatic sign-in)
  useEffect(() => {
    const restore = async () => {
      const token = authToken.get();
      if (token && !authToken.isExpired(token)) {
        try {
          const me = await api.getMe();
          setCurrentStaff(me);
          await loadSessionData();
          return;
        } catch (err) {
          console.error('Session restore failed:', err);
        }
      }
      endSession();
    };
    restore().finally(() => setIsRestoringSession(false));
  }, []);

  useEffect(() => {
    if (currentStaff) {
      sseService.connect(currentStaff.id);
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

  const loginWithPin = async (pin: string, staffId: string): Promise<boolean> => {
    const res = await api.pinLogin(pin, staffId);
    if (res.success && res.token && res.staff) {
      authToken.set(res.token);
      setCurrentStaff(res.staff);
      setIsPinModalOpen(false);
      await loadSessionData();
      return true;
    }
    return false;
  };

  const logout = () => {
    endSession();
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
        isManager: !!currentStaff && MANAGER_ROLES.includes(currentStaff.role),
        isRestoringSession,
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
