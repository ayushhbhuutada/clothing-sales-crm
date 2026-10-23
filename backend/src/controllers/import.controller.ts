import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { query, queryOne, run } from '../db/database';
import { processImport, parseFileBuffer, cleanPhoneNumber, cleanDate } from '../services/import.service';

export const getTemplates = (req: Request, res: Response): void => {
  try {
    const templates = query('SELECT * FROM column_mapping_templates ORDER BY created_at DESC');
    const parsed = templates.map(t => ({
      ...t,
      field_mapping: JSON.parse(t.field_mapping || '{}')
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const saveTemplate = (req: Request, res: Response): void => {
  try {
    const { id, name, billing_software_name, field_mapping, branch_id } = req.body;

    if (!name || !field_mapping) {
      res.status(400).json({ error: 'Template name and field mapping are required' });
      return;
    }

    const mappingStr = typeof field_mapping === 'string' ? field_mapping : JSON.stringify(field_mapping);
    const templateId = id || uuidv4();
    const now = new Date().toISOString();

    const existing = id ? queryOne('SELECT id FROM column_mapping_templates WHERE id = ?', [id]) : null;

    if (existing) {
      run(`
        UPDATE column_mapping_templates 
        SET name = ?, billing_software_name = ?, field_mapping = ?
        WHERE id = ?
      `, [name, billing_software_name || 'Custom', mappingStr, id]);
    } else {
      run(`
        INSERT INTO column_mapping_templates (id, branch_id, name, billing_software_name, field_mapping, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [templateId, branch_id || null, name, billing_software_name || 'Custom', mappingStr, now]);
    }

    res.json({ success: true, templateId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const previewFile = (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const rows = parseFileBuffer(req.file.buffer, req.file.originalname);
    if (!rows || rows.length === 0) {
      res.status(400).json({ error: 'File is empty or could not be parsed' });
      return;
    }

    const headers = Object.keys(rows[0]);
    const sampleRows = rows.slice(0, 5);

    res.json({
      filename: req.file.originalname,
      totalRows: rows.length,
      headers,
      sampleRows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const uploadAndImport = (req: Request, res: Response): void => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { mapping, template_id, branch_id } = req.body;
    let fieldMapping = {};

    if (mapping) {
      fieldMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
    } else if (template_id) {
      const template = queryOne('SELECT field_mapping FROM column_mapping_templates WHERE id = ?', [template_id]);
      if (template) {
        fieldMapping = JSON.parse(template.field_mapping || '{}');
      }
    }

    const uploaderStaffId = req.staff!.id;
    const result = processImport(
      req.file.buffer,
      req.file.originalname,
      fieldMapping,
      uploaderStaffId,
      template_id,
      branch_id
    );

    res.json({
      success: true,
      result
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getBatches = (req: Request, res: Response): void => {
  try {
    const batches = query(`
      SELECT b.*, s.name as uploaded_by_name, t.name as template_name
      FROM import_batches b
      LEFT JOIN staff s ON b.uploaded_by_staff_id = s.id
      LEFT JOIN column_mapping_templates t ON b.mapping_template_id = t.id
      ORDER BY b.uploaded_at DESC
      LIMIT 20
    `);

    const parsed = batches.map(b => ({
      ...b,
      log_summary: JSON.parse(b.log_summary || '{}')
    }));

    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getReviewQueue = (req: Request, res: Response): void => {
  try {
    const items = query(`
      SELECT r.*, b.filename as batch_filename
      FROM import_review_queue r
      JOIN import_batches b ON r.batch_id = b.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);

    const parsed = items.map(i => ({
      ...i,
      raw_data: JSON.parse(i.raw_data || '{}')
    }));

    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const resolveReviewItem = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { action, customer_id, phone_number, customer_name } = req.body;
    const staff_id = req.staff!.id;

    const item = queryOne('SELECT * FROM import_review_queue WHERE id = ?', [id]);
    if (!item) {
      res.status(404).json({ error: 'Queue item not found' });
      return;
    }

    const now = new Date().toISOString();

    if (action === 'discard') {
      run('UPDATE import_review_queue SET status = ? WHERE id = ?', ['discarded', id]);
      res.json({ success: true, message: 'Item discarded from review queue' });
      return;
    }

    if (action === 'link') {
      let targetCustomerId = customer_id;
      let createdNewCustomer = false;

      // If creating new customer from modal
      if (!targetCustomerId && phone_number) {
        const cleaned = cleanPhoneNumber(phone_number);
        if (!cleaned) {
          res.status(400).json({ error: 'Valid phone number required' });
          return;
        }

        const existing = queryOne('SELECT id FROM customers WHERE phone_number = ?', [cleaned]);
        if (existing) {
          targetCustomerId = existing.id;
        } else {
          targetCustomerId = uuidv4();
          createdNewCustomer = true;
          run(`
            INSERT INTO customers (id, phone_number, name, email, dob, anniversary, gender, referred_by, tags, total_spend, visit_count, last_visit_date, is_imported_placeholder, branch_id, created_at, updated_at)
            VALUES (?, ?, ?, null, null, null, 'Female', 'Review Queue Resolution', '["Manual Import Linked"]', ?, 1, ?, 0, 'branch-1', ?, ?)
          `, [
            targetCustomerId,
            cleaned,
            customer_name || `Customer (${cleaned.slice(-4)})`,
            item.amount || 0,
            item.purchase_date || now.split('T')[0],
            now,
            now
          ]);
        }
      }

      if (!targetCustomerId) {
        res.status(400).json({ error: 'Customer must be selected or phone provided' });
        return;
      }

      // Create purchase for this customer
      const rawData = JSON.parse(item.raw_data || '{}');
      const purchaseId = uuidv4();
      const invoiceNo = item.invoice_number || `INV-${item.id.substring(0, 6)}`;
      const pDate = item.purchase_date || now.split('T')[0];
      const itemName = item.item_name || 'Apparel Item';
      const amount = item.amount || 0;
      const rowHash = `${invoiceNo}#${pDate}#${itemName}#${amount.toFixed(2)}#RESOLVED`;

      // A visit is one invoice, not one line item: only count it if this customer has no purchase on this invoice yet
      const isNewInvoiceVisit = !queryOne(
        'SELECT 1 FROM purchases WHERE customer_id = ? AND invoice_number = ? LIMIT 1',
        [targetCustomerId, invoiceNo]
      );

      run(`
        INSERT INTO purchases (id, customer_id, invoice_number, item_name, sku, category, size, color, quantity, price, discount, final_amount, purchase_date, branch_id, sold_by_staff_id, source_import_id, row_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?, ?, 'branch-1', ?, ?, ?, ?)
      `, [
        purchaseId,
        targetCustomerId,
        invoiceNo,
        itemName,
        rawData.sku || '',
        rawData.category || 'Apparel',
        rawData.size || '',
        rawData.color || '',
        amount,
        amount,
        pDate,
        staff_id || 'staff-1',
        item.batch_id,
        rowHash,
        now
      ]);

      // Update customer totals (a customer created above already has this purchase's spend and visit)
      const cust = createdNewCustomer ? null : queryOne('SELECT total_spend, visit_count FROM customers WHERE id = ?', [targetCustomerId]);
      if (cust) {
        run('UPDATE customers SET total_spend = ?, visit_count = ?, updated_at = ? WHERE id = ?', [
          (cust.total_spend || 0) + amount,
          (cust.visit_count || 0) + (isNewInvoiceVisit ? 1 : 0),
          now,
          targetCustomerId
        ]);
      }

      // Mark queue item as resolved
      run(`
        UPDATE import_review_queue 
        SET status = 'resolved', resolved_customer_id = ?
        WHERE id = ?
      `, [targetCustomerId, id]);

      res.json({ success: true, message: 'Purchase successfully linked to customer' });
      return;
    }

    res.status(400).json({ error: 'Invalid resolution action' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSampleTemplates = (req: Request, res: Response): void => {
  try {
    const sampleTallyData = [
      {
        'Customer Mobile': '9876543210',
        'Customer Name': 'Meera Kapoor',
        'Voucher No': 'TAL-9041',
        'Date': '2026-08-28',
        'Item Description': 'Chiffon Mirror-Work Kurti Set',
        'Stock Group': 'Ethnic Wear',
        'Size Tag': 'M',
        'Color / Shade': 'Pastel Lilac',
        'Billed Qty': 1,
        'Rate (MRP)': 16500,
        'Discount Amt': 1500,
        'Net Amount': 15000,
        'Sales Person': 'Rahul Verma'
      },
      {
        'Customer Mobile': '9812345678',
        'Customer Name': 'Rohan Khanna',
        'Voucher No': 'TAL-9042',
        'Date': '2026-08-28',
        'Item Description': 'Linen Formal Bandhgala Jacket',
        'Stock Group': 'Formals',
        'Size Tag': '42',
        'Color / Shade': 'Charcoal Slate',
        'Billed Qty': 1,
        'Rate (MRP)': 22000,
        'Discount Amt': 2000,
        'Net Amount': 20000,
        'Sales Person': 'Vikram Malhotra'
      },
      {
        'Customer Mobile': '9944556677',
        'Customer Name': 'Kavita Singhal',
        'Voucher No': 'TAL-9043',
        'Date': '2026-08-28',
        'Item Description': 'Organza Floral Printed Anarkali',
        'Stock Group': 'Bridal & Festive',
        'Size Tag': 'L',
        'Color / Shade': 'Dusty Rose',
        'Billed Qty': 1,
        'Rate (MRP)': 32000,
        'Discount Amt': 0,
        'Net Amount': 32000,
        'Sales Person': 'Ananya Sen'
      },
      {
        'Customer Mobile': '', // Missing phone -> routes to Needs Review
        'Customer Name': 'Walkin Guest Cash',
        'Voucher No': 'TAL-9044',
        'Date': '2026-08-28',
        'Item Description': 'Embroidered Silk Stole',
        'Stock Group': 'Accessories',
        'Size Tag': 'Free Size',
        'Color / Shade': 'Antique Gold',
        'Billed Qty': 1,
        'Rate (MRP)': 8500,
        'Discount Amt': 500,
        'Net Amount': 8000,
        'Sales Person': 'Rahul Verma'
      }
    ];

    res.json({
      tally: sampleTallyData
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
