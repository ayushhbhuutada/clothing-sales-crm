import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database';
import { sseBroadcaster } from './broadcaster';

export interface FieldMapping {
  phone_number?: string;
  customer_name?: string;
  invoice_number?: string;
  purchase_date?: string;
  item_name?: string;
  sku?: string;
  category?: string;
  size?: string;
  color?: string;
  quantity?: string;
  price?: string;
  discount?: string;
  final_amount?: string;
  staff_name?: string;
  branch_name?: string;
}

export interface ImportResult {
  batchId: string;
  filename: string;
  totalRows: number;
  rowsAdded: number;
  rowsDuplicate: number;
  rowsNeedsReview: number;
  rowsFailed: number;
  newCustomersCreated: number;
  details: {
    addedInvoices: string[];
    skippedDuplicates: string[];
    reviewRequired: string[];
    errors: { row: number; reason: string; raw: any }[];
  };
}

export function parseFileBuffer(fileBuffer: Buffer, filename: string): any[] {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'txt') {
    const csvText = fileBuffer.toString('utf-8');
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim()
    });
    return parsed.data;
  } else {
    // xlsx, xls
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return jsonData;
  }
}

export function cleanPhoneNumber(rawPhone: any): string | null {
  if (!rawPhone) return null;
  let str = String(rawPhone).trim();
  // Strip non-digit characters except +
  str = str.replace(/[^\d+]/g, '');
  // If starts with +91, remove +91
  if (str.startsWith('+91')) {
    str = str.substring(3);
  } else if (str.startsWith('91') && str.length === 12) {
    str = str.substring(2);
  } else if (str.startsWith('0') && str.length === 11) {
    str = str.substring(1);
  }
  // Validate 10-digit standard Indian mobile
  if (/^\d{10}$/.test(str)) {
    return str;
  }
  // Fallback: If 7-15 digits
  if (/^\d{7,15}$/.test(str)) {
    return str;
  }
  return null;
}

export function cleanDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  if (typeof rawDate === 'number') {
    // Excel serial date number
    const date = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const str = String(rawDate).trim();
  // Check if DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(str)) {
    const parts = str.split(/[-\/]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  // Check if YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

export function processImport(
  fileBuffer: Buffer,
  filename: string,
  mapping: FieldMapping,
  uploaderStaffId: string,
  templateId?: string,
  branchId?: string
): ImportResult {
  const rows = parseFileBuffer(fileBuffer, filename);
  const batchId = uuidv4();
  const now = new Date().toISOString();

  let rowsAdded = 0;
  let rowsDuplicate = 0;
  let rowsNeedsReview = 0;
  let rowsFailed = 0;
  let newCustomersCreated = 0;

  const addedInvoices: string[] = [];
  const skippedDuplicates: string[] = [];
  const reviewRequired: string[] = [];
  const errors: { row: number; reason: string; raw: any }[] = [];

  const defaultBranchId = branchId || 'branch-1';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      // Map fields according to template
      const rawPhone = mapping.phone_number ? row[mapping.phone_number] : (row['phone_number'] || row['Phone'] || row['Mobile'] || row['Customer Mobile']);
      const rawName = mapping.customer_name ? row[mapping.customer_name] : (row['name'] || row['Customer Name'] || row['Party Name'] || 'Customer');
      const invoiceNo = String(mapping.invoice_number ? row[mapping.invoice_number] : (row['invoice_number'] || row['Invoice Number'] || row['Voucher No'] || row['Bill No'] || `BILL-${batchId.substring(0, 4)}-${rowNum}`)).trim();
      const rawDate = mapping.purchase_date ? row[mapping.purchase_date] : (row['purchase_date'] || row['Date'] || row['Invoice Date'] || row['Bill Date']);
      const itemName = String(mapping.item_name ? row[mapping.item_name] : (row['item_name'] || row['Item Description'] || row['Product Name'] || 'Apparel Item')).trim();
      const sku = mapping.sku ? String(row[mapping.sku] || '') : (row['sku'] || row['SKU'] || '');
      const category = String(mapping.category ? row[mapping.category] : (row['category'] || row['Stock Group'] || row['Class'] || 'Apparel')).trim();
      const size = String(mapping.size ? row[mapping.size] : (row['size'] || row['Size'] || row['Size Tag'] || '')).trim();
      const color = String(mapping.color ? row[mapping.color] : (row['color'] || row['Color'] || row['Color / Shade'] || '')).trim();
      const qty = parseFloat(mapping.quantity ? row[mapping.quantity] : (row['quantity'] || row['Qty'] || row['Billed Qty'] || '1')) || 1;
      const price = parseFloat(mapping.price ? row[mapping.price] : (row['price'] || row['Rate'] || row['MRP'] || row['Price/Unit'] || '0')) || 0;
      const discount = parseFloat(mapping.discount ? row[mapping.discount] : (row['discount'] || row['Discount'] || row['Discount Amt'] || '0')) || 0;
      let finalAmt = parseFloat(mapping.final_amount ? row[mapping.final_amount] : (row['final_amount'] || row['Net Amount'] || row['Total Amount'] || row['Net Value'] || '0'));

      if (isNaN(finalAmt) || finalAmt === 0) {
        finalAmt = (price * qty) - discount;
      }

      const purchaseDate = cleanDate(rawDate);
      const phone = cleanPhoneNumber(rawPhone);

      // Unique hash for deduplication
      const rowHash = `${invoiceNo}#${purchaseDate}#${itemName}#${finalAmt.toFixed(2)}`;

      // Check if this purchase row already exists
      const existingPurchase = queryOne('SELECT id FROM purchases WHERE row_hash = ?', [rowHash]);
      if (existingPurchase) {
        rowsDuplicate++;
        skippedDuplicates.push(`${invoiceNo} (${itemName})`);
        continue;
      }

      // Check if phone number is present
      if (!phone) {
        // Route to Needs Review queue
        const reviewId = uuidv4();
        run(`
          INSERT INTO import_review_queue (id, batch_id, raw_data, reason, invoice_number, purchase_date, amount, item_name, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `, [
          reviewId,
          batchId,
          JSON.stringify(row),
          'Missing or unparseable phone number',
          invoiceNo,
          purchaseDate,
          finalAmt,
          itemName,
          now
        ]);
        rowsNeedsReview++;
        reviewRequired.push(`Invoice ${invoiceNo}: ${itemName} (₹${finalAmt})`);
        continue;
      }

      // Find or create customer
      let customer = queryOne('SELECT * FROM customers WHERE phone_number = ?', [phone]);
      let customerId: string;

      if (!customer) {
        // Auto-create bare minimum customer profile
        customerId = uuidv4();
        const initialTags = JSON.stringify(['Created via Import']);
        run(`
          INSERT INTO customers (id, phone_number, name, email, dob, anniversary, gender, referred_by, tags, total_spend, visit_count, last_visit_date, is_imported_placeholder, branch_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        `, [
          customerId,
          phone,
          rawName && rawName !== 'Customer' ? String(rawName).trim() : `Customer (${phone.slice(-4)})`,
          null, null, null, null, 'Billing Import',
          initialTags,
          finalAmt,
          1,
          purchaseDate,
          defaultBranchId,
          now,
          now
        ]);
        newCustomersCreated++;
      } else {
        customerId = customer.id;
        // Update customer statistics
        const newTotalSpend = (customer.total_spend || 0) + finalAmt;
        const newVisitCount = (customer.visit_count || 0) + 1;
        const latestVisitDate = !customer.last_visit_date || purchaseDate > customer.last_visit_date
          ? purchaseDate
          : customer.last_visit_date;

        run(`
          UPDATE customers 
          SET total_spend = ?, visit_count = ?, last_visit_date = ?, updated_at = ?
          WHERE id = ?
        `, [newTotalSpend, newVisitCount, latestVisitDate, now, customerId]);
      }

      // Insert Purchase
      const purchaseId = uuidv4();
      run(`
        INSERT INTO purchases (id, customer_id, invoice_number, item_name, sku, category, size, color, quantity, price, discount, final_amount, purchase_date, branch_id, sold_by_staff_id, source_import_id, row_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        purchaseId,
        customerId,
        invoiceNo,
        itemName,
        sku,
        category,
        size,
        color,
        qty,
        price,
        discount,
        finalAmt,
        purchaseDate,
        defaultBranchId,
        uploaderStaffId,
        batchId,
        rowHash,
        now
      ]);

      // If size or color is present, record as customer preference if not already present
      if (size && size !== 'Free Size' && size !== '') {
        const existingPref = queryOne('SELECT id FROM preferences WHERE customer_id = ? AND type = ? AND value = ?', [customerId, 'top_size', size]);
        if (!existingPref) {
          run('INSERT INTO preferences (id, customer_id, type, value, added_by_staff_id, staff_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
            uuidv4(), customerId, 'top_size', size, uploaderStaffId, 'Billing System Import', now
          ]);
        }
      }

      if (category && category !== 'Apparel' && category !== '') {
        const existingCat = queryOne('SELECT id FROM preferences WHERE customer_id = ? AND type = ? AND value = ?', [customerId, 'category', category]);
        if (!existingCat) {
          run('INSERT INTO preferences (id, customer_id, type, value, added_by_staff_id, staff_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
            uuidv4(), customerId, 'category', category, uploaderStaffId, 'Billing System Import', now
          ]);
        }
      }

      rowsAdded++;
      addedInvoices.push(`${invoiceNo} - ${itemName}`);
    } catch (err: any) {
      console.error(`Error processing row ${rowNum}:`, err);
      rowsFailed++;
      errors.push({
        row: rowNum,
        reason: err?.message || 'Unknown processing error',
        raw: row
      });
    }
  }

  // Record batch summary
  const summaryJson = JSON.stringify({
    addedCount: rowsAdded,
    duplicatesCount: rowsDuplicate,
    reviewCount: rowsNeedsReview,
    failedCount: rowsFailed,
    newCustomersCount: newCustomersCreated
  });

  run(`
    INSERT INTO import_batches (id, uploaded_by_staff_id, filename, file_size, uploaded_at, mapping_template_id, rows_processed, rows_added, rows_duplicate, rows_needs_review, rows_failed, log_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    batchId,
    uploaderStaffId,
    filename,
    fileBuffer.length,
    now,
    templateId || null,
    rows.length,
    rowsAdded,
    rowsDuplicate,
    rowsNeedsReview,
    rowsFailed,
    summaryJson
  ]);

  // Log activity
  const uploader = queryOne('SELECT name FROM staff WHERE id = ?', [uploaderStaffId]);
  const uploaderName = uploader?.name || 'Staff';
  run(`
    INSERT INTO activity_logs (id, customer_id, staff_id, staff_name, action_type, description, metadata, created_at)
    VALUES (?, ?, ?, ?, 'data_imported', ?, ?, ?)
  `, [
    uuidv4(),
    null,
    uploaderStaffId,
    uploaderName,
    `Imported ${rowsAdded} sales records from ${filename} (${rowsDuplicate} duplicates skipped, ${rowsNeedsReview} in review queue)`,
    summaryJson,
    now
  ]);

  // Broadcast realtime import completed
  sseBroadcaster.broadcast('IMPORT_COMPLETED', {
    batchId,
    filename,
    rowsAdded,
    rowsDuplicate,
    rowsNeedsReview,
    newCustomersCreated
  });

  return {
    batchId,
    filename,
    totalRows: rows.length,
    rowsAdded,
    rowsDuplicate,
    rowsNeedsReview,
    rowsFailed,
    newCustomersCreated,
    details: {
      addedInvoices,
      skippedDuplicates,
      reviewRequired,
      errors
    }
  };
}
