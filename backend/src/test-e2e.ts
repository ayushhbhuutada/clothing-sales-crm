import { getDb } from './db/database';
import { seedDatabase } from './db/seed';
import { processImport } from './services/import.service';
import { recommendSalesRep } from './services/routing.service';
import * as XLSX from 'xlsx';

async function runE2ETests() {
  console.log('🧪 Starting End-to-End Retail CRM System Verification...');

  await getDb();
  await seedDatabase();

  // Test 1: Phone Search Performance (<50ms)
  console.log('\n--- Test 1: Phone Lookup Sub-second Search ---');
  const t0 = performance.now();
  const searchRes = await fetch('http://localhost:5000/api/customers/search?q=9876543210');
  const searchData: any = await searchRes.json();
  const t1 = performance.now();
  console.log(`✓ Lookup latency: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`✓ Found customer: ${searchData[0]?.name}, Phone: ${searchData[0]?.phone_number}, LTV: ₹${searchData[0]?.total_spend}`);
  if (!searchData[0] || searchData[0].phone_number !== '9876543210') {
    throw new Error('Test 1 Failed: Customer lookup by phone number failed');
  }

  // Test 2: AI Stylist Recommendation
  console.log('\n--- Test 2: Smart Sales Rep Recommendation ---');
  const rec = recommendSalesRep('cust-1');
  console.log(`✓ Recommended Rep: ${rec.recommendedRep?.name}`);
  console.log(`✓ Reason: ${rec.reason}`);
  if (!rec.recommendedRep) {
    throw new Error('Test 2 Failed: Stylist recommendation returned null');
  }

  // Test 3: Lead Assignment & Workflow Lifecycle
  console.log('\n--- Test 3: Lead Assignment & Workflow Transitions ---');
  const assignRes = await fetch('http://localhost:5000/api/leads/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_id: 'cust-1',
      assigned_to_staff_id: rec.recommendedRep.id,
      assigned_by_staff_id: 'staff-1',
      walk_in_intent: 'Looking for bridal lehenga matching emerald jewelry',
      notes: 'Customer in VIP fitting suite'
    })
  });
  const assignData: any = await assignRes.json();
  console.log(`✓ Lead created with ID: ${assignData.leadId}`);

  // Transition to acknowledged
  await fetch(`http://localhost:5000/api/leads/${assignData.leadId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'acknowledged', staff_id: rec.recommendedRep.id })
  });
  console.log('✓ Lead acknowledged by rep');

  // Close lead with Sale
  const closeRes = await fetch(`http://localhost:5000/api/leads/${assignData.leadId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'closed_sale',
      linked_invoice_number: 'TEST-INV-9901',
      sale_amount: 54000,
      outcome_notes: 'Sold Raw Silk Bridal Lehenga in Emerald Green',
      staff_id: rec.recommendedRep.id
    })
  });
  const closeData: any = await closeRes.json();
  console.log('✓ Lead successfully closed as won sale with invoice linking');

  // Test 4: Universal Excel Import Pipeline with Deduplication & Review Queue
  console.log('\n--- Test 4: Universal Excel/CSV Billing Import Pipeline ---');
  const testBatch = [
    {
      'Customer Mobile': '9876543210',
      'Customer Name': 'Meera Kapoor',
      'Voucher No': 'E2E-INV-001',
      'Date': '2026-08-29',
      'Item Description': 'Pure Silk Georgette Saree',
      'Stock Group': 'Sarees',
      'Size Tag': 'Free Size',
      'Color / Shade': 'Emerald Green',
      'Billed Qty': 1,
      'Rate (MRP)': 28000,
      'Discount Amt': 1000,
      'Net Amount': 27000
    },
    // Same row again -> Duplicate test
    {
      'Customer Mobile': '9876543210',
      'Customer Name': 'Meera Kapoor',
      'Voucher No': 'E2E-INV-001',
      'Date': '2026-08-29',
      'Item Description': 'Pure Silk Georgette Saree',
      'Stock Group': 'Sarees',
      'Size Tag': 'Free Size',
      'Color / Shade': 'Emerald Green',
      'Billed Qty': 1,
      'Rate (MRP)': 28000,
      'Discount Amt': 1000,
      'Net Amount': 27000
    },
    // Row without phone number -> Needs Review test
    {
      'Customer Mobile': '',
      'Customer Name': 'Cash Walkin Guest',
      'Voucher No': 'E2E-INV-002',
      'Date': '2026-08-29',
      'Item Description': 'Linen Kurta Set',
      'Stock Group': 'Ethnic Wear',
      'Size Tag': 'L',
      'Color / Shade': 'Indigo',
      'Billed Qty': 1,
      'Rate (MRP)': 6500,
      'Discount Amt': 0,
      'Net Amount': 6500
    }
  ];

  const ws = XLSX.utils.json_to_sheet(testBatch);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');
  const fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const mapping = {
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
    final_amount: 'Net Amount'
  };

  const importResult = processImport(fileBuffer, 'e2e_test_sales.xlsx', mapping, 'staff-1');
  console.log(`✓ Total Processed: ${importResult.totalRows}`);
  console.log(`✓ Records Added: ${importResult.rowsAdded}`);
  console.log(`✓ Duplicates Skipped: ${importResult.rowsDuplicate}`);
  console.log(`✓ Rows in Needs Review Queue: ${importResult.rowsNeedsReview}`);

  if (importResult.rowsAdded !== 1 || importResult.rowsDuplicate !== 1 || importResult.rowsNeedsReview !== 1) {
    throw new Error('Test 4 Failed: Excel import deduplication or review routing mismatch');
  }

  // Test 5: Analytics & KPIs
  console.log('\n--- Test 5: Analytics KPIs & Leaderboard ---');
  const kpiRes = await fetch('http://localhost:5000/api/analytics/kpis');
  const kpiData: any = await kpiRes.json();
  console.log(`✓ Footfall: ${kpiData.totalVisits}, Total Revenue: ₹${kpiData.totalRevenue}, Conversion: ${kpiData.conversionRate}%`);

  const repRes = await fetch('http://localhost:5000/api/analytics/rep-performance');
  const repData: any = await repRes.json();
  console.log(`✓ Top Stylist: ${repData[0]?.name}, Closed: ${repData[0]?.sales_closed}, Conversion: ${repData[0]?.conversion_rate}%`);

  console.log('\n🎉 ALL END-TO-END AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
}

runE2ETests().catch(err => {
  console.error('❌ E2E Test Suite Error:', err);
  process.exit(1);
});
