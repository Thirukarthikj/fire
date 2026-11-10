/**
 * Customer Orders & Order Details Logic
 */
const Orders = {
  currentStatus: 'all',
  currentPage: 1,

  // ---------------- ORDER HISTORY ----------------
  async initOrders() {
    this.setupStatusTabs();
    await this.loadOrders();
  },

  setupStatusTabs() {
    const tabs = document.querySelectorAll('.order-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentStatus = tab.getAttribute('data-status') || 'all';
        this.currentPage = 1;
        this.loadOrders();
      });
    });
  },

  async loadOrders() {
    const container = document.getElementById('orders-list');
    const pagination = document.getElementById('orders-pagination');
    if (!container) return;

    container.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <div class="skeleton skeleton-text" style="width: 50%; margin: 0 auto 12px auto;"></div>
        <div class="skeleton skeleton-text" style="width: 70%; margin: 0 auto;"></div>
      </div>
    `;

    try {
      const res = await API.get('/orders', {
        page: this.currentPage,
        status: this.currentStatus
      });

      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">📦</div>
              <h3>No orders found</h3>
              <p>You haven't placed any orders in this category yet.</p>
              <a href="/products.html" class="btn btn-primary">Shop Fireworks</a>
            </div>
          `;
          if (pagination) pagination.innerHTML = '';
          return;
        }

        container.innerHTML = res.data.map(order => {
          const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
          });

          const statusBadge = this.getStatusBadge(order.status);
          const paymentBadge = this.getPaymentBadge(order.paymentStatus);

          return `
            <div class="card" style="margin-bottom: var(--space-4); padding: var(--space-6);">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px; border-bottom:1px solid var(--color-border); padding-bottom:12px;">
                <div>
                  <span class="font-bold" style="font-size:1.1rem; color:#0f172a;">${App.escapeHtml(order.orderNumber)}</span>
                  <div style="font-size:0.8rem; color:var(--color-text-light);">Ordered on ${dateStr}</div>
                </div>
                <div style="display:flex; gap:8px;">
                  ${statusBadge}
                  ${paymentBadge}
                </div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
                <div>
                  <div style="font-size:0.875rem; color:var(--color-text-light);">
                    ${order.items.length} item(s) • Total: <strong style="font-size:1rem; color:var(--color-accent);">${App.formatPrice(order.total)}</strong>
                  </div>
                </div>
                <a href="/order-details.html?id=${order._id}" class="btn btn-outline btn-sm">View Order Details →</a>
              </div>
            </div>
          `;
        }).join('');

        if (pagination && res.pagination) {
          this.renderPagination(pagination, res.pagination);
        }
      }
    } catch (err) {
      container.innerHTML = `<p class="text-error">Failed to load orders: ${err.message}</p>`;
    }
  },

  renderPagination(container, pagination) {
    if (pagination.pages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `
      <button class="page-btn" ${pagination.page <= 1 ? 'disabled' : ''} onclick="Orders.goToPage(${pagination.page - 1})">
        ← Prev
      </button>
      <span style="font-size:0.85rem; color:#6b7280; padding: 0 8px;">Page ${pagination.page} of ${pagination.pages}</span>
      <button class="page-btn" ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="Orders.goToPage(${pagination.page + 1})">
        Next →
      </button>
    `;
    container.innerHTML = html;
  },

  goToPage(p) {
    this.currentPage = p;
    this.loadOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // ---------------- ORDER DETAILS ----------------
  async initOrderDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      window.location.href = '/orders.html';
      return;
    }

    try {
      const res = await API.get(`/orders/${id}`);
      if (!res.success || !res.data) {
        throw new Error('Order not found');
      }

      this.renderOrderDetail(res.data);
    } catch (err) {
      const main = document.querySelector('main');
      if (main) {
        main.innerHTML = `
          <div class="container section">
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <h3>Order Not Found</h3>
              <p>We could not locate the details for this order.</p>
              <a href="/orders.html" class="btn btn-primary">Return to Orders</a>
            </div>
          </div>
        `;
      }
    }
  },

  renderOrderDetail(order) {
    document.title = `Order #${order.orderNumber} — Firecrackers Store`;

    document.getElementById('order-number-title').textContent = order.orderNumber;
    document.getElementById('order-date-text').textContent = new Date(order.createdAt).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    document.getElementById('order-status-badge').innerHTML = this.getStatusBadge(order.status);
    document.getElementById('order-payment-badge').innerHTML = this.getPaymentBadge(order.paymentStatus);

    // Cancel Button visibility
    const cancelBtn = document.getElementById('btn-cancel-order');
    if (cancelBtn) {
      if (['pending', 'confirmed'].includes(order.status)) {
        cancelBtn.style.display = 'inline-flex';
        cancelBtn.onclick = () => Orders.cancelOrder(order._id);
      } else {
        cancelBtn.style.display = 'none';
      }
    }

    // Items list
    const itemsTable = document.getElementById('order-items-tbody');
    if (itemsTable) {
      itemsTable.innerHTML = order.items.map(item => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${item.image || 'https://placehold.co/60x60?text=Firecrackers'}" style="width:48px; height:48px; border-radius:6px; object-fit:cover;">
              <div>
                <strong style="color:var(--color-text);">${App.escapeHtml(item.name)}</strong>
                <div style="font-size:0.75rem; color:#9ca3af;">SKU: ${App.escapeHtml(item.sku || '')}</div>
              </div>
            </div>
          </td>
          <td>${App.formatPrice(item.price)}</td>
          <td>${item.quantity}</td>
          <td class="font-bold text-right">${App.formatPrice(item.price * item.quantity)}</td>
        </tr>
      `).join('');
    }

    // Totals
    document.getElementById('detail-subtotal').textContent = App.formatPrice(order.subtotal);
    document.getElementById('detail-discount').textContent = order.discount > 0 ? `-${App.formatPrice(order.discount)}` : '₹0';
    document.getElementById('detail-shipping').textContent = order.shippingCharge === 0 ? 'FREE' : App.formatPrice(order.shippingCharge);
    document.getElementById('detail-total').textContent = App.formatPrice(order.total);

    // Shipping Address
    const addr = order.shippingAddress || {};
    document.getElementById('detail-shipping-address').innerHTML = `
      <strong>${App.escapeHtml(addr.name || '')}</strong><br>
      ${App.escapeHtml(addr.addressLine1 || '')}<br>
      ${addr.addressLine2 ? App.escapeHtml(addr.addressLine2) + '<br>' : ''}
      ${App.escapeHtml(addr.city || '')}, ${App.escapeHtml(addr.state || '')} - ${App.escapeHtml(addr.pincode || '')}<br>
      📞 ${App.escapeHtml(addr.phone || '')}
    `;

    // Payment Details
    const payMethodEl = document.getElementById('detail-payment-method');
    if (payMethodEl) payMethodEl.textContent = order.paymentMethod === 'upi_qr' ? 'Google Pay / UPI QR' : (order.paymentMethod || 'Online Gateway');

    const upiRow = document.getElementById('detail-upi-row');
    const upiVal = document.getElementById('detail-upi-utr');
    if (upiRow && upiVal) {
      if (order.upiTransactionId) {
        upiRow.style.display = 'block';
        upiVal.textContent = order.upiTransactionId;
      } else {
        upiRow.style.display = 'none';
      }
    }

    const payStatusEl = document.getElementById('detail-payment-status-badge');
    if (payStatusEl) payStatusEl.innerHTML = this.getPaymentBadge(order.paymentStatus);

    // Status Timeline
    const timelineEl = document.getElementById('order-status-timeline');
    if (timelineEl && order.statusHistory) {
      timelineEl.innerHTML = order.statusHistory.map(step => `
        <div class="timeline-step completed">
          <div class="timeline-dot"></div>
          <div>
            <strong style="text-transform:capitalize; color:#0f172a;">${App.escapeHtml(step.status)}</strong>
            <span style="font-size:0.75rem; color:var(--color-gold); margin-left:8px;">
              ${new Date(step.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <div style="font-size:0.85rem; color:var(--color-text-light); margin-top:2px;">${App.escapeHtml(step.note || '')}</div>
          </div>
        </div>
      `).join('');
    }
  },

  async cancelOrder(orderId) {
    const reason = prompt('Please enter the reason for cancellation:');
    if (reason === null) return;

    try {
      const res = await API.post(`/orders/${orderId}/cancel`, { reason });
      if (res.success) {
        App.showNotification('Order has been cancelled successfully', 'info');
        await this.initOrderDetail();
      }
    } catch (err) {
      App.showNotification(err.message || 'Unable to cancel order', 'error');
    }
  },

  getStatusBadge(status) {
    switch (status) {
      case 'confirmed': return '<span class="badge badge-info">Confirmed</span>';
      case 'processing': return '<span class="badge badge-warning">Processing</span>';
      case 'shipped': return '<span class="badge badge-accent">Shipped</span>';
      case 'delivered': return '<span class="badge badge-success">Delivered</span>';
      case 'cancelled': return '<span class="badge badge-error">Cancelled</span>';
      case 'returned': return '<span class="badge badge-secondary">Returned</span>';
      case 'pending':
      default: return '<span class="badge badge-secondary">Pending</span>';
    }
  },

  getPaymentBadge(paymentStatus) {
    switch (paymentStatus) {
      case 'paid': return '<span class="badge badge-success">Paid</span>';
      case 'failed': return '<span class="badge badge-error">Failed</span>';
      case 'refunded': return '<span class="badge badge-warning">Refunded</span>';
      case 'partially_refunded': return '<span class="badge badge-warning">Partially Refunded</span>';
      case 'pending':
      default: return '<span class="badge badge-secondary">Payment Pending</span>';
    }
  }
};

