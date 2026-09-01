import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Sparkles,
  Download,
  Settings,
  HelpCircle,
  Clock,
  ArrowRight,
  UserCheck,
  Trash2,
  Phone,
  User,
  X
} from 'lucide-react';
import { ColumnMappingTemplate, ImportBatch, ReviewQueueItem, Customer } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';

interface UniversalImportViewProps {
  onOpenCustomerProfile: (customerId: string) => void;
}

export const UniversalImportView: React.FC<UniversalImportViewProps> = ({
  onOpenCustomerProfile
}) => {
  const { currentStaff, currentBranch } = useAuth();

  // State
  const [templates, setTemplates] = useState<ColumnMappingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [activeTab, setActiveTab] = useState<'upload' | 'mapping' | 'review' | 'history'>('upload');

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{ filename: string; totalRows: number; headers: string[]; sampleRows: any[] } | null>(null);
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Template creation state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newBillingSoftware, setNewBillingSoftware] = useState('Tally');

  // Review Queue linking modal state
  const [selectedQueueItem, setSelectedQueueItem] = useState<ReviewQueueItem | null>(null);
  const [linkPhone, setLinkPhone] = useState('');
  const [linkName, setLinkName] = useState('');
  const [resolving, setResolving] = useState(false);

  const loadData = async () => {
    try {
      const [tmplList, batchList, qList] = await Promise.all([
        api.getTemplates(),
        api.getImportBatches(),
        api.getReviewQueue()
      ]);
      setTemplates(tmplList);
      if (tmplList.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(tmplList[0].id);
        setCustomMapping(tmplList[0].field_mapping || {});
      }
      setBatches(batchList);
      setReviewQueue(qList);
    } catch (err) {
      console.error('Failed to load import data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find(t => t.id === tmplId);
    if (tmpl) {
      setCustomMapping(tmpl.field_mapping || {});
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setImportResult(null);

    try {
      const preview = await api.previewImportFile(file);
      setPreviewData(preview);

      // Auto-detect mappings if possible
      const newMap: Record<string, string> = { ...customMapping };
      preview.headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact')) newMap['phone_number'] = h;
        if (lower.includes('name') || lower.includes('customer') || lower.includes('party')) newMap['customer_name'] = h;
        if (lower.includes('invoice') || lower.includes('bill') || lower.includes('voucher')) newMap['invoice_number'] = h;
        if (lower.includes('date')) newMap['purchase_date'] = h;
        if (lower.includes('item') || lower.includes('desc') || lower.includes('product')) newMap['item_name'] = h;
        if (lower.includes('category') || lower.includes('group') || lower.includes('class')) newMap['category'] = h;
        if (lower.includes('size')) newMap['size'] = h;
        if (lower.includes('color') || lower.includes('shade')) newMap['color'] = h;
        if (lower.includes('qty') || lower.includes('quantity')) newMap['quantity'] = h;
        if (lower.includes('rate') || lower.includes('price') || lower.includes('mrp')) newMap['price'] = h;
        if (lower.includes('disc')) newMap['discount'] = h;
        if (lower.includes('total') || lower.includes('net') || lower.includes('final') || lower.includes('amount')) newMap['final_amount'] = h;
        if (lower.includes('staff') || lower.includes('person') || lower.includes('salesman')) newMap['staff_name'] = h;
      });
      setCustomMapping(newMap);
    } catch (err: any) {
      setError(err.message || 'Failed to read file preview');
    }
  };

  const handleRunImport = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const res = await api.uploadAndImport(selectedFile, {
        mapping: customMapping,
        template_id: selectedTemplateId || undefined,
        staff_id: currentStaff?.id,
        branch_id: currentBranch?.id
      });

      setImportResult(res.result);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Import processing failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    try {
      await api.saveTemplate({
        name: newTemplateName.trim(),
        billing_software_name: newBillingSoftware,
        field_mapping: customMapping,
        branch_id: currentBranch?.id
      });
      setNewTemplateName('');
      loadData();
      alert('Mapping template saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    }
  };

  const handleDownloadSampleFile = (type: 'tally' | 'vyapar' | 'generic') => {
    const sampleData = type === 'tally' ? [
      { 'Customer Mobile': '9876543210', 'Customer Name': 'Meera Kapoor', 'Voucher No': 'TAL-9041', 'Date': '2026-08-28', 'Item Description': 'Chiffon Mirror-Work Kurti Set', 'Stock Group': 'Ethnic Wear', 'Size Tag': 'M', 'Color / Shade': 'Pastel Lilac', 'Billed Qty': 1, 'Rate (MRP)': 16500, 'Discount Amt': 1500, 'Net Amount': 15000, 'Sales Person': 'Rahul Verma' },
      { 'Customer Mobile': '9812345678', 'Customer Name': 'Rohan Khanna', 'Voucher No': 'TAL-9042', 'Date': '2026-08-28', 'Item Description': 'Linen Formal Bandhgala Jacket', 'Stock Group': 'Formals', 'Size Tag': '42', 'Color / Shade': 'Charcoal Slate', 'Billed Qty': 1, 'Rate (MRP)': 22000, 'Discount Amt': 2000, 'Net Amount': 20000, 'Sales Person': 'Vikram Malhotra' },
      { 'Customer Mobile': '9955443322', 'Customer Name': 'Anjali Gupta', 'Voucher No': 'TAL-9043', 'Date': '2026-08-28', 'Item Description': 'Organza Floral Anarkali', 'Stock Group': 'Bridal & Festive', 'Size Tag': 'L', 'Color / Shade': 'Dusty Rose', 'Billed Qty': 1, 'Rate (MRP)': 32000, 'Discount Amt': 0, 'Net Amount': 32000, 'Sales Person': 'Ananya Sen' },
      { 'Customer Mobile': '', 'Customer Name': 'Walk-in Cash Guest', 'Voucher No': 'TAL-9044', 'Date': '2026-08-28', 'Item Description': 'Embroidered Silk Stole', 'Stock Group': 'Accessories', 'Size Tag': 'Free Size', 'Color / Shade': 'Antique Gold', 'Billed Qty': 1, 'Rate (MRP)': 8500, 'Discount Amt': 500, 'Net Amount': 8000, 'Sales Person': 'Rahul Verma' }
    ] : [
      { 'Phone Number': '9876543210', 'Party Name': 'Meera Kapoor', 'Invoice Number': 'VY-8801', 'Invoice Date': '2026-08-28', 'Item Name': 'Silk Kurta', 'Category': 'Ethnic', 'Size': 'M', 'Color': 'Emerald', 'Quantity': 1, 'Price/Unit': 12000, 'Discount': 0, 'Total Amount': 12000 },
      { 'Phone Number': '9123456780', 'Party Name': 'Priya Sharma', 'Invoice Number': 'VY-8802', 'Invoice Date': '2026-08-28', 'Item Name': 'Indo-Western Co-ord', 'Category': 'Western', 'Size': 'M', 'Color': 'Lilac', 'Quantity': 1, 'Price/Unit': 14500, 'Discount': 500, 'Total Amount': 14000 }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
    XLSX.writeFile(wb, `sample_${type}_sales_export.xlsx`);
  };

  const handleResolveQueueItem = async (action: 'link' | 'discard') => {
    if (!selectedQueueItem) return;
    setResolving(true);
    try {
      await api.resolveReviewItem(selectedQueueItem.id, {
        action,
        phone_number: linkPhone || undefined,
        customer_name: linkName || undefined,
        staff_id: currentStaff?.id
      });
      setSelectedQueueItem(null);
      setLinkPhone('');
      setLinkName('');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve item');
    } finally {
      setResolving(false);
    }
  };

  const crmFields = [
    { key: 'phone_number', label: 'Phone Number (Primary Key)', required: true },
    { key: 'customer_name', label: 'Customer / Party Name', required: false },
    { key: 'invoice_number', label: 'Invoice / Voucher Number', required: true },
    { key: 'purchase_date', label: 'Date of Purchase', required: true },
    { key: 'item_name', label: 'Item Name / Description', required: true },
    { key: 'category', label: 'Category / Stock Group', required: false },
    { key: 'size', label: 'Size (XS, S, M, L, XL, 38, 40...)', required: false },
    { key: 'color', label: 'Color / Shade', required: false },
    { key: 'quantity', label: 'Quantity', required: false },
    { key: 'price', label: 'Price / Rate / MRP', required: false },
    { key: 'discount', label: 'Discount Amount / %', required: false },
    { key: 'final_amount', label: 'Final Net Paid Amount', required: true },
    { key: 'staff_name', label: 'Salesperson / Handled By', required: false }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-serif text-stone-900">
            Universal Billing & POS Spreadsheet Import
          </h1>
          <p className="text-xs text-stone-500">
            Import daily sales from Tally, Marg ERP, Vyapar, or any custom POS export without manual data entry.
          </p>
        </div>

        {/* Sample Downloader Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownloadSampleFile('tally')}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 px-3 py-2 rounded-xl border border-stone-200 shadow-2xs transition-colors"
            title="Download sample Tally Excel file to test"
          >
            <Download className="w-3.5 h-3.5 text-brand-600" />
            <span>Sample Tally File</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('upload')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'upload' ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload & Process Import</span>
        </button>

        <button
          onClick={() => setActiveTab('mapping')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'mapping' ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Column Mapping Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'review' ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Needs Review Queue ({reviewQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'history' ? 'border-brand-600 text-brand-700' : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Import History & Audit Log</span>
        </button>
      </div>

      {/* TAB 1: UPLOAD & IMPORT */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          
          {/* Step 1: Select Preset Template */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
              1. Choose Billing Software Preset Template:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {templates.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => handleTemplateChange(tmpl.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedTemplateId === tmpl.id
                      ? 'bg-brand-50 border-brand-600 text-brand-900 ring-2 ring-brand-500/20 font-bold shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs font-bold">{tmpl.name}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{tmpl.billing_software_name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Drag and drop file upload */}
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-stone-300 hover:border-brand-500 transition-all text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto shadow-xs">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Upload Sales Register Export File
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Supports Excel (.xlsx, .xls) and CSV (.csv) exports from your billing counter.
              </p>
            </div>

            <label className="inline-flex items-center space-x-2 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-md transition-colors">
              <UploadCloud className="w-4 h-4" />
              <span>{selectedFile ? selectedFile.name : 'Select Spreadsheet File'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {selectedFile && previewData && (
              <div className="text-xs text-emerald-700 font-semibold mt-2">
                ✓ Loaded {previewData.filename} ({previewData.totalRows} records found)
              </div>
            )}
          </div>

          {/* Step 3: Column Mapping Confirmation Preview */}
          {previewData && (
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    2. Column Mapping Preview ({previewData.headers.length} detected columns)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Verify that your spreadsheet headers match the CRM fields below.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {crmFields.map(field => (
                  <div key={field.key} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                    <label className="block font-bold text-stone-800 mb-1">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={customMapping[field.key] || ''}
                      onChange={(e) => setCustomMapping({ ...customMapping, [field.key]: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                    >
                      <option value="">-- Ignore / Not in file --</option>
                      {previewData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample Data Table Preview */}
              <div className="pt-2">
                <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  First 3 Sample Rows Preview:
                </div>
                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-stone-100 text-stone-600 font-semibold">
                      <tr>
                        {previewData.headers.map(h => (
                          <th key={h} className="py-2 px-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {previewData.sampleRows.slice(0, 3).map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-stone-50">
                          {previewData.headers.map(h => (
                            <td key={h} className="py-2 px-3 whitespace-nowrap font-mono">{String(row[h] || '-')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Run Import Action */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="text-xs text-stone-500">
                  De-duplication engine is active (composite row hash prevents re-importing duplicate bills).
                </div>
                <button
                  onClick={handleRunImport}
                  disabled={importing}
                  className="bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-brand-900/10 transition-colors flex items-center space-x-2 disabled:opacity-60"
                >
                  {importing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Execute Sales Import Pipeline</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-4 rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Import Result Dashboard (Spec 4.4 d) */}
          {importResult && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-md space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Import Batch Completed Successfully!</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Total Rows</div>
                  <div className="text-base font-bold text-stone-900 mt-0.5">{importResult.totalRows}</div>
                </div>

                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 uppercase font-bold">Purchases Added</div>
                  <div className="text-base font-bold text-emerald-800 mt-0.5">+{importResult.rowsAdded}</div>
                </div>

                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <div className="text-[10px] text-amber-700 uppercase font-bold">Duplicates Skipped</div>
                  <div className="text-base font-bold text-amber-800 mt-0.5">{importResult.rowsDuplicate}</div>
                </div>

                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <div className="text-[10px] text-purple-700 uppercase font-bold">Needs Review</div>
                  <div className="text-base font-bold text-purple-800 mt-0.5">{importResult.rowsNeedsReview}</div>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <div className="text-[10px] text-blue-700 uppercase font-bold">New Profiles Created</div>
                  <div className="text-base font-bold text-blue-800 mt-0.5">{importResult.newCustomersCreated}</div>
                </div>
              </div>

              {importResult.rowsNeedsReview > 0 && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                  <span>{importResult.rowsNeedsReview} row(s) had missing phone numbers and were sent to the Needs Review Queue.</span>
                  <button
                    onClick={() => setActiveTab('review')}
                    className="font-bold underline text-amber-950"
                  >
                    Resolve Review Queue →
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB 2: COLUMN MAPPING TEMPLATES BUILDER */}
      {activeTab === 'mapping' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900">
              Save New Mapping Template
            </h3>
            <p className="text-xs text-stone-500">
              Create reusable column profiles for stores using Marg ERP, Tally, Vyapar, or bespoke custom software.
            </p>

            <form onSubmit={handleSaveNewTemplate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    required
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g. Phoenix Mall Tally Prime"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Billing Software</label>
                  <select
                    value={newBillingSoftware}
                    onChange={(e) => setNewBillingSoftware(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
                  >
                    <option value="Tally">Tally Prime / ERP 9</option>
                    <option value="Vyapar">Vyapar App</option>
                    <option value="Marg ERP">Marg ERP</option>
                    <option value="Custom">Custom / Other In-house POS</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {crmFields.map(field => (
                  <div key={field.key} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                    <label className="block font-bold text-stone-800 mb-1">
                      {field.label}
                    </label>
                    <input
                      type="text"
                      value={customMapping[field.key] || ''}
                      onChange={(e) => setCustomMapping({ ...customMapping, [field.key]: e.target.value })}
                      placeholder={`Source column name (e.g. ${field.key})`}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Save Column Mapping Template
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: NEEDS REVIEW QUEUE (Spec 4.4 b & e) */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Needs Review Quarantine Queue ({reviewQueue.length} items)
              </h3>
              <p className="text-xs text-stone-500">
                Rows without phone numbers (common in old paper/cash billing). Link them manually to a customer or discard.
              </p>
            </div>
            <button onClick={loadData} className="text-xs text-stone-500 hover:text-stone-800">
              Refresh Queue
            </button>
          </div>

          {reviewQueue.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="font-bold text-stone-800 text-sm">Review Queue is Empty</div>
              <p className="mt-0.5">All imported sales records have been successfully matched to customers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-stone-900">{item.item_name || 'Apparel Item'}</span>
                      <span className="font-bold text-brand-700">₹{(item.amount || 0).toLocaleString('en-IN')}</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {item.reason}
                      </span>
                    </div>
                    <div className="text-stone-500 text-[11px] mt-1 flex items-center space-x-2">
                      <span>Invoice: <strong className="text-stone-700">{item.invoice_number || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Date: {item.purchase_date || 'N/A'}</span>
                      <span>•</span>
                      <span>Batch: {item.batch_filename}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedQueueItem(item)}
                      className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Link to Customer</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedQueueItem(item);
                        handleResolveQueueItem('discard');
                      }}
                      className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                      title="Discard item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolve Link Modal */}
          {selectedQueueItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-stone-900">Link Bill to Customer</h3>
                  <button onClick={() => setSelectedQueueItem(null)} className="text-stone-400 hover:text-stone-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-stone-50 p-3 rounded-xl text-xs space-y-1">
                  <div><strong>Item:</strong> {selectedQueueItem.item_name}</div>
                  <div><strong>Amount:</strong> ₹{selectedQueueItem.amount}</div>
                  <div><strong>Invoice:</strong> {selectedQueueItem.invoice_number}</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Enter Customer Mobile Number:</label>
                  <input
                    type="tel"
                    required
                    value={linkPhone}
                    onChange={(e) => setLinkPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Customer Name (Optional):</label>
                  <input
                    type="text"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    placeholder="Customer Name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    onClick={() => setSelectedQueueItem(null)}
                    className="flex-1 py-2 rounded-xl border border-stone-200 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResolveQueueItem('link')}
                    disabled={resolving || !linkPhone}
                    className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
                  >
                    {resolving ? 'Linking...' : 'Confirm & Link'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 4: IMPORT HISTORY & AUDIT LOG */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Upload Timestamp</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Processed</th>
                  <th className="py-3 px-4 text-emerald-700">Added</th>
                  <th className="py-3 px-4 text-amber-700">Duplicates</th>
                  <th className="py-3 px-4 text-purple-700">Review Queue</th>
                  <th className="py-3 px-4">Uploaded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">No import batches run yet.</td>
                  </tr>
                ) : (
                  batches.map(b => (
                    <tr key={b.id} className="hover:bg-stone-50">
                      <td className="py-3 px-4 font-mono text-stone-600">
                        {new Date(b.uploaded_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">{b.filename}</td>
                      <td className="py-3 px-4">{b.rows_processed} rows</td>
                      <td className="py-3 px-4 font-bold text-emerald-700">+{b.rows_added}</td>
                      <td className="py-3 px-4 text-amber-700">{b.rows_duplicate}</td>
                      <td className="py-3 px-4 text-purple-700">{b.rows_needs_review}</td>
                      <td className="py-3 px-4 text-stone-500">{b.uploaded_by_name || 'Staff'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
