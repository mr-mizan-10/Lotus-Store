(function () {
  "use strict";

  const API_ROOT = (typeof window !== 'undefined' && (window.API_BASE_URL || window.API_ROOT)) || (function () {
    const hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'localhost';
    const protocol = (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') ? 'https:' : 'http:';
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      return `${protocol}//${hostname}:5000`;
    }
    return 'http://localhost:5000';
  })();

  const money = n => "৳" + Number(n || 0).toLocaleString("en-BD");

  function fmtDate(d) {
    try {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function fmtDateTime(d) {
    try {
      if (!d) return '—';
      return new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) { return ''; }
  }

  function toLocalISOString(date) {
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000;
    const local = new Date(d.getTime() - offset);
    return local.toISOString().slice(0, 16);
  }

  async function api(path, options) {
    const res = await fetch(API_ROOT + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
      const err = new Error((data && data.message) || 'Request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ---------------- Access Gate ----------------
  let currentAdmin = null;

  async function checkAccess() {
    const gate = document.getElementById('admin-gate');
    const gateText = document.getElementById('admin-gate-text');
    const app = document.getElementById('admin-app');

    let user;
    try {
      user = await api('/api/auth/me');
    } catch (e) {
      gateText.textContent = 'Please sign in with an admin account to continue.';
      setTimeout(() => { window.location.href = '../index.html?login=1'; }, 1400);
      return;
    }

    if (!user || user.role !== 'admin') {
      gateText.textContent = "You don't have admin access. Redirecting to the store…";
      setTimeout(() => { window.location.href = '../index.html'; }, 1400);
      return;
    }

    currentAdmin = user;
    document.getElementById('admin-username-display').textContent = user.username;
    document.getElementById('admin-welcome-name').textContent = user.username;
    document.getElementById('admin-avatar-letter').textContent = user.username.charAt(0).toUpperCase();

    gate.style.display = 'none';
    app.style.display = 'block';

    initTabs();
    loadOverview();
    loadOffers();
    loadProducts();
    loadOrders();
    loadUsers();
  }

  // ---------------- Tabs ----------------
  function switchTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(el => { el.style.display = 'none'; });
    document.querySelectorAll('#admin-nav-list .dash-nav-item').forEach(el => el.classList.remove('active'));

    const section = document.getElementById('tab-' + tab);
    if (section) section.style.display = 'block';
    const navItem = document.querySelector(`#admin-nav-list .dash-nav-item[data-tab="${tab}"]`);
    if (navItem) navItem.classList.add('active');
  }

  function initTabs() {
    document.querySelectorAll('#admin-nav-list .dash-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(item.dataset.tab);
      });
    });
    document.querySelectorAll('.admin-tab-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.dataset.tab);
      });
    });
  }

  // ---------------- Overview ----------------
  async function loadOverview() {
    try {
      const stats = await api('/api/admin/stats');
      document.getElementById('stat-order-count').textContent = stats.orderCount ?? 0;
      document.getElementById('stat-pending-orders').textContent = stats.pendingOrders ?? 0;
      document.getElementById('stat-revenue').textContent = money(stats.totalRevenue);
      document.getElementById('stat-product-count').textContent = stats.productCount ?? 0;
      document.getElementById('stat-user-count').textContent = stats.userCount ?? 0;

      const offerStatEl = document.getElementById('stat-active-offer-count');
      if (offerStatEl) {
        offerStatEl.textContent = stats.activeOfferCount ?? 0;
      }

      const body = document.getElementById('overview-recent-orders');
      if (!stats.recentOrders || !stats.recentOrders.length) {
        body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#6b7280;">No orders yet.</td></tr>`;
        return;
      }
      body.innerHTML = stats.recentOrders.map(o => `
        <tr>
          <td><span class="order-id-tag">${o.orderNumber}</span></td>
          <td>${fmtDate(o.createdAt)}</td>
          <td>${o.customer ? o.customer.name : '—'}</td>
          <td><strong>${money(o.total)}</strong></td>
          <td><span class="status-pill status-${o.status}">${o.status}</span></td>
        </tr>`).join('');
    } catch (e) {
      const body = document.getElementById('overview-recent-orders');
      if (body) body.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#b91c1c;">Failed to load stats.</td></tr>`;
    }
  }

  // ---------------- Offers ----------------
  let offersCache = [];
  let offerToDeleteId = null;

  function computeOfferStatus(offer) {
    const now = new Date();
    const start = new Date(offer.startDate);
    const end = new Date(offer.endDate);

    if (!offer.isActive) {
      return { code: 'inactive', label: 'Inactive', class: 'status-inactive' };
    }
    if (end < now) {
      return { code: 'expired', label: 'Expired', class: 'status-expired' };
    }
    if (start > now) {
      return { code: 'scheduled', label: 'Scheduled', class: 'status-scheduled' };
    }
    return { code: 'active', label: 'Active', class: 'status-active' };
  }

  async function loadOffers() {
    const body = document.getElementById('admin-offers-body');
    if (!body) return;

    try {
      offersCache = await api('/api/offers/all');
      renderOffersTable();
    } catch (e) {
      body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#b91c1c;">Failed to load offers.</td></tr>`;
    }
  }

  function renderOffersTable() {
    const body = document.getElementById('admin-offers-body');
    if (!body) return;

    const searchTerm = (document.getElementById('offer-search-input')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('offer-status-filter')?.value || 'all';

    let filtered = offersCache.filter(offer => {
      const status = computeOfferStatus(offer);
      
      // Status filter
      if (statusFilter !== 'all' && status.code !== statusFilter) {
        return false;
      }

      // Search term filter
      if (searchTerm) {
        const titleMatch = (offer.title || '').toLowerCase().includes(searchTerm);
        const descMatch = (offer.description || '').toLowerCase().includes(searchTerm);
        const codeMatch = (offer.couponCode || '').toLowerCase().includes(searchTerm);
        if (!titleMatch && !descMatch && !codeMatch) return false;
      }

      return true;
    });

    if (!filtered.length) {
      if (offersCache.length === 0) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px 20px;color:#6b7280;">No offers created yet. Click "Add New Offer" to create your first promotion!</td></tr>`;
      } else {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px 20px;color:#6b7280;">No offers match your current filter/search criteria.</td></tr>`;
      }
      return;
    }

    body.innerHTML = filtered.map(offer => {
      const status = computeOfferStatus(offer);
      const discountText = offer.discountType === 'percentage' 
        ? `${offer.discountValue}% OFF` 
        : `৳${Number(offer.discountValue).toLocaleString('en-BD')} OFF`;

      const bannerSrc = offer.bannerImage 
        ? (offer.bannerImage.startsWith('http') ? offer.bannerImage : `../${offer.bannerImage}`) 
        : '../img/banner/b2.jpg';

      return `
        <tr>
          <td>
            <img class="admin-offer-banner-thumb" src="${bannerSrc}" onerror="this.src='../img/banner/b2.jpg'" alt="${offer.title}">
          </td>
          <td>
            <div style="font-weight:700;color:#0f172a;font-size:13.5px;margin-bottom:2px;">${offer.title}</div>
            <div style="font-size:12px;color:#64748b;max-width:240px;line-height:1.3;">${offer.description || 'No description'}</div>
          </td>
          <td>
            <span style="font-weight:800;color:#4F46E5;font-size:13.5px;">${discountText}</span>
          </td>
          <td>
            ${offer.couponCode ? `<span class="coupon-badge"><i class="fa-solid fa-ticket"></i> ${offer.couponCode}</span>` : '<span style="color:#94a3b8;font-size:12px;">None</span>'}
          </td>
          <td>
            <div class="offer-date-range">
              <div><i class="fa-regular fa-calendar-check" style="color:#10b981;margin-right:4px;"></i>${fmtDateTime(offer.startDate)}</div>
              <div><i class="fa-regular fa-calendar-xmark" style="color:#ef4444;margin-right:4px;"></i>${fmtDateTime(offer.endDate)}</div>
            </div>
          </td>
          <td>
            <span class="status-pill ${status.class}">${status.label}</span>
          </td>
          <td>
            <label class="admin-switch" title="Toggle Active Status">
              <input type="checkbox" class="offer-toggle-checkbox" data-offer-id="${offer._id}" ${offer.isActive ? 'checked' : ''}>
              <span class="admin-switch-slider"></span>
            </label>
          </td>
          <td>
            <button class="admin-icon-btn-sm" data-edit-offer="${offer._id}" title="Edit Offer"><i class="fa-solid fa-pen"></i> Edit</button>
            <button class="admin-danger-btn" data-delete-offer="${offer._id}" title="Delete Offer"><i class="fa-solid fa-trash"></i> Delete</button>
          </td>
        </tr>`;
    }).join('');

    // Wire up edit buttons
    body.querySelectorAll('[data-edit-offer]').forEach(btn => {
      btn.addEventListener('click', () => openOfferModal(btn.dataset.editOffer));
    });

    // Wire up delete buttons
    body.querySelectorAll('[data-delete-offer]').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteOffer(btn.dataset.deleteOffer));
    });

    // Wire up toggle switches
    body.querySelectorAll('.offer-toggle-checkbox').forEach(cb => {
      cb.addEventListener('change', async () => {
        const offerId = cb.dataset.offerId;
        const newStatus = cb.checked;
        cb.disabled = true;
        try {
          await api(`/api/offers/${offerId}/toggle`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive: newStatus })
          });
          const target = offersCache.find(o => o._id === offerId);
          if (target) target.isActive = newStatus;
          renderOffersTable();
          loadOverview();
        } catch (err) {
          alert(err.message || 'Failed to update offer status');
          cb.checked = !newStatus; // revert checkbox
          cb.disabled = false;
        }
      });
    });
  }

  function updateBannerPreview(src) {
    const previewWrap = document.getElementById('offer-banner-preview-wrap');
    const previewImg = document.getElementById('offer-banner-preview');
    if (!previewWrap || !previewImg) return;

    if (src && src.trim()) {
      const fullSrc = src.startsWith('http') ? src : `../${src.trim()}`;
      previewImg.src = fullSrc;
      previewWrap.style.display = 'block';
    } else {
      previewWrap.style.display = 'none';
      previewImg.src = '';
    }
  }

  function openOfferModal(offerId) {
    const modal = document.getElementById('offer-modal');
    const title = document.getElementById('offer-modal-title');
    const form = document.getElementById('offer-form');
    const err = document.getElementById('offer-form-error');
    const discountTypeSelect = document.getElementById('offer-discount-type-field');
    const discountUnitAddon = document.getElementById('offer-discount-unit-addon');
    const discountLabel = document.getElementById('offer-discount-value-label');
    const activeCb = document.getElementById('offer-active-field');
    const activeLabel = document.getElementById('offer-active-label');

    err.style.display = 'none';
    form.reset();

    const offer = offerId ? offersCache.find(o => o._id === offerId) : null;

    if (offer) {
      title.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Edit Offer`;
      document.getElementById('offer-id-field').value = offer._id;
      document.getElementById('offer-title-field').value = offer.title || '';
      document.getElementById('offer-description-field').value = offer.description || '';
      discountTypeSelect.value = offer.discountType || 'percentage';
      document.getElementById('offer-discount-value-field').value = offer.discountValue ?? 30;
      document.getElementById('offer-coupon-field').value = offer.couponCode || '';
      document.getElementById('offer-banner-field').value = offer.bannerImage || '';
      document.getElementById('offer-start-field').value = toLocalISOString(offer.startDate);
      document.getElementById('offer-end-field').value = toLocalISOString(offer.endDate);
      activeCb.checked = offer.isActive !== false;
      updateBannerPreview(offer.bannerImage);
    } else {
      title.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Add New Offer`;
      document.getElementById('offer-id-field').value = '';
      document.getElementById('offer-title-field').value = '';
      document.getElementById('offer-description-field').value = '';
      discountTypeSelect.value = 'percentage';
      document.getElementById('offer-discount-value-field').value = 30;
      document.getElementById('offer-coupon-field').value = '';
      document.getElementById('offer-banner-field').value = 'img/banner/b2.jpg';

      const now = new Date();
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      document.getElementById('offer-start-field').value = toLocalISOString(now);
      document.getElementById('offer-end-field').value = toLocalISOString(in30Days);
      activeCb.checked = true;
      updateBannerPreview('img/banner/b2.jpg');
    }

    // Sync discount addon
    if (discountTypeSelect.value === 'percentage') {
      discountUnitAddon.textContent = '%';
      discountLabel.innerHTML = `Discount Value (%) <span style="color:#ef4444;">*</span>`;
    } else {
      discountUnitAddon.textContent = '৳';
      discountLabel.innerHTML = `Discount Value (৳) <span style="color:#ef4444;">*</span>`;
    }

    if (activeLabel) {
      activeLabel.textContent = activeCb.checked ? 'Active' : 'Inactive';
      activeLabel.style.color = activeCb.checked ? '#16a34a' : '#64748b';
    }

    modal.style.display = 'flex';
  }

  function closeOfferModal() {
    const modal = document.getElementById('offer-modal');
    if (modal) modal.style.display = 'none';
  }

  async function submitOfferForm(e) {
    e.preventDefault();
    const err = document.getElementById('offer-form-error');
    const submitBtn = document.getElementById('offer-form-submit');
    err.style.display = 'none';

    const id = document.getElementById('offer-id-field').value;
    const title = document.getElementById('offer-title-field').value.trim();
    const description = document.getElementById('offer-description-field').value.trim();
    const discountType = document.getElementById('offer-discount-type-field').value;
    const discountValue = Number(document.getElementById('offer-discount-value-field').value);
    const couponCode = document.getElementById('offer-coupon-field').value.trim().toUpperCase();
    const bannerImage = document.getElementById('offer-banner-field').value.trim();
    const startDate = document.getElementById('offer-start-field').value;
    const endDate = document.getElementById('offer-end-field').value;
    const isActive = document.getElementById('offer-active-field').checked;

    // Frontend Validations
    if (!title) {
      err.textContent = 'Offer title cannot be empty.';
      err.style.display = 'block';
      return;
    }

    if (isNaN(discountValue) || discountValue < 0) {
      err.textContent = 'Please enter a valid non-negative discount value.';
      err.style.display = 'block';
      return;
    }

    if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
      err.textContent = 'Percentage discount must be between 0 and 100%.';
      err.style.display = 'block';
      return;
    }

    if (!startDate || !endDate) {
      err.textContent = 'Both start date and end date are required.';
      err.style.display = 'block';
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      err.textContent = 'End date cannot be earlier than start date.';
      err.style.display = 'block';
      return;
    }

    const payload = {
      title,
      description,
      discountType,
      discountValue,
      couponCode,
      bannerImage,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      isActive,
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>Saving Offer...</span>`;

    try {
      if (id) {
        await api('/api/offers/' + id, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/offers', { method: 'POST', body: JSON.stringify(payload) });
      }
      closeOfferModal();
      await loadOffers();
      await loadOverview();
    } catch (err2) {
      err.textContent = err2.message || 'Failed to save offer.';
      err.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Save Offer</span>`;
    }
  }

  function confirmDeleteOffer(id) {
    offerToDeleteId = id;
    const offer = offersCache.find(o => o._id === id);
    const titleDisplay = document.getElementById('delete-offer-title-display');
    if (titleDisplay) {
      titleDisplay.textContent = offer ? `"${offer.title}"` : 'this offer';
    }
    const modal = document.getElementById('offer-delete-modal');
    if (modal) modal.style.display = 'flex';
  }

  function closeDeleteModal() {
    offerToDeleteId = null;
    const modal = document.getElementById('offer-delete-modal');
    if (modal) modal.style.display = 'none';
  }

  async function executeDeleteOffer() {
    if (!offerToDeleteId) return;
    const btn = document.getElementById('confirm-delete-offer-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Deleting...`;

    try {
      await api('/api/offers/' + offerToDeleteId, { method: 'DELETE' });
      closeDeleteModal();
      await loadOffers();
      await loadOverview();
    } catch (err) {
      alert(err.message || 'Failed to delete offer.');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-trash"></i> <span>Yes, Delete Offer</span>`;
    }
  }

  function resolveAdminImg(path) {
    if (!path) return '../img/products/f1.jpg';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('../')) return path;
    return '../' + path;
  }

  // ---------------- Products ----------------
  let productsCache = [];

  async function loadProducts() {
    try {
      productsCache = await api('/api/products/all');
      renderProductsTable();
    } catch (e) {
      const body = document.getElementById('admin-products-body');
      if (body) body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#b91c1c;">Failed to load products.</td></tr>`;
    }
  }

  function renderProductsTable() {
    const body = document.getElementById('admin-products-body');
    if (!body) return;

    const searchTerm = (document.getElementById('admin-global-search')?.value || '').toLowerCase().trim();
    let filtered = productsCache;
    if (searchTerm) {
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(searchTerm)) || 
        (p.category && p.category.toLowerCase().includes(searchTerm))
      );
    }

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:25px;color:#6b7280;">No products found.</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map(p => `
      <tr>
        <td><img class="admin-prod-thumb" src="${resolveAdminImg(p.image)}" onerror="this.src='../img/products/f1.jpg'" alt="${p.name}"></td>
        <td><strong>${p.name}</strong></td>
        <td><span class="status-pill status-delivered">${p.category || 'General'}</span></td>
        <td><strong>${money(p.price)}</strong></td>
        <td>${p.stock}</td>
        <td><span class="status-pill ${p.active !== false ? 'status-delivered' : 'status-cancelled'}">${p.active !== false ? 'Active' : 'Hidden'}</span></td>
        <td>
          <button class="admin-icon-btn-sm" data-edit="${p._id}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="admin-danger-btn" data-delete="${p._id}"><i class="fa-solid fa-trash"></i> Delete</button>
        </td>
      </tr>`).join('');

    body.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openProductModal(btn.dataset.edit));
    });
    body.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.delete));
    });
  }

  function openProductModal(productId) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    const err = document.getElementById('product-form-error');
    err.style.display = 'none';
    form.reset();

    const product = productId ? productsCache.find(p => p._id === productId) : null;
    document.getElementById('product-id-field').value = product ? product._id : '';
    document.getElementById('product-name-field').value = product ? product.name : '';
    document.getElementById('product-price-field').value = product ? product.price : '';
    document.getElementById('product-stock-field').value = product ? product.stock : 100;
    document.getElementById('product-category-field').value = product ? product.category : 'Shirts';
    document.getElementById('product-rating-field').value = product ? product.rating : 5;
    document.getElementById('product-image-field').value = product ? product.image : 'img/products/f1.jpg';
    document.getElementById('product-description-field').value = product ? product.description : '';
    title.textContent = product ? 'Edit Product' : 'Add Product';

    modal.style.display = 'flex';
  }

  function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
  }

  async function submitProductForm(e) {
    e.preventDefault();
    const err = document.getElementById('product-form-error');
    err.style.display = 'none';

    const id = document.getElementById('product-id-field').value;
    const payload = {
      name: document.getElementById('product-name-field').value.trim(),
      price: Number(document.getElementById('product-price-field').value),
      stock: Number(document.getElementById('product-stock-field').value) || 0,
      category: document.getElementById('product-category-field').value.trim() || 'General',
      rating: Number(document.getElementById('product-rating-field').value) || 5,
      image: document.getElementById('product-image-field').value.trim(),
      description: document.getElementById('product-description-field').value.trim()
    };

    if (!payload.name || !payload.price) {
      err.textContent = 'Name and price are required.';
      err.style.display = 'block';
      return;
    }

    try {
      if (id) {
        await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      }
      closeProductModal();
      await loadProducts();
      await loadOverview();
    } catch (e2) {
      err.textContent = e2.message || 'Failed to save product.';
      err.style.display = 'block';
    }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
      await api('/api/products/' + id, { method: 'DELETE' });
      await loadProducts();
      await loadOverview();
    } catch (e) {
      alert(e.message || 'Failed to delete product.');
    }
  }

  // ---------------- Orders ----------------
  let ordersCache = [];

  async function loadOrders() {
    try {
      ordersCache = await api('/api/orders');
      renderOrdersTable();
    } catch (e) {
      const body = document.getElementById('admin-orders-body');
      if (body) body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#b91c1c;">Failed to load orders.</td></tr>`;
    }
  }

  function renderOrdersTable() {
    const body = document.getElementById('admin-orders-body');
    if (!body) return;

    const searchTerm = (document.getElementById('admin-global-search')?.value || '').toLowerCase().trim();
    let filtered = ordersCache;
    if (searchTerm) {
      filtered = filtered.filter(o => 
        (o.orderNumber && o.orderNumber.toLowerCase().includes(searchTerm)) ||
        (o.customer && o.customer.name && o.customer.name.toLowerCase().includes(searchTerm)) ||
        (o.customer && o.customer.phone && o.customer.phone.toLowerCase().includes(searchTerm))
      );
    }

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:25px;color:#6b7280;">No orders found.</td></tr>`;
      return;
    }

    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    body.innerHTML = filtered.map(o => `
      <tr>
        <td><span class="order-id-tag">${o.orderNumber}</span></td>
        <td>${fmtDate(o.createdAt)}</td>
        <td>${(o.customer && o.customer.name) || '—'}<br><span style="font-size:11px;color:#94a3b8;">${(o.customer && o.customer.phone) || ''}</span></td>
        <td>${o.items.length} item${o.items.length > 1 ? 's' : ''}</td>
        <td><strong>${money(o.total)}</strong></td>
        <td>
          <select class="admin-status-select" data-order-id="${o._id}">
            ${statuses.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('');

    body.querySelectorAll('.admin-status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await api('/api/orders/' + sel.dataset.orderId + '/status', {
            method: 'PUT',
            body: JSON.stringify({ status: sel.value })
          });
          loadOverview();
        } catch (e) {
          alert(e.message || 'Failed to update order status.');
        }
      });
    });
  }

  // ---------------- Users ----------------
  let usersCache = [];

  async function loadUsers() {
    try {
      usersCache = await api('/api/admin/users');
      renderUsersTable();
    } catch (e) {
      const body = document.getElementById('admin-users-body');
      if (body) body.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#b91c1c;">Failed to load users.</td></tr>`;
    }
  }

  function renderUsersTable() {
    const body = document.getElementById('admin-users-body');
    if (!body) return;

    const searchTerm = (document.getElementById('admin-global-search')?.value || '').toLowerCase().trim();
    let filtered = usersCache;
    if (searchTerm) {
      filtered = filtered.filter(u => u.username && u.username.toLowerCase().includes(searchTerm));
    }

    if (!filtered.length) {
      body.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:25px;color:#6b7280;">No users found.</td></tr>`;
      return;
    }

    body.innerHTML = filtered.map(u => `
      <tr>
        <td><strong>${u.username}</strong></td>
        <td><span class="status-pill ${u.role === 'admin' ? 'status-processing' : 'status-delivered'}">${u.role}</span></td>
        <td>${fmtDate(u.createdAt)}</td>
        <td>
          <button class="admin-icon-btn-sm" data-toggle-role="${u._id}" data-current-role="${u.role}">
            <i class="fa-solid fa-user-gear"></i> ${u.role === 'admin' ? 'Make User' : 'Make Admin'}
          </button>
          ${currentAdmin && (currentAdmin._id || currentAdmin.id) !== u._id ? `<button class="admin-danger-btn" data-delete-user="${u._id}"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
        </td>
      </tr>`).join('');

    body.querySelectorAll('[data-toggle-role]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newRole = btn.dataset.currentRole === 'admin' ? 'user' : 'admin';
        if (!confirm(`Change this user's role to "${newRole}"?`)) return;
        try {
          await api('/api/admin/users/' + btn.dataset.toggleRole + '/role', {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
          });
          await loadUsers();
          await loadOverview();
        } catch (e) {
          alert(e.message || 'Failed to update role.');
        }
      });
    });
    body.querySelectorAll('[data-delete-user]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this user account? This cannot be undone.')) return;
        try {
          await api('/api/admin/users/' + btn.dataset.deleteUser, { method: 'DELETE' });
          await loadUsers();
          await loadOverview();
        } catch (e) {
          alert(e.message || 'Failed to delete user.');
        }
      });
    });
  }

  // ---------------- Global Search & Filter Wireup ----------------
  function setupSearchAndFilters() {
    const offerSearch = document.getElementById('offer-search-input');
    const offerFilter = document.getElementById('offer-status-filter');

    if (offerSearch) {
      offerSearch.addEventListener('input', () => renderOffersTable());
    }

    if (offerFilter) {
      offerFilter.addEventListener('change', () => renderOffersTable());
    }

    const globalSearch = document.getElementById('admin-global-search');
    if (globalSearch) {
      globalSearch.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        if (offerSearch) offerSearch.value = val;
        renderOffersTable();
        renderProductsTable();
        renderOrdersTable();
        renderUsersTable();
      });
    }
  }

  // ---------------- Wire up static controls ----------------
  document.addEventListener('DOMContentLoaded', () => {
    checkAccess();

    // Offers wiring
    const addOfferBtn = document.getElementById('add-offer-btn');
    if (addOfferBtn) addOfferBtn.addEventListener('click', () => openOfferModal(null));

    const offerModalClose = document.getElementById('offer-modal-close');
    if (offerModalClose) offerModalClose.addEventListener('click', closeOfferModal);

    const offerModalCancel = document.getElementById('offer-modal-cancel');
    if (offerModalCancel) offerModalCancel.addEventListener('click', closeOfferModal);

    const offerForm = document.getElementById('offer-form');
    if (offerForm) offerForm.addEventListener('submit', submitOfferForm);

    const cancelDeleteOfferBtn = document.getElementById('cancel-delete-offer-btn');
    if (cancelDeleteOfferBtn) cancelDeleteOfferBtn.addEventListener('click', closeDeleteModal);

    const confirmDeleteOfferBtn = document.getElementById('confirm-delete-offer-btn');
    if (confirmDeleteOfferBtn) confirmDeleteOfferBtn.addEventListener('click', executeDeleteOffer);

    // Offer modal interactive controls
    const discountTypeSelect = document.getElementById('offer-discount-type-field');
    const discountUnitAddon = document.getElementById('offer-discount-unit-addon');
    const discountLabel = document.getElementById('offer-discount-value-label');
    if (discountTypeSelect && discountUnitAddon && discountLabel) {
      discountTypeSelect.addEventListener('change', () => {
        if (discountTypeSelect.value === 'percentage') {
          discountUnitAddon.textContent = '%';
          discountLabel.innerHTML = `Discount Value (%) <span style="color:#ef4444;">*</span>`;
        } else {
          discountUnitAddon.textContent = '৳';
          discountLabel.innerHTML = `Discount Value (৳) <span style="color:#ef4444;">*</span>`;
        }
      });
    }

    const activeCb = document.getElementById('offer-active-field');
    const activeLabel = document.getElementById('offer-active-label');
    if (activeCb && activeLabel) {
      activeCb.addEventListener('change', () => {
        activeLabel.textContent = activeCb.checked ? 'Active' : 'Inactive';
        activeLabel.style.color = activeCb.checked ? '#16a34a' : '#64748b';
      });
    }

    const bannerInput = document.getElementById('offer-banner-field');
    if (bannerInput) {
      bannerInput.addEventListener('input', () => updateBannerPreview(bannerInput.value));
    }

    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const img = chip.dataset.img;
        if (bannerInput && img) {
          bannerInput.value = img;
          updateBannerPreview(img);
        }
      });
    });

    setupSearchAndFilters();

    // Products wiring
    document.getElementById('add-product-btn').addEventListener('click', () => openProductModal(null));
    document.getElementById('product-modal-close').addEventListener('click', closeProductModal);
    document.getElementById('product-modal-cancel').addEventListener('click', closeProductModal);
    document.getElementById('product-form').addEventListener('submit', submitProductForm);

    // Logout
    document.getElementById('admin-logout-btn').addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
      window.location.href = '../index.html';
    });
  });
})();
