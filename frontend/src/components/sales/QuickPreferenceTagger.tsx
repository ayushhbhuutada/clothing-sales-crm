import React, { useState } from 'react';
import { X, Sparkles, Check, Plus, Tag } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface QuickPreferenceTaggerProps {
  customerId: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
  onPreferencesUpdated: () => void;
}

export const QuickPreferenceTagger: React.FC<QuickPreferenceTaggerProps> = ({
  customerId,
  customerName,
  isOpen,
  onClose,
  onPreferencesUpdated
}) => {
  const { currentStaff } = useAuth();
  const [selectedTopSize, setSelectedTopSize] = useState<string>('');
  const [selectedBottomSize, setSelectedBottomSize] = useState<string>('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const topSizes = ['XS / 34', 'S / 36', 'M / 38', 'L / 40', 'XL / 42', 'XXL / 44', '3XL / 46'];
  const bottomSizes = ['28', '30', '32', '34', '36', '38', '40'];
  const commonColors = ['Pastel Peach', 'Emerald Green', 'Powder Blue', 'Royal Magenta', 'Ivory / White', 'Navy Blue', 'Mustard Gold', 'Lilac Lavender', 'Terracotta Rust'];
  const commonFabrics = ['Pure Silk', 'Chiffon', 'Chanderi', 'Georgette', 'Handloom Linen', 'Giza Cotton', 'Organza', 'Velvet'];
  const budgetRanges = ['Under ₹10,000', '₹10,000 - ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', '₹1,00,000+'];

  const toggleColor = (col: string) => {
    setSelectedColors(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  };

  const toggleFabric = (fab: string) => {
    setSelectedFabrics(prev => prev.includes(fab) ? prev.filter(f => f !== fab) : [...prev, fab]);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises: Promise<any>[] = [];

      if (selectedTopSize) {
        promises.push(api.addPreference(customerId, { type: 'top_size', value: selectedTopSize, staff_id: currentStaff?.id }));
      }
      if (selectedBottomSize) {
        promises.push(api.addPreference(customerId, { type: 'bottom_size', value: selectedBottomSize, staff_id: currentStaff?.id }));
      }
      for (const col of selectedColors) {
        promises.push(api.addPreference(customerId, { type: 'color', value: col, staff_id: currentStaff?.id }));
      }
      for (const fab of selectedFabrics) {
        promises.push(api.addPreference(customerId, { type: 'fabric', value: fab, staff_id: currentStaff?.id }));
      }
      if (selectedBudget) {
        promises.push(api.addPreference(customerId, { type: 'budget', value: selectedBudget, staff_id: currentStaff?.id }));
      }
      if (customNote.trim()) {
        promises.push(api.addPreference(customerId, { type: 'style_note', value: customNote.trim(), staff_id: currentStaff?.id }));
      }

      await Promise.all(promises);
      onPreferencesUpdated();
      onClose();
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-sm">30-Second Style & Preference Tagger</h3>
              <p className="text-[11px] text-stone-300">Updating profile for: <strong className="text-white">{customerName}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chip Tagger Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {/* Top Size */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Top / Kurti / Shirt Size:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {topSizes.map(size => (
                <button
                  type="button"
                  key={size}
                  onClick={() => setSelectedTopSize(selectedTopSize === size ? '' : size)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedTopSize === size
                      ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Size */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Bottom / Pant / Waist Size:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {bottomSizes.map(size => (
                <button
                  type="button"
                  key={size}
                  onClick={() => setSelectedBottomSize(selectedBottomSize === size ? '' : size)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedBottomSize === size
                      ? 'bg-brand-600 text-white border-brand-700 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {size} Waist
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Colors Customer Liked:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {commonColors.map(color => (
                <button
                  type="button"
                  key={color}
                  onClick={() => toggleColor(color)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                    selectedColors.includes(color)
                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold shadow-2xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {selectedColors.includes(color) && <Check className="w-3 h-3 text-amber-700" />}
                  <span>{color}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fabrics */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Preferred Fabrics:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {commonFabrics.map(fabric => (
                <button
                  type="button"
                  key={fabric}
                  onClick={() => toggleFabric(fabric)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                    selectedFabrics.includes(fabric)
                      ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold shadow-2xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {selectedFabrics.includes(fabric) && <Check className="w-3 h-3 text-purple-700" />}
                  <span>{fabric}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Comfort Budget Range:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {budgetRanges.map(range => (
                <button
                  type="button"
                  key={range}
                  onClick={() => setSelectedBudget(selectedBudget === range ? '' : range)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedBudget === range
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Fitting / Style Note */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
              Quick Stylist Note / Fitting Detail:
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Loves sweetheart necklines, buying for sister's wedding in January"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

        </div>

        {/* Actions */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-900/10 transition-colors flex items-center space-x-1.5"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Style Tags to Profile</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
