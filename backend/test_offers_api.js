// Test script for Offer Management System API endpoints and security
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

async function runTests() {
  console.log('=== STARTING OFFER MANAGEMENT SYSTEM API TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Test Public GET /api/offers
    const activeRes = await request('/api/offers');
    assert(activeRes.status === 200, 'GET /api/offers returns status 200');
    assert(Array.isArray(activeRes.data), 'GET /api/offers returns array of offers');
    assert(activeRes.data.length > 0, `GET /api/offers has ${activeRes.data.length} active offer(s)`);

    // 2. Test Security: Unauthenticated POST /api/offers should fail with 401
    const unauthPost = await request('/api/offers', {
      method: 'POST',
      body: { title: 'Hack Offer', discountType: 'percentage', discountValue: 50, startDate: new Date(), endDate: new Date() }
    });
    assert(unauthPost.status === 401, 'Unauthenticated POST /api/offers is rejected with 401 Unauthorized');

    // 3. Test Security: Unauthenticated GET /api/offers/all should fail with 401
    const unauthGetAll = await request('/api/offers/all');
    assert(unauthGetAll.status === 401, 'Unauthenticated GET /api/offers/all is rejected with 401');

    // 4. Admin Login
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'admin', password: 'admin123' }
    });
    assert(loginRes.status === 200, 'Admin login succeeded with 200');
    
    let adminCookie = '';
    if (loginRes.setCookie && loginRes.setCookie.length) {
      adminCookie = loginRes.setCookie[0].split(';')[0];
    }
    assert(Boolean(adminCookie), 'Obtained admin authentication token cookie');

    // 5. Admin GET /api/offers/all
    const allOffersRes = await request('/api/offers/all', {
      headers: { 'Cookie': adminCookie }
    });
    assert(allOffersRes.status === 200, 'Admin GET /api/offers/all returns 200');
    assert(Array.isArray(allOffersRes.data), 'Admin GET /api/offers/all returns array');

    // 6. Test Admin Stats includes offerCount and activeOfferCount
    const statsRes = await request('/api/admin/stats', {
      headers: { 'Cookie': adminCookie }
    });
    assert(statsRes.status === 200, 'GET /api/admin/stats returns 200');
    assert(typeof statsRes.data.offerCount === 'number', `Stats contains offerCount: ${statsRes.data.offerCount}`);
    assert(typeof statsRes.data.activeOfferCount === 'number', `Stats contains activeOfferCount: ${statsRes.data.activeOfferCount}`);

    // 7. Test Admin POST /api/offers (Create new offer)
    const newOfferPayload = {
      title: 'Flash Weekend Special',
      description: 'Exclusive 25% discount on all casual collections.',
      discountType: 'percentage',
      discountValue: 25,
      bannerImage: 'img/banner/b17.jpg',
      couponCode: 'FLASH25',
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      isActive: true
    };

    const createRes = await request('/api/offers', {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
      body: newOfferPayload
    });
    assert(createRes.status === 201, 'Admin POST /api/offers creates offer with 201 Created');
    const createdOfferId = createRes.data._id;
    assert(Boolean(createdOfferId), `Created offer ID: ${createdOfferId}`);
    assert(createRes.data.couponCode === 'FLASH25', 'Created offer has correct uppercase coupon code');

    // 8. Test Validation: Invalid payload (percentage > 100)
    const invalidPctRes = await request('/api/offers', {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
      body: { ...newOfferPayload, discountValue: 150 }
    });
    assert(invalidPctRes.status === 400, 'Validation: discountValue > 100 rejected with 400');

    // 9. Test Validation: End date < Start date
    const invalidDateRes = await request('/api/offers', {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
      body: {
        ...newOfferPayload,
        startDate: new Date('2026-12-01').toISOString(),
        endDate: new Date('2026-11-01').toISOString()
      }
    });
    assert(invalidDateRes.status === 400, 'Validation: endDate < startDate rejected with 400');

    // 10. Test Validate Coupon endpoint: FLASH25
    const validCouponRes = await request('/api/offers/validate-coupon/flash25');
    assert(validCouponRes.status === 200, 'GET /api/offers/validate-coupon/flash25 returns 200');
    assert(validCouponRes.data.valid === true, 'Coupon FLASH25 is validated as valid: true');
    assert(validCouponRes.data.discountValue === 25, 'Coupon FLASH25 returns discountValue 25');

    // 11. Test Validate Coupon endpoint: Nonexistent coupon
    const invalidCouponRes = await request('/api/offers/validate-coupon/NONEXISTENT999');
    assert(invalidCouponRes.status === 404, 'Invalid coupon validation returns 404');
    assert(invalidCouponRes.data.valid === false, 'Invalid coupon returns valid: false');

    // 12. Test Admin PUT /api/offers/:id (Update offer)
    const updateRes = await request(`/api/offers/${createdOfferId}`, {
      method: 'PUT',
      headers: { 'Cookie': adminCookie },
      body: {
        title: 'Flash Weekend Mega Special',
        description: 'Updated 35% discount description',
        discountType: 'percentage',
        discountValue: 35,
        bannerImage: 'img/banner/b7.jpg',
        couponCode: 'FLASH35',
        startDate: new Date(Date.now() - 3600000).toISOString(),
        endDate: new Date(Date.now() + 10 * 24 * 3600000).toISOString(),
        isActive: true
      }
    });
    assert(updateRes.status === 200, 'Admin PUT /api/offers/:id updates offer with 200 OK');
    assert(updateRes.data.title === 'Flash Weekend Mega Special', 'Offer title updated correctly');
    assert(updateRes.data.discountValue === 35, 'Offer discountValue updated correctly');

    // 13. Test Admin PATCH /api/offers/:id/toggle (Deactivate offer)
    const toggleRes = await request(`/api/offers/${createdOfferId}/toggle`, {
      method: 'PATCH',
      headers: { 'Cookie': adminCookie },
      body: { isActive: false }
    });
    assert(toggleRes.status === 200, 'Admin PATCH /api/offers/:id/toggle returns 200');
    assert(toggleRes.data.isActive === false, 'Offer is now deactivated (isActive: false)');

    // 14. Verify deactivated offer no longer appears in public GET /api/offers
    const activeAfterToggle = await request('/api/offers');
    const existsInActive = activeAfterToggle.data.some(o => o._id === createdOfferId);
    assert(existsInActive === false, 'Deactivated offer is NOT returned in public active offers');

    // 15. Verify deactivated coupon is no longer valid
    const couponAfterToggle = await request('/api/offers/validate-coupon/FLASH35');
    assert(couponAfterToggle.status === 404 && couponAfterToggle.data.valid === false, 'Deactivated offer coupon is rejected');

    // 16. Test Admin PATCH /api/offers/:id/toggle (Reactivate offer)
    const toggleBackRes = await request(`/api/offers/${createdOfferId}/toggle`, {
      method: 'PATCH',
      headers: { 'Cookie': adminCookie },
      body: { isActive: true }
    });
    assert(toggleBackRes.status === 200 && toggleBackRes.data.isActive === true, 'Reactivated offer (isActive: true)');

    // 17. Test Admin DELETE /api/offers/:id
    const deleteRes = await request(`/api/offers/${createdOfferId}`, {
      method: 'DELETE',
      headers: { 'Cookie': adminCookie }
    });
    assert(deleteRes.status === 200, 'Admin DELETE /api/offers/:id returns 200');

    // 18. Verify deleted offer is gone
    const getDeleted = await request(`/api/offers/${createdOfferId}`);
    assert(getDeleted.status === 404, 'Deleted offer returns 404');

    console.log(`\n=== API TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
