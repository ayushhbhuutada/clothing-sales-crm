import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from './database';

export async function seedDatabase() {
  const existingBranches = query('SELECT COUNT(*) as count FROM branches');
  if (existingBranches[0] && existingBranches[0].count > 0) {
    return; // Already seeded
  }

  console.log('🌱 Seeding database with realistic boutique fashion data...');

  // 1. Branches
  const b1 = {
    id: 'branch-1',
    name: 'Aura Couture - Flagship Store',
    code: 'AURA-BLR-01',
    address: '100 Feet Road, Indiranagar, Bengaluru',
    phone: '+91 80 4123 4567',
    created_at: new Date().toISOString()
  };
  const b2 = {
    id: 'branch-2',
    name: 'Aura Couture - Mall Store',
    code: 'AURA-BLR-02',
    address: 'Phoenix Marketcity, Whitefield, Bengaluru',
    phone: '+91 80 4987 6543',
    created_at: new Date().toISOString()
  };

  run('INSERT INTO branches (id, name, code, address, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    b1.id, b1.name, b1.code, b1.address, b1.phone, b1.created_at
  ]);
  run('INSERT INTO branches (id, name, code, address, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    b2.id, b2.name, b2.code, b2.address, b2.phone, b2.created_at
  ]);

  // 2. Staff
  const staffMembers = [
    {
      id: 'staff-1',
      name: 'Simran Kaur',
      role: 'receptionist',
      branch_id: b1.id,
      phone: '+91 98000 11111',
      status: 'free',
      pin_code: '1111',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      specialty_category: 'Front Desk & Greeter',
      created_at: new Date().toISOString()
    },
    {
      id: 'staff-2',
      name: 'Rahul Verma',
      role: 'sales_rep',
      branch_id: b1.id,
      phone: '+91 98000 22222',
      status: 'free',
      pin_code: '2222',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      specialty_category: 'Ethnic & Bridal Couture',
      created_at: new Date().toISOString()
    },
    {
      id: 'staff-3',
      name: 'Ananya Sen',
      role: 'sales_rep',
      branch_id: b1.id,
      phone: '+91 98000 33333',
      status: 'free',
      pin_code: '3333',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      specialty_category: 'Contemporary, Western & Indo-Western',
      created_at: new Date().toISOString()
    },
    {
      id: 'staff-4',
      name: 'Vikram Malhotra',
      role: 'sales_rep',
      branch_id: b1.id,
      phone: '+91 98000 44444',
      status: 'busy',
      pin_code: '4444',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      specialty_category: 'Menswear, Sherwanis & Formals',
      created_at: new Date().toISOString()
    },
    {
      id: 'staff-5',
      name: 'Pooja Mehta',
      role: 'store_manager',
      branch_id: b1.id,
      phone: '+91 98000 55555',
      status: 'free',
      pin_code: '5555',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      specialty_category: 'Store Operations & Escalations',
      created_at: new Date().toISOString()
    },
    {
      id: 'staff-6',
      name: 'Aditya Singhania',
      role: 'owner',
      branch_id: b1.id,
      phone: '+91 98000 99999',
      status: 'free',
      pin_code: '9999',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      specialty_category: 'Executive Director',
      created_at: new Date().toISOString()
    }
  ];

  for (const s of staffMembers) {
    run('INSERT INTO staff (id, name, role, branch_id, phone, status, pin_code, avatar_url, specialty_category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      s.id, s.name, s.role, s.branch_id, s.phone, s.status, s.pin_code, s.avatar_url, s.specialty_category, s.created_at
    ]);
  }

  // 3. Mapping Templates
  const templates = [
    {
      id: 'tmpl-tally',
      branch_id: b1.id,
      name: 'Tally Prime Sales Register',
      billing_software_name: 'Tally',
      field_mapping: JSON.stringify({
        phone_number: 'Customer Mobile',
        customer_name: 'Customer Name',
        invoice_number: 'Voucher No',
        purchase_date: 'Date',
        item_name: 'Item Description',
        category: 'Stock Group',
        size: 'Size Tag',
        color: 'Color / Shade',
        quantity: 'Billed Qty',
        price: 'Rate (MRP)',
        discount: 'Discount Amt',
        final_amount: 'Net Amount',
        staff_name: 'Sales Person'
      }),
      created_at: new Date().toISOString()
    },
    {
      id: 'tmpl-vyapar',
      branch_id: b1.id,
      name: 'Vyapar Invoice Export',
      billing_software_name: 'Vyapar',
      field_mapping: JSON.stringify({
        phone_number: 'Phone Number',
        customer_name: 'Party Name',
        invoice_number: 'Invoice Number',
        purchase_date: 'Invoice Date',
        item_name: 'Item Name',
        category: 'Category',
        size: 'Size',
        color: 'Color',
        quantity: 'Quantity',
        price: 'Price/Unit',
        discount: 'Discount',
        final_amount: 'Total Amount',
        staff_name: 'Sales Rep'
      }),
      created_at: new Date().toISOString()
    },
    {
      id: 'tmpl-marg',
      branch_id: b1.id,
      name: 'Marg ERP Sales Dump',
      billing_software_name: 'Marg ERP',
      field_mapping: JSON.stringify({
        phone_number: 'Mobile No',
        customer_name: 'Party',
        invoice_number: 'Bill No',
        purchase_date: 'Bill Date',
        item_name: 'Product Details',
        category: 'Class',
        size: 'Size Code',
        color: 'Color Code',
        quantity: 'Qty',
        price: 'MRP',
        discount: 'Dis %',
        final_amount: 'Net Value',
        staff_name: 'Salesman'
      }),
      created_at: new Date().toISOString()
    },
    {
      id: 'tmpl-generic',
      branch_id: b1.id,
      name: 'Standard Retail CSV',
      billing_software_name: 'Custom',
      field_mapping: JSON.stringify({
        phone_number: 'phone_number',
        customer_name: 'name',
        invoice_number: 'invoice_number',
        purchase_date: 'date',
        item_name: 'item_name',
        category: 'category',
        size: 'size',
        color: 'color',
        quantity: 'quantity',
        price: 'price',
        discount: 'discount',
        final_amount: 'final_amount',
        staff_name: 'staff_name'
      }),
      created_at: new Date().toISOString()
    }
  ];

  for (const t of templates) {
    run('INSERT INTO column_mapping_templates (id, branch_id, name, billing_software_name, field_mapping, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      t.id, t.branch_id, t.name, t.billing_software_name, t.field_mapping, t.created_at
    ]);
  }

  // 4. Initial Customers
  const customers = [
    {
      id: 'cust-1',
      phone_number: '9876543210',
      name: 'Meera Kapoor',
      email: 'meera.kapoor@gmail.com',
      dob: '1990-09-14',
      anniversary: '2018-11-20',
      gender: 'Female',
      referred_by: 'Instagram Influencer Campaign',
      tags: JSON.stringify(['VIP', 'Wedding Shopper', 'Silk Lover', 'High Spender']),
      total_spend: 88500,
      visit_count: 5,
      last_visit_date: '2026-08-15',
      is_imported_placeholder: 0,
      branch_id: b1.id,
      created_at: '2025-10-12T11:00:00Z',
      updated_at: '2026-08-15T15:30:00Z'
    },
    {
      id: 'cust-2',
      phone_number: '9812345678',
      name: 'Rohan Khanna',
      email: 'rohan.khanna@outlook.com',
      dob: '1988-04-22',
      anniversary: '2016-02-14',
      gender: 'Male',
      referred_by: 'Walk-in',
      tags: JSON.stringify(['Regular Spender', 'Formal Wear', 'Quick Decision Maker']),
      total_spend: 42300,
      visit_count: 4,
      last_visit_date: '2026-08-10',
      is_imported_placeholder: 0,
      branch_id: b1.id,
      created_at: '2025-11-05T14:20:00Z',
      updated_at: '2026-08-10T17:15:00Z'
    },
    {
      id: 'cust-3',
      phone_number: '9765432109',
      name: 'Dr. Shweta Iyer',
      email: 'shweta.iyer@apollo.org',
      dob: '1985-09-02',
      anniversary: '2012-05-18',
      gender: 'Female',
      referred_by: 'Friend Recommendation',
      tags: JSON.stringify(['VIP', 'Handloom Enthusiast', 'Lapsed Regular (45d+)']),
      total_spend: 64900,
      visit_count: 6,
      last_visit_date: '2026-07-02',
      is_imported_placeholder: 0,
      branch_id: b1.id,
      created_at: '2025-06-18T10:00:00Z',
      updated_at: '2026-07-02T13:45:00Z'
    },
    {
      id: 'cust-4',
      phone_number: '9988776655',
      name: 'Arjun Reddy',
      email: 'arjun.reddy@techcorp.in',
      dob: '1993-12-05',
      anniversary: '2024-12-10',
      gender: 'Male',
      referred_by: 'Hoarding at MG Road',
      tags: JSON.stringify(['Groom Collection', 'Bulk Buyer', 'Custom Alterations']),
      total_spend: 125000,
      visit_count: 3,
      last_visit_date: '2026-08-20',
      is_imported_placeholder: 0,
      branch_id: b1.id,
      created_at: '2026-01-15T16:00:00Z',
      updated_at: '2026-08-20T19:00:00Z'
    },
    {
      id: 'cust-5',
      phone_number: '9123456780',
      name: 'Priya Sharma',
      email: 'priya.sharma99@gmail.com',
      dob: '1998-03-15',
      anniversary: null,
      gender: 'Female',
      referred_by: 'Instagram Ad',
      tags: JSON.stringify(['First Time Shopper', 'Gen-Z Trends', 'Pastels']),
      total_spend: 14500,
      visit_count: 1,
      last_visit_date: '2026-08-24',
      is_imported_placeholder: 0,
      branch_id: b1.id,
      created_at: '2026-08-24T12:00:00Z',
      updated_at: '2026-08-24T12:00:00Z'
    }
  ];

  for (const c of customers) {
    run('INSERT INTO customers (id, phone_number, name, email, dob, anniversary, gender, referred_by, tags, total_spend, visit_count, last_visit_date, is_imported_placeholder, branch_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      c.id, c.phone_number, c.name, c.email, c.dob, c.anniversary, c.gender, c.referred_by, c.tags, c.total_spend, c.visit_count, c.last_visit_date, c.is_imported_placeholder, c.branch_id, c.created_at, c.updated_at
    ]);
  }

  // 5. Purchases
  const purchases = [
    // Meera Kapoor
    {
      id: uuidv4(),
      customer_id: 'cust-1',
      invoice_number: 'INV-2026-0891',
      item_name: 'Raw Silk Bridal Anarkali Set with Zardozi Work',
      sku: 'SKU-ANK-089',
      category: 'Bridal & Festive',
      size: 'M',
      color: 'Emerald Green',
      quantity: 1,
      price: 48000,
      discount: 3000,
      final_amount: 45000,
      purchase_date: '2026-08-15',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-2',
      row_hash: 'INV-2026-0891-2026-08-15-45000-SKU-ANK-089'
    },
    {
      id: uuidv4(),
      customer_id: 'cust-1',
      invoice_number: 'INV-2026-0412',
      item_name: 'Handwoven Chanderi Kurta Set with Organza Dupatta',
      sku: 'SKU-KUR-112',
      category: 'Ethnic Wear',
      size: 'M',
      color: 'Pastel Peach',
      quantity: 1,
      price: 24500,
      discount: 2000,
      final_amount: 22500,
      purchase_date: '2026-05-10',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-2',
      row_hash: 'INV-2026-0412-2026-05-10-22500-SKU-KUR-112'
    },
    {
      id: uuidv4(),
      customer_id: 'cust-1',
      invoice_number: 'INV-2025-1102',
      item_name: 'Banarasi Georgette Saree with Floral Jaal',
      sku: 'SKU-SAR-441',
      category: 'Sarees',
      size: 'Free Size',
      color: 'Royal Magenta',
      quantity: 1,
      price: 21000,
      discount: 0,
      final_amount: 21000,
      purchase_date: '2025-11-25',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-3',
      row_hash: 'INV-2025-1102-2025-11-25-21000-SKU-SAR-441'
    },

    // Rohan Khanna
    {
      id: uuidv4(),
      customer_id: 'cust-2',
      invoice_number: 'INV-2026-0870',
      item_name: 'Pure Italian Wool Tailored Blazer',
      sku: 'SKU-BLZ-901',
      category: 'Formals',
      size: '42',
      color: 'Navy Blue',
      quantity: 1,
      price: 26500,
      discount: 1500,
      final_amount: 25000,
      purchase_date: '2026-08-10',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-4',
      row_hash: 'INV-2026-0870-2026-08-10-25000-SKU-BLZ-901'
    },
    {
      id: uuidv4(),
      customer_id: 'cust-2',
      invoice_number: 'INV-2026-0610',
      item_name: 'Egyptian Giza Cotton Formal Shirts (Pack of 2)',
      sku: 'SKU-SHT-204',
      category: 'Formals',
      size: '42',
      color: 'Crisp White / Light Sky',
      quantity: 2,
      price: 18000,
      discount: 700,
      final_amount: 17300,
      purchase_date: '2026-06-12',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-4',
      row_hash: 'INV-2026-0610-2026-06-12-17300-SKU-SHT-204'
    },

    // Dr. Shweta Iyer
    {
      id: uuidv4(),
      customer_id: 'cust-3',
      invoice_number: 'INV-2026-0701',
      item_name: 'Tussar Hand-Block Printed Saree with Zari Border',
      sku: 'SKU-SAR-909',
      category: 'Sarees',
      size: 'Free Size',
      color: 'Indigo & Ochre',
      quantity: 1,
      price: 34000,
      discount: 2000,
      final_amount: 32000,
      purchase_date: '2026-07-02',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-3',
      row_hash: 'INV-2026-0701-2026-07-02-32000-SKU-SAR-909'
    },
    {
      id: uuidv4(),
      customer_id: 'cust-3',
      invoice_number: 'INV-2026-0290',
      item_name: 'Pure Linen Handloom Co-ord Set',
      sku: 'SKU-CRD-310',
      category: 'Indo-Western',
      size: 'S',
      color: 'Terracotta Rust',
      quantity: 1,
      price: 18500,
      discount: 1000,
      final_amount: 17500,
      purchase_date: '2026-03-14',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-3',
      row_hash: 'INV-2026-0290-2026-03-14-17500-SKU-CRD-310'
    },
    {
      id: uuidv4(),
      customer_id: 'cust-3',
      invoice_number: 'INV-2025-1022',
      item_name: 'Handcrafted Silk Dupatta with Kantha Stitch',
      sku: 'SKU-DUP-102',
      category: 'Accessories',
      size: 'Free Size',
      color: 'Mustard Yellow',
      quantity: 1,
      price: 15400,
      discount: 0,
      final_amount: 15400,
      purchase_date: '2025-10-22',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-2',
      row_hash: 'INV-2025-1022-2025-10-22-15400-SKU-DUP-102'
    },

    // Arjun Reddy
    {
      id: uuidv4(),
      customer_id: 'cust-4',
      invoice_number: 'INV-2026-0902',
      item_name: 'Hand-Embroidered Raw Silk Groom Sherwani with Stole',
      sku: 'SKU-SHR-770',
      category: 'Bridal & Festive',
      size: '40',
      color: 'Ivory Gold',
      quantity: 1,
      price: 95000,
      discount: 5000,
      final_amount: 90000,
      purchase_date: '2026-08-20',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-4',
      row_hash: 'INV-2026-0902-2026-08-20-90000-SKU-SHR-770'
    },
    {
      id: uuidv4(),
      customer_id: 'cust-4',
      invoice_number: 'INV-2026-0903',
      item_name: 'Silk Kurta Churidar with Bandi Jacket',
      sku: 'SKU-BND-402',
      category: 'Ethnic Wear',
      size: '40',
      color: 'Sage Green',
      quantity: 1,
      price: 35000,
      discount: 0,
      final_amount: 35000,
      purchase_date: '2026-08-20',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-4',
      row_hash: 'INV-2026-0903-2026-08-20-35000-SKU-BND-402'
    },

    // Priya Sharma
    {
      id: uuidv4(),
      customer_id: 'cust-5',
      invoice_number: 'INV-2026-0915',
      item_name: 'Pastel Lilac Organza Co-ord Set with Mirror Detailing',
      sku: 'SKU-CRD-812',
      category: 'Indo-Western',
      size: 'M',
      color: 'Lilac Lavender',
      quantity: 1,
      price: 15500,
      discount: 1000,
      final_amount: 14500,
      purchase_date: '2026-08-24',
      branch_id: b1.id,
      sold_by_staff_id: 'staff-3',
      row_hash: 'INV-2026-0915-2026-08-24-14500-SKU-CRD-812'
    }
  ];

  for (const p of purchases) {
    run('INSERT INTO purchases (id, customer_id, invoice_number, item_name, sku, category, size, color, quantity, price, discount, final_amount, purchase_date, branch_id, sold_by_staff_id, row_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      p.id, p.customer_id, p.invoice_number, p.item_name, p.sku, p.category, p.size, p.color, p.quantity, p.price, p.discount, p.final_amount, p.purchase_date, p.branch_id, p.sold_by_staff_id, p.row_hash, new Date().toISOString()
    ]);
  }

  // 6. Preferences
  const preferences = [
    // Meera Kapoor
    { customer_id: 'cust-1', type: 'top_size', value: 'M / 38', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'bottom_size', value: '30 / M', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'color', value: 'Emerald Green', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'color', value: 'Pastel Peach', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'color', value: 'Powder Blue', added_by: 'staff-3', staff_name: 'Ananya Sen' },
    { customer_id: 'cust-1', type: 'fabric', value: 'Pure Chiffon & Raw Silk', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'fabric', value: 'Handwoven Organza', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'category', value: 'Bridal & Festive Kurtis', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'budget', value: '₹30,000 - ₹75,000', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'style_note', value: 'Prefers deep sweetheart necklines, hates stiff polyester linings. Buying for brother\'s wedding in December.', added_by: 'staff-2', staff_name: 'Rahul Verma' },
    { customer_id: 'cust-1', type: 'dislike', value: 'Avoid neon colors and heavy sequins that scratch the neck.', added_by: 'staff-2', staff_name: 'Rahul Verma' },

    // Rohan Khanna
    { customer_id: 'cust-2', type: 'top_size', value: '42 / Large', added_by: 'staff-4', staff_name: 'Vikram Malhotra' },
    { customer_id: 'cust-2', type: 'bottom_size', value: '34 Waist', added_by: 'staff-4', staff_name: 'Vikram Malhotra' },
    { customer_id: 'cust-2', type: 'footwear_size', value: 'UK 9 / 43', added_by: 'staff-4', staff_name: 'Vikram Malhotra' },
    { customer_id: 'cust-2', type: 'color', value: 'Navy Blue & Charcoal Grey', added_by: 'staff-4', staff_name: 'Vikram Malhotra' },
    { customer_id: 'cust-2', type: 'fabric', value: 'Italian Wool & 100% Giza Cotton', added_by: 'staff-4', staff_name: 'Vikram Malhotra' },
    { customer_id: 'cust-2', type: 'budget', value: '₹20,000 - ₹40,000', added_by: 'staff-4', staff_name: 'Vikram Malhotra' },
    { customer_id: 'cust-2', type: 'style_note', value: 'Likes slim structured shoulders on suits; sleeve length needs 0.5 inch shortening on readymades.', added_by: 'staff-4', staff_name: 'Vikram Malhotra' },

    // Dr. Shweta Iyer
    { customer_id: 'cust-3', type: 'top_size', value: 'S / 36', added_by: 'staff-3', staff_name: 'Ananya Sen' },
    { customer_id: 'cust-3', type: 'color', value: 'Earthy Ochre & Indigo', added_by: 'staff-3', staff_name: 'Ananya Sen' },
    { customer_id: 'cust-3', type: 'fabric', value: 'Tussar Silk, Matka Silk & Khadi', added_by: 'staff-3', staff_name: 'Ananya Sen' },
    { customer_id: 'cust-3', type: 'budget', value: '₹25,000 - ₹50,000', added_by: 'staff-3', staff_name: 'Ananya Sen' },
    { customer_id: 'cust-3', type: 'style_note', value: 'Loves hand-painted Kalamkari and natural plant dyes. Always check blouse piece length.', added_by: 'staff-3', staff_name: 'Ananya Sen' },

    // Priya Sharma
    { customer_id: 'cust-5', type: 'top_size', value: 'M / 38', added_by: 'staff-3', staff_name: 'Ananya Sen' },
    { customer_id: 'cust-5', type: 'color', value: 'Pastel Lilac & Mint', added_by: 'staff-3', staff_name: 'Ananya Sen' },
    { customer_id: 'cust-5', type: 'category', value: 'Indo-Western Co-ords', added_by: 'staff-3', staff_name: 'Ananya Sen' },
    { customer_id: 'cust-5', type: 'budget', value: '₹10,000 - ₹20,000', added_by: 'staff-3', staff_name: 'Ananya Sen' }
  ];

  for (const pref of preferences) {
    run('INSERT INTO preferences (id, customer_id, type, value, added_by_staff_id, staff_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      uuidv4(), pref.customer_id, pref.type, pref.value, pref.added_by, pref.staff_name, new Date().toISOString()
    ]);
  }

  // 7. Visits
  const visits = [
    { customer_id: 'cust-1', date: '2026-08-15', type: 'purchase', staff_id: 'staff-2', notes: 'Purchased Bridal Anarkali for brother\'s sangeet.' },
    { customer_id: 'cust-1', date: '2026-07-20', type: 'walk_in', staff_id: 'staff-2', notes: 'Explored fabric swatches for bridal lehenga.' },
    { customer_id: 'cust-2', date: '2026-08-10', type: 'purchase', staff_id: 'staff-4', notes: 'Bought Navy blazer for conference.' },
    { customer_id: 'cust-3', date: '2026-07-02', type: 'purchase', staff_id: 'staff-3', notes: 'Picked up Tussar Saree collection.' },
    { customer_id: 'cust-4', date: '2026-08-20', type: 'purchase', staff_id: 'staff-4', notes: 'Groom trial and final sherwani purchase.' },
    { customer_id: 'cust-5', date: '2026-08-24', type: 'purchase', staff_id: 'staff-3', notes: 'First visit, bought lilac co-ord set.' }
  ];

  for (const v of visits) {
    run('INSERT INTO visits (id, customer_id, branch_id, visit_date, visit_type, handled_by_staff_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      uuidv4(), v.customer_id, b1.id, v.date, v.type, v.staff_id, v.notes, new Date().toISOString()
    ]);
  }

  // 8. Sample Active Leads (to show live floor queue immediately)
  const sampleLeads = [
    {
      id: 'lead-101',
      customer_id: 'cust-1',
      branch_id: b1.id,
      assigned_to_staff_id: 'staff-2',
      assigned_by_staff_id: 'staff-1',
      status: 'in_progress',
      walk_in_intent: 'Looking for matching jewelry or dupatta for wedding anarkali',
      outcome_notes: 'Consulting client in Trial Room #2',
      follow_up_date: null,
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      acknowledged_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 'lead-102',
      customer_id: 'cust-5',
      branch_id: b1.id,
      assigned_to_staff_id: 'staff-3',
      assigned_by_staff_id: 'staff-1',
      status: 'new',
      walk_in_intent: 'Browsing new festive collection drop',
      outcome_notes: null,
      follow_up_date: null,
      created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      acknowledged_at: null,
      closed_at: null
    }
  ];

  for (const l of sampleLeads) {
    run('INSERT INTO leads (id, customer_id, branch_id, assigned_to_staff_id, assigned_by_staff_id, status, walk_in_intent, outcome_notes, no_sale_reason, linked_invoice_number, sale_amount, follow_up_date, created_at, updated_at, acknowledged_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      l.id, l.customer_id, l.branch_id, l.assigned_to_staff_id, l.assigned_by_staff_id, l.status, l.walk_in_intent, l.outcome_notes, null, null, null, l.follow_up_date, l.created_at, l.updated_at, l.acknowledged_at, l.closed_at
    ]);
  }

  // 9. Activity Logs
  const initialLogs = [
    { customer_id: 'cust-1', staff_id: 'staff-1', staff_name: 'Simran Kaur', action_type: 'lead_assigned', description: 'Assigned customer to Rahul Verma (Ethnic & Bridal)' },
    { customer_id: 'cust-1', staff_id: 'staff-2', staff_name: 'Rahul Verma', action_type: 'lead_acknowledged', description: 'Rahul Verma acknowledged lead and initiated styling consultation' },
    { customer_id: 'cust-5', staff_id: 'staff-1', staff_name: 'Simran Kaur', action_type: 'lead_assigned', description: 'Assigned walk-in lead to Ananya Sen' }
  ];

  for (const log of initialLogs) {
    run('INSERT INTO activity_logs (id, customer_id, staff_id, staff_name, action_type, description, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
      uuidv4(), log.customer_id, log.staff_id, log.staff_name, log.action_type, log.description, '{}', new Date().toISOString()
    ]);
  }

  console.log('✅ Database seeded successfully with branches, staff, customers, purchases, preferences, and leads!');
}
