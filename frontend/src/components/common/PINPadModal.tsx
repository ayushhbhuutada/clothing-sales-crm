import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Staff } from '../../types';
import { KeyRound, X, Delete, ShieldCheck, UserCheck } from 'lucide-react';

export const PINPadModal: React.FC = () => {
  const { isPinModalOpen, setIsPinModalOpen, allStaff, loginWithPin, currentStaff } = useAuth();
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isPinModalOpen) return null;

  const handleDigit = (digit: string) => {
    if (!selectedStaff) {
      setError('Select your name first.');
      return;
    }
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      // Auto-submit on 4th digit if staff selected
      if (nextPin.length === 4 && selectedStaff) {
        attemptLogin(nextPin, selectedStaff.id);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const attemptLogin = async (pinCode: string, staffId: string) => {
    setLoading(true);
    setError(null);
    try {
      const success = await loginWithPin(pinCode, staffId);
      if (success) {
        setPin('');
        setSelectedStaff(null);
      } else {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid PIN code');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-sm">Staff Fast PIN Switcher</span>
          </div>
          {currentStaff && (
            <button
              onClick={() => setIsPinModalOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Quick Staff Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Select Staff Member on Shift:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {allStaff.map(staff => {
                const isSelected = selectedStaff?.id === staff.id;

                return (
                  <button
                    key={staff.id}
                    onClick={() => {
                      setSelectedStaff(staff);
                      setPin('');
                      setError(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-center text-center ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 shadow-xs ring-2 ring-brand-500/20'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <img
                      src={staff.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={staff.name}
                      className="w-10 h-10 rounded-full object-cover mb-1.5 shadow-xs"
                    />
                    <span className="text-xs font-bold text-stone-900 truncate w-full">{staff.name.split(' ')[0]}</span>
                    <span className="text-[10px] text-stone-500 uppercase tracking-tight">{staff.role.replace('_', ' ')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Staff Indicator */}
          {selectedStaff ? (
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center space-x-3">
              <img
                src={selectedStaff.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={selectedStaff.name}
                className="w-9 h-9 rounded-full object-cover"
              />
              <div>
                <div className="text-xs font-bold text-stone-900">{selectedStaff.name}</div>
                <div className="text-[11px] text-stone-500">{selectedStaff.specialty_category || selectedStaff.role}</div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-stone-500 text-center">Select your name above, then enter your 4-digit PIN.</p>
          )}

          {/* PIN Dots Display */}
          <div className="flex justify-center items-center space-x-4 my-2">
            {[0, 1, 2, 3].map(idx => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  pin.length > idx
                    ? 'bg-brand-600 scale-110 shadow-xs'
                    : 'bg-stone-200 border border-stone-300'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg text-center font-medium animate-shake">
              {error}
            </div>
          )}

          {/* Touch Numpad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                onClick={() => handleDigit(num)}
                disabled={loading}
                className="h-13 bg-stone-100 hover:bg-stone-200 active:bg-brand-100 active:text-brand-900 rounded-xl text-lg font-bold text-stone-800 transition-colors shadow-2xs flex items-center justify-center"
              >
                {num}
              </button>
            ))}

            <button
              onClick={handleClear}
              className="h-13 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold text-stone-600 transition-colors flex items-center justify-center"
            >
              Clear
            </button>

            <button
              onClick={() => handleDigit('0')}
              disabled={loading}
              className="h-13 bg-stone-100 hover:bg-stone-200 active:bg-brand-100 active:text-brand-900 rounded-xl text-lg font-bold text-stone-800 transition-colors shadow-2xs flex items-center justify-center"
            >
              0
            </button>

            <button
              onClick={handleDelete}
              className="h-13 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-600 transition-colors flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 text-[11px] text-stone-400 text-center flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Role-Based Permissions Active (Reception / Sales / Manager)</span>
        </div>
      </div>
    </div>
  );
};
