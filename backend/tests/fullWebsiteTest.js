require('dotenv').config();

/**
 * Comprehensive Full Website & API End-to-End Test Suite
 * Tests all backend APIs, database persistence, UPI dynamic QR, auto-payment trigger,
 * order placement, customer flows, and admin portal.
 */

const BASE_URL = 'http://localhost:5000';

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  async run(name, fn) {
    process.stdout.write(`  ⏳ ${name}... `);
    try {
      await fn();
      this.passed++;
      this.results.push({ name, status: 'PASS' });
      console.log('✅ PASS');
    } catch (err) {
      this.failed++;
      this.results.push({ name, status: 'FAIL', error: err.message });
      console.log(`❌ FAIL: ${err.message}`);
    }
  }

  summary() {
    console.log('\n=============================================');
    console.log(`TEST SUMMARY: Total: ${this.passed + this.failed} | Passed: ${this.passed} | Failed: ${this.failed}`);
    console.log('=============================================');
    return this.failed === 0;
  }
}

async function request(path, options = {}, cookies = '') {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookies ? { 'Cookie': cookies } : {}),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const setCookieHeader = response.headers.get('set-cookie');
  let newCookie = cookies;
  if (setCookieHeader) {
    const match = setCookieHeader.match(/connect\.sid=[^;]+/);
    if (match) newCookie = match[0];
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, data, cookie: newCookie };
}

async function main() {
  console.log('=============================================');
  console.log('🚀 STARTING FULL WEBSITE & API TEST SUITE');
  console.log(`Target: ${BASE_URL}`);
  console.log('=============================================\n');

  const runner = new TestRunner();
  let customerCookie = '';
  let adminCookie = '';
  let sampleProduct = null;
  let testOrderId = null;
  let testOrderNumber = null;
  let testAddressId = null;

  // SECTION 1: SYSTEM HEALTH & STATIC ASSETS
  console.log('--- SECTION 1: Health & Static Pages ---');
  
  await runner.run('Server Health Check (GET /api/health)', async () => {
    const res = await request('/api/health');
    if (res.status !== 200 || !res.data.status) {
      throw new Error(`Expected 200 with status ok, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  const pagesToTest = [
    '/',
    '/products.html',
    '/price-list.html',
    '/cart.html',
    '/checkout.html',
    '/order-details.html',
    '/orders.html',
    '/wishlist.html',
    '/login.html',
    '/contact.html',
    '/about.html',
    '/admin/login.html',
    '/admin/dashboard.html',
    '/admin/orders.html',
    '/admin/products.html'
  ];

  for (const page of pagesToTest) {
    await runner.run(`Static Page Reachable: ${page}`, async () => {
      const res = await request(page);
      if (res.status !== 200) {
        throw new Error(`Page returned status ${res.status}`);
      }
      if (typeof res.data !== 'string' || !res.data.includes('<html')) {
        throw new Error(`Page did not return valid HTML content`);
      }
    });
  }

  const assetFiles = [
    '/css/style.css',
    '/js/app.js',
    '/js/checkout.js',
    '/js/cart.js',
    '/js/products.js',
    '/js/price-list.js',
    '/js/orders.js',
    '/js/admin.js'
  ];

  for (const asset of assetFiles) {
    await runner.run(`Core Asset Reachable: ${asset}`, async () => {
      const res = await request(asset);
      if (res.status !== 200) {
        throw new Error(`Asset returned status ${res.status}`);
      }
    });
  }

  // SECTION 2: CATALOGUE & PUBLIC APIS
  console.log('\n--- SECTION 2: Catalogue & Public APIs ---');

  await runner.run('Categories List (GET /api/categories)', async () => {
    const res = await request('/api/categories');
    if (res.status !== 200 || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error(`Categories fetch failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Products List (GET /api/products)', async () => {
    const res = await request('/api/products?limit=10');
    if (res.status !== 200 || !Array.isArray(res.data.data) || res.data.data.length === 0) {
      throw new Error(`Products fetch failed: ${JSON.stringify(res.data)}`);
    }
    sampleProduct = res.data.data[0];
  });

  await runner.run('Single Product Detail (GET /api/products/:id)', async () => {
    if (!sampleProduct) throw new Error('No product available to test');
    const res = await request(`/api/products/${sampleProduct._id}`);
    if (res.status !== 200 || res.data.data.name !== sampleProduct.name) {
      throw new Error(`Single product fetch failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Featured Products (GET /api/products/featured)', async () => {
    const res = await request('/api/products/featured');
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Featured products fetch failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Public Content Banners (GET /api/content/banners)', async () => {
    const res = await request('/api/content/banners');
    if (res.status !== 200) {
      throw new Error(`Banners fetch failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Submit Support Inquiry (POST /api/support/inquiry)', async () => {
    const res = await request('/api/support/inquiry', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Auto Test User',
        email: 'autotest@example.com',
        phone: '9876543210',
        subject: 'General Inquiry',
        message: 'This is an automated test message verifying customer inquiries.'
      })
    });
    if (res.status !== 201 && res.status !== 200) {
      throw new Error(`Contact submission failed: ${JSON.stringify(res.data)}`);
    }
  });

  // SECTION 3: CUSTOMER AUTH & USER PIPELINE
  console.log('\n--- SECTION 3: Customer Auth & User Workflow ---');

  await runner.run('Customer Login (POST /api/auth/login)', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@example.com',
        password: 'Password@123'
      })
    });
    if (res.status !== 200 || !res.cookie) {
      throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(res.data)}`);
    }
    customerCookie = res.cookie;
  });

  await runner.run('Customer Profile (GET /api/auth/me)', async () => {
    const res = await request('/api/auth/me', {}, customerCookie);
    if (res.status !== 200 || res.data.data.email !== 'customer@example.com') {
      throw new Error(`Profile fetch failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Customer Addresses (GET /api/addresses)', async () => {
    const res = await request('/api/addresses', {}, customerCookie);
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Address fetch failed: ${JSON.stringify(res.data)}`);
    }
    if (res.data.data.length > 0) {
      testAddressId = res.data.data[0]._id;
    }
  });

  if (!testAddressId) {
    await runner.run('Create Delivery Address (POST /api/addresses)', async () => {
      const res = await request('/api/addresses', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Rahul Sharma',
          phone: '9876543210',
          street: '12 Gandhi Road',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001',
          isDefault: true
        })
      }, customerCookie);
      if (res.status !== 201 && res.status !== 200) {
        throw new Error(`Address creation failed: ${JSON.stringify(res.data)}`);
      }
      testAddressId = res.data.data._id;
    });
  }

  await runner.run('Wishlist Operations (POST /api/wishlist/toggle)', async () => {
    const res = await request('/api/wishlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ productId: sampleProduct._id })
    }, customerCookie);
    if (res.status !== 200) {
      throw new Error(`Wishlist toggle failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Add to Cart (POST /api/cart/add)', async () => {
    const res = await request('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        productId: sampleProduct._id,
        quantity: 2
      })
    }, customerCookie);
    if (res.status !== 200) {
      throw new Error(`Add to cart failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Inspect Cart (GET /api/cart)', async () => {
    const res = await request('/api/cart', {}, customerCookie);
    if (res.status !== 200 || !res.data.data || !res.data.data.items) {
      throw new Error(`Cart inspection failed: ${JSON.stringify(res.data)}`);
    }
    if (res.data.data.items.length === 0) {
      throw new Error('Cart should contain added items');
    }
  });

  // SECTION 4: UPI CHECKOUT & DYNAMIC QR & AUTO-ORDER PLACEMENT
  console.log('\n--- SECTION 4: UPI QR, 5-Min Timer & Auto Order Placement ---');

  const testSessionRef = `TEST-${Date.now()}`;
  const testAmount = 5499.50;

  await runner.run('Generate Dynamic UPI QR with Amount & Session Ref (GET /api/checkout/upi-qr)', async () => {
    const res = await request(`/api/checkout/upi-qr?amount=${testAmount}&sessionRef=${testSessionRef}`);
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`UPI QR generation failed: ${JSON.stringify(res.data)}`);
    }
    const upiUri = res.data.data.upiUri;
    if (!upiUri.includes('pa=')) {
      throw new Error(`UPI URI missing merchant ID param: ${upiUri}`);
    }
    if (!upiUri.includes('am=5499.50')) {
      throw new Error(`UPI URI missing properly formatted amount 5499.50: ${upiUri}`);
    }
    if (!res.data.data.qrDataUrl || !res.data.data.qrDataUrl.startsWith('data:image/')) {
      throw new Error('UPI QR did not return base64 data image');
    }
    if (res.data.data.expiresInSeconds !== 300) {
      throw new Error(`Expected 300s (5-minute) timer, got ${res.data.data.expiresInSeconds}`);
    }
  });

  await runner.run('Check Initial UPI Payment Status (GET /api/checkout/upi-status)', async () => {
    const res = await request(`/api/checkout/upi-status?ref=${testSessionRef}`);
    if (res.status !== 200 || !res.data.data || res.data.data.status !== 'pending') {
      throw new Error(`Expected pending status, got: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Simulate Payment Arrival Notification (POST /api/checkout/upi-notify)', async () => {
    const res = await request('/api/checkout/upi-notify', {
      method: 'POST',
      body: JSON.stringify({
        sessionRef: testSessionRef,
        upiTransactionId: 'GPAY-AUTO-VERIFIED-987654',
        status: 'paid'
      })
    });
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`UPI notification trigger failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Verify Real-time Payment Status Switched to Completed (GET /api/checkout/upi-status)', async () => {
    const res = await request(`/api/checkout/upi-status?ref=${testSessionRef}`);
    if (res.status !== 200 || !res.data.data || res.data.data.status !== 'paid') {
      throw new Error(`Expected paid status, got: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Place Final Order upon Automatic UPI Payment (POST /api/checkout)', async () => {
    if (!testAddressId) throw new Error('No test address ID available');
    const res = await request('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({
        addressId: testAddressId,
        paymentMethod: 'upi_qr',
        upiTransactionId: testSessionRef,
        customerNotes: 'Handle with care Sivakasi wholesale'
      })
    }, customerCookie);

    if (res.status !== 201 && res.status !== 200) {
      throw new Error(`Order placement failed: ${JSON.stringify(res.data)}`);
    }

    const orderObj = res.data.data.order || res.data.data;
    testOrderId = orderObj._id;
    testOrderNumber = orderObj.orderNumber;

    if (!testOrderNumber) {
      throw new Error(`Order placed but orderNumber was not generated: ${JSON.stringify(res.data)}`);
    }
    if (orderObj.paymentStatus !== 'paid') {
      throw new Error(`Expected paymentStatus 'paid', got '${orderObj.paymentStatus}'`);
    }
  });

  await runner.run('Customer Order History Verification (GET /api/orders)', async () => {
    const res = await request('/api/orders', {}, customerCookie);
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Orders history failed: ${JSON.stringify(res.data)}`);
    }
    const found = res.data.data.find(o => o.orderNumber === testOrderNumber);
    if (!found) {
      throw new Error(`Created order ${testOrderNumber} not found in customer order history`);
    }
  });

  // SECTION 5: ADMIN PORTAL & DASHBOARD
  console.log('\n--- SECTION 5: Admin Portal & Management ---');

  await runner.run('Admin Login (POST /api/admin/login)', async () => {
    const res = await request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@firecrackers.com',
        password: 'Password@123'
      })
    });
    if (res.status !== 200 || !res.cookie) {
      throw new Error(`Admin login failed: ${JSON.stringify(res.data)}`);
    }
    adminCookie = res.cookie;
  });

  await runner.run('Admin Dashboard Stats (GET /api/admin/dashboard/stats)', async () => {
    const res = await request('/api/admin/dashboard/stats', {}, adminCookie);
    if (res.status !== 200 || !res.data.data) {
      throw new Error(`Admin dashboard stats failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Admin Orders List (GET /api/admin/orders)', async () => {
    const res = await request('/api/admin/orders', {}, adminCookie);
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Admin orders list failed: ${JSON.stringify(res.data)}`);
    }
    const found = res.data.data.find(o => o.orderNumber === testOrderNumber);
    if (!found) {
      throw new Error(`Admin orders list did not contain newly placed order ${testOrderNumber}`);
    }
  });

  await runner.run('Admin Update Order Status (PUT /api/admin/orders/:id/status)', async () => {
    if (!testOrderId) throw new Error('No test order ID to update');
    const res = await request(`/api/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'processing',
        note: 'Order confirmed and moved to warehouse packaging'
      })
    }, adminCookie);
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Admin order status update failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Admin Inventory List (GET /api/admin/inventory)', async () => {
    const res = await request('/api/admin/inventory', {}, adminCookie);
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Admin inventory failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Admin Customers List (GET /api/admin/customers)', async () => {
    const res = await request('/api/admin/customers', {}, adminCookie);
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Admin customers failed: ${JSON.stringify(res.data)}`);
    }
  });

  await runner.run('Admin Coupons List (GET /api/admin/coupons)', async () => {
    const res = await request('/api/admin/coupons', {}, adminCookie);
    if (res.status !== 200 || !Array.isArray(res.data.data)) {
      throw new Error(`Coupons fetch failed: ${JSON.stringify(res.data)}`);
    }
  });

  // SECTION 6: CLOUDINARY LIVE IMAGE STORAGE PIPELINE
  console.log('\n--- SECTION 6: Cloudinary Live Storage & Frontstore Sync ---');

  const { isCloudinaryConfigured, cloudinary } = require('../config/cloudinary');
  let testCldProductId = null;
  let testCldImageId = null;

  await runner.run('Cloudinary Live Credentials Check', async () => {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured with valid credentials in .env');
    }
    const cName = cloudinary.config().cloud_name;
    if (cName !== 'tci2igsn') {
      throw new Error(`Expected cloud_name tci2igsn, got: ${cName}`);
    }
  });

  await runner.run('Admin Adds Product with Image (1st: Cloudinary -> 2nd: MongoDB)', async () => {
    const categoriesRes = await request('/api/categories');
    const categoryId = categoriesRes.data.data[0]._id;

    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const fileBlob = new Blob([Buffer.from(sampleBase64, 'base64')], { type: 'image/png' });

    const cldForm = new FormData();
    cldForm.append('name', 'E2E Cloudinary Diamond Sparkler');
    cldForm.append('sku', `E2E-CLD-${Date.now()}`);
    cldForm.append('category', categoryId);
    cldForm.append('price', '299');
    cldForm.append('stock', '100');
    cldForm.append('description', 'Verified Cloudinary live image upload product.');
    cldForm.append('isActive', 'true');
    cldForm.append('images', fileBlob, 'diamond-sparkler.png');

    const res = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
      body: cldForm
    });
    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error(`Cloudinary product creation failed: ${JSON.stringify(data)}`);
    }

    testCldProductId = data.data._id;
    const img = data.data.images[0];
    if (!img || !img.url || !img.url.includes('cloudinary.com/tci2igsn')) {
      throw new Error(`Expected Cloudinary URL on tci2igsn, got: ${JSON.stringify(img)}`);
    }
    if (!img.public_id || !img.public_id.includes('firecrackers_products')) {
      throw new Error(`Expected firecrackers_products public_id, got: ${JSON.stringify(img)}`);
    }
  });

  await runner.run('Frontstore Displays Cloudinary CDN Image (3rd: Frontstore)', async () => {
    if (!testCldProductId) throw new Error('No Cloudinary product created to test');
    const res = await request(`/api/products/${testCldProductId}`);
    if (res.status !== 200 || !res.data.data) {
      throw new Error(`Frontstore fetch failed: ${JSON.stringify(res.data)}`);
    }
    const frontImg = res.data.data.images[0];
    if (!frontImg || !frontImg.url.includes('cloudinary.com/tci2igsn')) {
      throw new Error(`Frontstore did not return Cloudinary image URL: ${JSON.stringify(frontImg)}`);
    }
  });

  await runner.run('Admin Uploads Additional Image to Cloudinary Gallery', async () => {
    if (!testCldProductId) throw new Error('No Cloudinary product created to test');
    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const fileBlob = new Blob([Buffer.from(sampleBase64, 'base64')], { type: 'image/png' });

    const cldForm = new FormData();
    cldForm.append('images', fileBlob, 'diamond-detail.png');

    const res = await fetch(`${BASE_URL}/api/admin/products/${testCldProductId}/images`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
      body: cldForm
    });
    const data = await res.json();
    if (!data.success || data.data.length < 2) {
      throw new Error(`Additional Cloudinary upload failed: ${JSON.stringify(data)}`);
    }
    testCldImageId = data.data[data.data.length - 1]._id;
  });

  await runner.run('Admin Deletes Image Asset from Cloudinary & MongoDB', async () => {
    if (!testCldProductId || !testCldImageId) throw new Error('No image ID to delete');
    const res = await request(`/api/admin/products/${testCldProductId}/images/${testCldImageId}`, {
      method: 'DELETE'
    }, adminCookie);
    if (res.status !== 200 || !res.data.success) {
      throw new Error(`Delete Cloudinary image failed: ${JSON.stringify(res.data)}`);
    }
  });

  const success = runner.summary();
  if (!success) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nFatal test execution error:', err);
  process.exit(1);
});
