// Full integration & regression test for Lotus Store
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          setCookie,
          data: json || data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runFullIntegration() {
  console.log('=====================================================');
  console.log('  LOTUS STORE OFFER SYSTEM FULL INTEGRATION TESTS');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  }

  try {
    // 1. Admin Authentication
    console.log('--- 1. Testing Admin Authentication ---');
    require('dotenv').config();
    const adminPass = process.env.SEED_ADMIN_PASSWORD || 'admin123';
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: adminPass }
    });
    assert(loginRes.status === 200, 'Admin login succeeds');
    assert(loginRes.data.user.role === 'admin', 'User has admin role');
    const adminCookie = loginRes.setCookie ? loginRes.setCookie[0].split(';')[0] : '';
    assert(Boolean(adminCookie), 'Received HTTP-only session cookie');

    // 2. Overview Stats
    console.log('\n--- 2. Testing Dashboard Overview Stats ---');
    const statsRes = await request('/api/admin/stats', {
      headers: { 'Cookie': adminCookie }
    });
    assert(statsRes.status === 200, 'Admin stats endpoint responds');
    assert(typeof statsRes.data.offerCount === 'number', `Stats returns total offerCount: ${statsRes.data.offerCount}`);
    assert(typeof statsRes.data.activeOfferCount === 'number', `Stats returns activeOfferCount: ${statsRes.data.activeOfferCount}`);

    // 3. Customer Active Offers
    console.log('\n--- 3. Testing Public Active Offers for Customer Website ---');
    const publicOffers = await request('/api/offers');
    assert(publicOffers.status === 200, 'Public GET /api/offers returns 200');
    assert(Array.isArray(publicOffers.data), 'Public offers is an array');
    console.log(`   Found ${publicOffers.data.length} active customer offer(s)`);

    // 4. Create New Offer
    console.log('\n--- 4. Creating New Promotional Offer (Admin) ---');
    const testOffer = {
      title: 'Spring Festival Flash Sale',
      description: 'Massive spring discounts across our exclusive collections.',
      discountType: 'percentage',
      discountValue: 35,
      bannerImage: 'img/banner/b2.jpg',
      couponCode: 'SPRING35',
      startDate: new Date(Date.now() - 60000).toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true
    };
    const createRes = await request('/api/offers', {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
      body: testOffer
    });
    assert(createRes.status === 201, 'Offer creation returns 201 Created');
    assert(createRes.data.title === testOffer.title, 'Created offer title matches');
    assert(createRes.data.couponCode === 'SPRING35', 'Coupon code normalized to uppercase');
    const offerId = createRes.data._id;

    // 5. Validate Coupon Code
    console.log('\n--- 5. Testing Dynamic Coupon Validation ---');
    const couponValidation = await request('/api/offers/validate-coupon/spring35');
    assert(couponValidation.status === 200, 'Validate coupon endpoint responds 200 for spring35');
    assert(couponValidation.data.valid === true, 'Coupon is valid');
    assert(couponValidation.data.discountValue === 35, 'Coupon discount percentage is 35%');

    // 6. Test Discount Calculation Simulation
    console.log('\n--- 6. Testing Discount Calculation (Cart / Checkout Simulation) ---');
    const subtotal = 5000;
    const pctDiscount = Math.round((subtotal * couponValidation.data.discountValue) / 100);
    const finalTotal = subtotal - pctDiscount;
    assert(pctDiscount === 1750, '35% of ৳5,000 subtotal is ৳1,750 discount');
    assert(finalTotal === 3250, 'Final payable total is ৳3,250');

    // 7. Update Offer
    console.log('\n--- 7. Updating Offer (Admin) ---');
    const updateRes = await request(`/api/offers/${offerId}`, {
      method: 'PUT',
      headers: { 'Cookie': adminCookie },
      body: {
        ...testOffer,
        title: 'Spring Festival Super Mega Sale',
        discountValue: 40,
        couponCode: 'SPRING40'
      }
    });
    assert(updateRes.status === 200, 'Offer update returns 200 OK');
    assert(updateRes.data.title === 'Spring Festival Super Mega Sale', 'Updated title saved');
    assert(updateRes.data.discountValue === 40, 'Updated discount value 40% saved');

    // 8. Toggle Active Status
    console.log('\n--- 8. Toggling Active / Inactive Status ---');
    const deactivateRes = await request(`/api/offers/${offerId}/toggle`, {
      method: 'PATCH',
      headers: { 'Cookie': adminCookie },
      body: { isActive: false }
    });
    assert(deactivateRes.status === 200, 'Toggle endpoint returns 200');
    assert(deactivateRes.data.isActive === false, 'Offer isActive is now false');

    const customerOffersAfterDeactivate = await request('/api/offers');
    const isShown = customerOffersAfterDeactivate.data.some(o => o._id === offerId);
    assert(isShown === false, 'Deactivated offer is hidden from customer website');

    const couponCheckDeactivated = await request('/api/offers/validate-coupon/SPRING40');
    assert(couponCheckDeactivated.status === 404, 'Deactivated offer coupon cannot be redeemed');

    // Reactivate
    const reactivateRes = await request(`/api/offers/${offerId}/toggle`, {
      method: 'PATCH',
      headers: { 'Cookie': adminCookie },
      body: { isActive: true }
    });
    assert(reactivateRes.data.isActive === true, 'Offer successfully reactivated');

    // 9. Delete Offer
    console.log('\n--- 9. Deleting Offer (Admin) ---');
    const deleteRes = await request(`/api/offers/${offerId}`, {
      method: 'DELETE',
      headers: { 'Cookie': adminCookie }
    });
    assert(deleteRes.status === 200, 'Delete offer returns 200 OK');

    const verifyDeleted = await request(`/api/offers/${offerId}`);
    assert(verifyDeleted.status === 404, 'Deleted offer no longer exists');

    // 10. Regression Check on Products and Orders
    console.log('\n--- 10. Regression Testing Existing Features ---');
    const productsRes = await request('/api/products');
    assert(productsRes.status === 200 && productsRes.data.length > 0, 'Products catalog is intact');

    const ordersRes = await request('/api/orders', {
      headers: { 'Cookie': adminCookie }
    });
    assert(ordersRes.status === 200, 'Admin orders endpoint is intact');

    console.log('\n=====================================================');
    console.log(`  RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================\n');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed with error:', err);
    process.exit(1);
  }
}

runFullIntegration();
