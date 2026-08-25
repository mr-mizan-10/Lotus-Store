(function () {
  "use strict";

  const API_ROOT =
    (typeof window !== 'undefined' && (window.API_BASE_URL || window.API_ROOT)) ||
    (typeof window !== 'undefined' && window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://lotus-store.onrender.com');

  const money = n => "৳" + Number(n || 0).toLocaleString("en-BD");

  const statusClass = {
    pending: 'status-pending',
    processing: 'status-processing',
    shipped: 'status-shipped',
    delivered: 'status-delivered',
    cancelled: 'status-cancelled'
  };
  const statusIcon = {
    pending: 'fa-clock',
    processing: 'fa-arrows-rotate',
    shipped: 'fa-truck',
    delivered: 'fa-circle-check',
    cancelled: 'fa-circle-xmark'
  };

  function fmtDate(d) {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ''; }
  }

  async function loadDashboard() {
    let user = null;
    try {
      const meRes = await fetch(API_ROOT + '/api/auth/me', { credentials: 'include' });
      if (!meRes.ok) {
        // Not logged in - send back to the store and prompt for login
        window.location.href = '../index.html?login=1';
        return;
      }
      user = await meRes.json();
    } catch (e) {
      return; // backend offline: leave the static placeholder content in place
    }

    try {
      const ordersRes = await fetch(API_ROOT + '/api/orders/mine', { credentials: 'include' });
      if (!ordersRes.ok) return;
      const orders = await ordersRes.json();

      const statTotalOrders = document.getElementById('stat-total-orders');
      if (statTotalOrders) statTotalOrders.textContent = orders.length;

      const tbody = document.getElementById('dash-orders-body');
      if (!tbody) return;

      if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#6b7280;">No orders yet — your placed orders will show up here.</td></tr>`;
        return;
      }

      tbody.innerHTML = orders.map(o => {
        const itemSummary = o.items.length === 1
          ? `1 item (${o.items[0].name})`
          : `${o.items.length} items (${o.items[0].name}${o.items.length > 1 ? ' + more' : ''})`;
        const st = o.status || 'pending';
        const cls = statusClass[st] || 'status-pending';
        const icon = statusIcon[st] || 'fa-clock';
        const paymentLabel = o.paymentMethod === 'cod' ? 'Cash on Delivery' : (o.paymentMethod || 'Cash on Delivery');

        return `
          <tr>
            <td><span class="order-id-tag">${o.orderNumber}</span></td>
            <td>${fmtDate(o.createdAt)}</td>
            <td>${itemSummary}</td>
            <td>${paymentLabel}</td>
            <td><strong>${money(o.total)}</strong></td>
            <td><span class="status-pill ${cls}"><i class="fa-solid ${icon}"></i> ${st.charAt(0).toUpperCase() + st.slice(1)}</span></td>
            <td><button class="btn-invoice" data-order='${JSON.stringify({ 
              id: o.orderNumber, 
              status: st, 
              total: o.total, 
              customer: o.customer,
              items: o.items,
              discount: o.discount || 0,
              createdAt: o.createdAt
            }).replace(/'/g, "&apos;")}'>View Details</button></td>
          </tr>`;
      }).join('');

      tbody.querySelectorAll('.btn-invoice').forEach(btn => {
        btn.addEventListener('click', () => {
          try {
            const d = JSON.parse(btn.getAttribute('data-order'));
            showInvoiceModal(d);
          } catch(e) {
            alert('Failed to load order details');
          }
        });
      });
    } catch (e) { /* backend offline: keep static demo rows */ }
  }

  function showInvoiceModal(order) {
    let modal = document.getElementById('dash-invoice-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dash-invoice-modal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
      document.body.appendChild(modal);
    }

    const itemsHtml = (order.items || []).map(it => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
        <div>
          <strong>${it.name}</strong> <span style="color:#64748b;">x ${it.quantity}</span>
          ${it.size && it.size !== 'Default' ? `<div style="font-size:11.5px;color:#94a3b8;">Size: ${it.size}</div>` : ''}
        </div>
        <strong>${money(it.price * it.quantity)}</strong>
      </div>
    `).join('');

    modal.innerHTML = `
      <div style="background:#fff;border-radius:12px;max-width:500px;width:100%;padding:26px;box-shadow:0 20px 40px rgba(0,0,0,0.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
          <div>
            <h3 style="margin:0;color:#0f172a;font-size:1.2rem;">Order #${order.id}</h3>
            <span style="font-size:12px;color:#64748b;">Placed on ${fmtDate(order.createdAt)}</span>
          </div>
          <button id="close-invoice-modal-btn" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;padding:4px;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="margin-bottom:16px;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;color:#334155;line-height:1.5;">
          <div><strong>Status:</strong> <span style="text-transform:capitalize;font-weight:700;color:#2563EB;">${order.status}</span></div>
          <div><strong>Customer:</strong> ${(order.customer && order.customer.name) || 'Customer'}</div>
          <div><strong>Phone:</strong> ${(order.customer && order.customer.phone) || '—'}</div>
          <div><strong>Address:</strong> ${(order.customer && order.customer.address) || '—'}</div>
        </div>
        <div style="margin-bottom:16px;">
          <h4 style="margin:0 0 8px 0;font-size:13px;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Ordered Items</h4>
          <div style="max-height:180px;overflow-y:auto;">
            ${itemsHtml || '<p style="font-size:13px;color:#64748b;">No item details</p>'}
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #e2e8f0;font-size:16px;">
          <strong style="color:#0f172a;">Total Paid/Due:</strong>
          <strong style="color:#2563EB;font-size:18px;">${money(order.total)}</strong>
        </div>
        <div style="margin-top:20px;text-align:right;">
          <button id="close-invoice-modal-btn2" style="background:#2563EB;color:#fff;border:none;padding:8px 18px;border-radius:6px;font-weight:600;font-size:13.5px;cursor:pointer;">Close</button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    const closeBtn = modal.querySelector('#close-invoice-modal-btn');
    const closeBtn2 = modal.querySelector('#close-invoice-modal-btn2');
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; };
    if (closeBtn2) closeBtn2.onclick = () => { modal.style.display = 'none'; };
  }

  document.addEventListener('DOMContentLoaded', loadDashboard);
})();
