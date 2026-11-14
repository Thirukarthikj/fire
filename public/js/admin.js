/**
 * Complete Administrative Control Panel Application
 */
const AdminApp = {
  currentAdmin: null,

  async init(page) {
    this.setupSidebar();
    await this.checkAuth();
    if (page && typeof this[page] === 'function') {
      this[page]();
    }
  },

  setupSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Highlight active link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(link => {
      if (link.getAttribute('href') && currentPath.includes(link.getAttribute('href'))) {
        link.classList.add('active');
      }
    });
  },

  async checkAuth() {
    try {
      const res = await API.get('/auth/me');
      if (res.success && res.data) {
        if (res.data.role !== 'admin' && res.data.role !== 'superadmin') {
          window.location.href = '/admin/login.html';
          return;
        }
        this.currentAdmin = res.data;
        const nameEl = document.getElementById('admin-name');
        if (nameEl) nameEl.textContent = res.data.name;
      }
    } catch (err) {
      if (!window.location.pathname.includes('/admin/login.html')) {
        window.location.href = '/admin/login.html';
      }
    }
  },

  async logout() {
    try {
      await API.post('/auth/logout');
      window.location.href = '/admin/login.html';
    } catch (err) {
      window.location.href = '/admin/login.html';
    }
  },

  // ================= 1. DASHBOARD =================
  async initDashboard() {
    try {
      const [statsRes, ordersRes, chartRes] = await Promise.all([
        API.get('/admin/dashboard/stats'),
        API.get('/admin/dashboard/recent-orders'),
        API.get('/admin/dashboard/sales-chart')
      ]);

      if (statsRes.success) {
        const s = statsRes.data;
        document.getElementById('stat-total-revenue').textContent = App.formatPrice(s.totalRevenue || 0);
        document.getElementById('stat-total-orders').textContent = s.totalOrders || 0;
        document.getElementById('stat-total-customers').textContent = s.totalCustomers || 0;
        document.getElementById('stat-low-stock').textContent = s.lowStockAlerts || 0;
        document.getElementById('stat-successful-payments').textContent = s.successfulPayments || 0;
        document.getElementById('stat-refund-totals').textContent = App.formatPrice(s.refundTotals || 0);
      }

      if (chartRes.success && chartRes.data) {
        this.renderSalesChart(chartRes.data);
      }

      if (ordersRes.success && ordersRes.data) {
        const tbody = document.getElementById('recent-orders-tbody');
        if (tbody) {
          tbody.innerHTML = ordersRes.data.map(o => `
            <tr>
              <td><a href="/admin/orders.html" class="font-bold text-accent">${App.escapeHtml(o.orderNumber)}</a></td>
              <td>${App.escapeHtml(o.user ? o.user.name : 'Guest')}</td>
              <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
              <td class="font-bold">${App.formatPrice(o.total)}</td>
              <td>${Orders.getStatusBadge(o.status)}</td>
              <td>${Orders.getPaymentBadge(o.paymentStatus)}</td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      App.showNotification('Failed to load dashboard metrics', 'error');
    }
  },

  renderSalesChart(data) {
    const container = document.getElementById('sales-bar-chart');
    if (!container) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<div style="margin: auto; color:#9ca3af;">No recent sales transactions recorded.</div>';
      return;
    }

    const maxSales = Math.max(...data.map(d => d.totalSales), 100);

    container.innerHTML = data.map(d => {
      const heightPercent = Math.max(5, Math.round((d.totalSales / maxSales) * 100));
      return `
        <div class="chart-bar-group" title="${d._id}: ${App.formatPrice(d.totalSales)} (${d.orderCount} orders)">
          <div class="chart-bar" style="height: ${heightPercent}%;"></div>
          <span class="chart-label">${d._id.slice(5)}</span>
        </div>
      `;
    }).join('');
  },

  // ================= 2. PRODUCTS =================
  async initProducts() {
    this.productPage = 1;
    await this.loadAdminProducts();

    const searchInput = document.getElementById('product-search');
    if (searchInput) {
      searchInput.addEventListener('input', App.debounce(() => {
        this.productPage = 1;
        this.loadAdminProducts();
      }, 400));
    }
  },

  async loadAdminProducts() {
    const tbody = document.getElementById('admin-products-tbody');
    const search = document.getElementById('product-search') ? document.getElementById('product-search').value : '';
    if (!tbody) return;

    try {
      const res = await API.get('/admin/products', { page: this.productPage, search });
      if (res.success && res.data) {
        tbody.innerHTML = res.data.map(p => {
          const imgUrl = p.images && p.images.length > 0 ? p.images[0].url : 'https://placehold.co/50x50';
          return `
            <tr>
              <td>
                <img src="${imgUrl}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;">
              </td>
              <td>
                <strong>${App.escapeHtml(p.name)}</strong>
                <div style="font-size:0.75rem; color:#9ca3af;">SKU: ${App.escapeHtml(p.sku)}</div>
              </td>
              <td>${App.escapeHtml(p.category ? p.category.name : '—')}</td>
              <td>${App.formatPrice(p.price)}</td>
              <td>
                <span class="badge ${p.stock <= p.lowStockThreshold ? (p.stock === 0 ? 'badge-error' : 'badge-warning') : 'badge-success'}">
                  ${p.stock} units
                </span>
              </td>
              <td>
                <span class="badge ${p.isActive ? 'badge-success' : 'badge-secondary'}">
                  ${p.isActive ? 'Active' : 'Archived'}
                </span>
              </td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button onclick="AdminApp.openEditProductModal('${p._id}')" class="btn btn-outline btn-sm">Edit</button>
                  <button onclick="AdminApp.deleteProduct('${p._id}')" class="btn btn-danger btn-sm">Archive</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      App.showNotification('Failed to load products', 'error');
    }
  },

  async openCreateProductModal() {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('prod-edit-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Add New Firecracker';

    const existingContainer = document.getElementById('prod-existing-images');
    if (existingContainer) existingContainer.innerHTML = '';

    // Populate category dropdown
    const catSelect = document.getElementById('prod-category');
    const catRes = await API.get('/categories');
    if (catRes.success) {
      catSelect.innerHTML = catRes.data.map(c => `
        <option value="${c._id}">${App.escapeHtml(c.name)}</option>
      `).join('');
    }

    modal.classList.add('active');
  },

  async openEditProductModal(id) {
    try {
      const res = await API.get(`/admin/products/${id}`);
      if (!res.success || !res.data) return;
      const p = res.data;

      const modal = document.getElementById('product-modal');
      const form = document.getElementById('product-form');
      form.reset();
      document.getElementById('prod-edit-id').value = p._id;
      document.getElementById('product-modal-title').textContent = 'Edit Firecracker';

      // Load Categories
      const catSelect = document.getElementById('prod-category');
      const catRes = await API.get('/categories');
      if (catRes.success) {
        catSelect.innerHTML = catRes.data.map(c => `
          <option value="${c._id}" ${p.category && (p.category._id === c._id || p.category === c._id) ? 'selected' : ''}>
            ${App.escapeHtml(c.name)}
          </option>
        `).join('');
      }

      document.getElementById('prod-name').value = p.name;
      document.getElementById('prod-sku').value = p.sku;
      document.getElementById('prod-price').value = p.price;
      document.getElementById('prod-discount').value = p.discount || 0;
      document.getElementById('prod-stock').value = p.stock;
      document.getElementById('prod-low-threshold').value = p.lowStockThreshold || 10;
      document.getElementById('prod-description').value = p.description;
      document.getElementById('prod-safety').value = p.safetyInfo || '';
      document.getElementById('prod-featured').checked = p.isFeatured;
      document.getElementById('prod-new').checked = p.isNewArrival;
      document.getElementById('prod-active').checked = p.isActive;

      // Render existing images with Cloudinary indicator & delete action
      const imgContainer = document.getElementById('prod-existing-images');
      if (imgContainer) {
        if (p.images && p.images.length > 0) {
          imgContainer.innerHTML = p.images.map(img => {
            const isCloud = img.url && (img.url.includes('cloudinary.com') || img.public_id);
            return `
              <div style="position: relative; width: 72px; height: 72px; border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <img src="${img.url}" alt="${App.escapeHtml(img.alt || p.name)}" style="width: 100%; height: 100%; object-fit: cover;">
                <span style="position: absolute; bottom: 2px; left: 2px; font-size: 7.5px; font-weight: 700; padding: 1px 4px; background: rgba(15,23,42,0.8); color: #fff; border-radius: 4px;">
                  ${isCloud ? '☁️ Cloud' : '📁 Local'}
                </span>
                <button type="button" onclick="AdminApp.deleteProductImage('${p._id}', '${img._id}')" 
                  title="Remove image from storage"
                  style="position: absolute; top: 2px; right: 2px; background: #dc2626; color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0;">
                  ×
                </button>
              </div>
            `;
          }).join('');
        } else {
          imgContainer.innerHTML = '<span class="text-xs text-light" style="padding: 4px 0;">No images uploaded yet.</span>';
        }
      }

      modal.classList.add('active');
    } catch (err) {
      App.showNotification('Error loading product', 'error');
    }
  },

  closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('active');
  },

  async handleProductFormSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('prod-edit-id').value;

    const formData = new FormData();
    formData.append('name', document.getElementById('prod-name').value.trim());
    formData.append('sku', document.getElementById('prod-sku').value.trim().toUpperCase());
    formData.append('category', document.getElementById('prod-category').value);
    formData.append('price', document.getElementById('prod-price').value);
    formData.append('discount', document.getElementById('prod-discount').value || 0);
    formData.append('stock', document.getElementById('prod-stock').value);
    formData.append('lowStockThreshold', document.getElementById('prod-low-threshold').value || 10);
    formData.append('description', document.getElementById('prod-description').value);
    formData.append('safetyInfo', document.getElementById('prod-safety').value);
    formData.append('isFeatured', document.getElementById('prod-featured').checked);
    formData.append('isNewArrival', document.getElementById('prod-new').checked);
    formData.append('isActive', document.getElementById('prod-active').checked);

    const fileInput = document.getElementById('prod-images');
    if (fileInput && fileInput.files.length > 0) {
      for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('images', fileInput.files[i]);
      }
    }

    try {
      if (editId) {
        // Simple JSON update for text fields
        const payload = {};
        formData.forEach((val, key) => {
          if (key !== 'images') payload[key] = val;
        });
        await API.put(`/admin/products/${editId}`, payload);

        // Upload any newly selected images to Cloudinary
        if (fileInput && fileInput.files.length > 0) {
          const imgFormData = new FormData();
          for (let i = 0; i < fileInput.files.length; i++) {
            imgFormData.append('images', fileInput.files[i]);
          }
          await API.upload(`/admin/products/${editId}/images`, imgFormData);
        }

        App.showNotification('Product and images updated successfully', 'success');
      } else {
        await API.upload('/admin/products', formData);
        App.showNotification('Product created successfully with image storage', 'success');
      }
      this.closeProductModal();
      await this.loadAdminProducts();
    } catch (err) {
      App.showNotification(err.message || 'Operation failed', 'error');
    }
  },

  async deleteProductImage(productId, imgId) {
    if (!confirm('Are you sure you want to remove this image from storage?')) return;
    try {
      const res = await API.delete(`/admin/products/${productId}/images/${imgId}`);
      if (res.success) {
        App.showNotification('Image deleted successfully', 'info');
        await this.openEditProductModal(productId);
        await this.loadAdminProducts();
      }
    } catch (err) {
      App.showNotification(err.message || 'Failed to remove image', 'error');
    }
  },

  async deleteProduct(id) {
    if (!confirm('Are you sure you want to archive this product?')) return;
    try {
      await API.delete(`/admin/products/${id}`);
      App.showNotification('Product archived', 'info');
      await this.loadAdminProducts();
    } catch (err) {
      App.showNotification(err.message || 'Failed to archive product', 'error');
    }
  },

  // ================= 3. INVENTORY =================
  async initInventory() {
    await this.loadInventoryTable();

    const statusFilter = document.getElementById('inventory-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.loadInventoryTable());
    }
  },

  async loadInventoryTable() {
    const tbody = document.getElementById('inventory-tbody');
    const status = document.getElementById('inventory-status-filter') ? document.getElementById('inventory-status-filter').value : '';
    if (!tbody) return;

    try {
      const res = await API.get('/admin/inventory', { status });
      if (res.success && res.data) {
        // Summary
        if (res.summary) {
          document.getElementById('inv-total').textContent = res.summary.totalProducts;
          document.getElementById('inv-low').textContent = res.summary.lowStockCount;
          document.getElementById('inv-out').textContent = res.summary.outOfStockCount;
        }

        tbody.innerHTML = res.data.map(p => `
          <tr>
            <td><strong>${App.escapeHtml(p.name)}</strong></td>
            <td>${App.escapeHtml(p.sku)}</td>
            <td class="font-bold">${p.stock}</td>
            <td>${p.lowStockThreshold}</td>
            <td>
              <span class="badge ${p.stock <= p.lowStockThreshold ? (p.stock === 0 ? 'badge-error' : 'badge-warning') : 'badge-success'}">
                ${p.stock === 0 ? 'Out of Stock' : (p.stock <= p.lowStockThreshold ? 'Low Stock' : 'Adequate')}
              </span>
            </td>
            <td>
              <button onclick="AdminApp.openAdjustStockModal('${p._id}', '${App.escapeHtml(p.name)}', ${p.stock})" class="btn btn-outline btn-sm">Adjust Stock</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      App.showNotification('Failed to load inventory', 'error');
    }
  },

  openAdjustStockModal(id, name, currentStock) {
    document.getElementById('adjust-prod-id').value = id;
    document.getElementById('adjust-prod-name').textContent = name;
    document.getElementById('adjust-current-stock').textContent = currentStock;
    document.getElementById('adjust-modal').classList.add('active');
  },

  closeAdjustStockModal() {
    document.getElementById('adjust-modal').classList.remove('active');
  },

  async submitStockAdjustment(e) {
    e.preventDefault();
    const id = document.getElementById('adjust-prod-id').value;
    const type = document.getElementById('adjust-type').value;
    const quantity = parseInt(document.getElementById('adjust-quantity').value, 10);
    const reason = document.getElementById('adjust-reason').value;

    try {
      await API.put(`/admin/inventory/${id}/adjust`, { type, quantity, reason });
      App.showNotification('Stock level adjusted successfully', 'success');
      this.closeAdjustStockModal();
      await this.loadInventoryTable();
    } catch (err) {
      App.showNotification(err.message || 'Adjustment failed', 'error');
    }
  },

  // ================= 4. ORDERS =================
  async initOrders() {
    this.orderPage = 1;
    await this.loadAdminOrders();

    const filterStatus = document.getElementById('order-filter-status');
    if (filterStatus) {
      filterStatus.addEventListener('change', () => {
        this.orderPage = 1;
        this.loadAdminOrders();
      });
    }
  },

  async loadAdminOrders() {
    const tbody = document.getElementById('admin-orders-tbody');
    const status = document.getElementById('order-filter-status') ? document.getElementById('order-filter-status').value : '';
    if (!tbody) return;

    try {
      const res = await API.get('/admin/orders', { page: this.orderPage, status });
      if (res.success && res.data) {
        tbody.innerHTML = res.data.map(o => `
          <tr>
            <td><strong>${App.escapeHtml(o.orderNumber)}</strong></td>
            <td>${App.escapeHtml((o.shippingAddress && o.shippingAddress.name) || (o.user ? o.user.name : 'Customer'))}</td>
            <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
            <td class="font-bold">${App.formatPrice(o.total)}</td>
            <td>${Orders.getStatusBadge(o.status)}</td>
            <td>${Orders.getPaymentBadge(o.paymentStatus)}</td>
            <td>
              <button onclick="AdminApp.openOrderDetailModal('${o._id}')" class="btn btn-outline btn-sm">Manage</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      App.showNotification('Failed to load orders', 'error');
    }
  },

  async openOrderDetailModal(id) {
    try {
      const res = await API.get(`/admin/orders/${id}`);
      if (!res.success || !res.data) return;

      const { order, payment } = res.data;
      document.getElementById('modal-order-number').textContent = order.orderNumber;
      document.getElementById('modal-order-customer').textContent = `${order.shippingAddress.name} (${order.shippingAddress.phone})`;
      document.getElementById('modal-order-address').textContent = `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`;
      document.getElementById('modal-order-total').textContent = App.formatPrice(order.total);
      
      const methodEl = document.getElementById('modal-order-payment-method');
      if (methodEl) methodEl.textContent = order.paymentMethod === 'upi_qr' ? 'Google Pay / UPI QR' : (order.paymentMethod || 'Google Pay / UPI QR');

      const utrEl = document.getElementById('modal-order-upi-utr');
      if (utrEl) utrEl.textContent = order.upiTransactionId || (payment && (payment.transactionId || payment.upiTransactionId)) || 'Google Pay QR Scan';

      document.getElementById('modal-order-status-badge').innerHTML = Orders.getStatusBadge(order.status);
      document.getElementById('modal-payment-status-badge').innerHTML = Orders.getPaymentBadge(order.paymentStatus);

      // Populate ordered items
      const itemsListEl = document.getElementById('modal-order-items-list');
      if (itemsListEl && Array.isArray(order.items)) {
        itemsListEl.innerHTML = order.items.map((it, idx) => `
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">
            <span>${idx + 1}. ${App.escapeHtml(it.name || (it.product && it.product.name) || 'Fireworks Item')} × ${it.quantity}</span>
            <span style="font-weight: 600; color: #ea580c;">₹${((it.price || 0) * (it.quantity || 1)).toFixed(2)}</span>
          </div>
        `).join('');
      }

      // Populate valid status transition options
      const statusSelect = document.getElementById('new-order-status');
      const validTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered', 'returned'],
        delivered: ['returned'],
        cancelled: [],
        returned: []
      };

      const options = validTransitions[order.status] || [];
      if (options.length === 0) {
        statusSelect.innerHTML = `<option value="">Terminal state (${order.status})</option>`;
        statusSelect.disabled = true;
        document.getElementById('btn-update-status').disabled = true;
      } else {
        statusSelect.disabled = false;
        document.getElementById('btn-update-status').disabled = false;
        statusSelect.innerHTML = options.map(st => `<option value="${st}">${st.toUpperCase()}</option>`).join('');
      }

      document.getElementById('btn-update-status').onclick = async () => {
        const nextStatus = statusSelect.value;
        const note = document.getElementById('status-transition-note').value;
        if (!nextStatus) return;

        try {
          await API.put(`/admin/orders/${order._id}/status`, { status: nextStatus, note });
          App.showNotification('Order status updated', 'success');
          AdminApp.closeOrderDetailModal();
          await AdminApp.loadAdminOrders();
        } catch (err) {
          App.showNotification(err.message || 'Status update failed', 'error');
        }
      };

      document.getElementById('order-detail-modal').classList.add('active');
    } catch (err) {
      App.showNotification('Error loading order detail', 'error');
    }
  },

  closeOrderDetailModal() {
    document.getElementById('order-detail-modal').classList.remove('active');
  },

  // ================= 5. PAYMENTS & REFUNDS =================
  async initPayments() {
    try {
      const res = await API.get('/admin/payments');
      const tbody = document.getElementById('payments-tbody');
      if (tbody && res.success && res.data) {
        tbody.innerHTML = res.data.map(p => `
          <tr>
            <td><code style="font-size:0.8rem;">${p.transactionId || p.upiTransactionId || 'UPI-DIRECT'}</code></td>
            <td>${p.order ? p.order.orderNumber : '—'}</td>
            <td class="font-bold">${App.formatPrice(p.amount)}</td>
            <td>${Orders.getPaymentBadge(p.status)}</td>
            <td>${p.totalRefunded > 0 ? App.formatPrice(p.totalRefunded) : '₹0'}</td>
            <td>${new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
            <td>
              ${p.status === 'captured' ? `<button onclick="AdminApp.openRefundModal('${p._id}', ${p.amount - p.totalRefunded})" class="btn btn-outline btn-sm">Issue Refund</button>` : '—'}
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      App.showNotification('Failed to load payments', 'error');
    }
  },

  openRefundModal(paymentId, maxRefundable) {
    document.getElementById('refund-payment-id').value = paymentId;
    document.getElementById('refund-max-amount').textContent = App.formatPrice(maxRefundable);
    document.getElementById('refund-amount').value = maxRefundable;
    document.getElementById('refund-modal').classList.add('active');
  },

  closeRefundModal() {
    document.getElementById('refund-modal').classList.remove('active');
  },

  async submitRefund(e) {
    e.preventDefault();
    const id = document.getElementById('refund-payment-id').value;
    const amount = Number(document.getElementById('refund-amount').value);
    const reason = document.getElementById('refund-reason').value;

    try {
      await API.post(`/admin/payments/${id}/refund`, { amount, reason });
      App.showNotification('Refund processed successfully', 'success');
      this.closeRefundModal();
      await this.initPayments();
    } catch (err) {
      App.showNotification(err.message || 'Refund processing failed', 'error');
    }
  },

  // ================= 6. CATEGORIES =================
  async initCategories() {
    try {
      const res = await API.get('/admin/categories');
      const tbody = document.getElementById('categories-tbody');
      if (tbody && res.success && res.data) {
        tbody.innerHTML = res.data.map(c => `
          <tr>
            <td><strong>${App.escapeHtml(c.name)}</strong></td>
            <td><code>${App.escapeHtml(c.slug)}</code></td>
            <td>${c.productCount || 0} items</td>
            <td><span class="badge ${c.isActive ? 'badge-success' : 'badge-secondary'}">${c.isActive ? 'Active' : 'Hidden'}</span></td>
            <td>
              <button onclick="AdminApp.deleteCategory('${c._id}')" class="btn btn-danger btn-sm">Delete</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      App.showNotification('Failed to load categories', 'error');
    }
  },

  async openCreateCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.classList.add('active');
  },

  closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.classList.remove('active');
  },

  async submitCategory(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('cat-name').value.trim(),
      description: document.getElementById('cat-desc').value.trim(),
      displayOrder: parseInt(document.getElementById('cat-order').value, 10) || 1,
      isActive: document.getElementById('cat-active').checked
    };

    try {
      await API.post('/admin/categories', payload);
      App.showNotification('Category created', 'success');
      this.closeCategoryModal();
      await this.initCategories();
    } catch (err) {
      App.showNotification(err.message || 'Failed to create category', 'error');
    }
  },

  async deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await API.delete(`/admin/categories/${id}`);
      App.showNotification('Category deleted', 'info');
      await this.initCategories();
    } catch (err) {
      App.showNotification(err.message || 'Cannot delete category with products', 'error');
    }
  },

  // ================= 7. COUPONS =================
  async initCoupons() {
    try {
      const res = await API.get('/admin/coupons');
      const tbody = document.getElementById('coupons-tbody');
      if (tbody && res.success && res.data) {
        tbody.innerHTML = res.data.map(c => `
          <tr>
            <td><strong class="text-accent">${App.escapeHtml(c.code)}</strong></td>
            <td>${c.type === 'percentage' ? `${c.value}%` : App.formatPrice(c.value)}</td>
            <td>${App.formatPrice(c.minOrderAmount || 0)}</td>
            <td>${c.usedCount || 0} / ${c.usageLimit || '∞'}</td>
            <td>${new Date(c.endDate).toLocaleDateString('en-IN')}</td>
            <td><span class="badge ${c.isActive ? 'badge-success' : 'badge-secondary'}">${c.isActive ? 'Active' : 'Disabled'}</span></td>
            <td>
              <button onclick="AdminApp.deleteCoupon('${c._id}')" class="btn btn-danger btn-sm">Delete</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      App.showNotification('Failed to load coupons', 'error');
    }
  },

  openCreateCouponModal() {
    document.getElementById('coupon-modal').classList.add('active');
  },

  closeCouponModal() {
    document.getElementById('coupon-modal').classList.remove('active');
  },

  async submitCoupon(e) {
    e.preventDefault();
    const payload = {
      code: document.getElementById('coup-code').value.trim().toUpperCase(),
      description: document.getElementById('coup-desc').value.trim(),
      type: document.getElementById('coup-type').value,
      value: Number(document.getElementById('coup-value').value),
      minOrderAmount: Number(document.getElementById('coup-min').value) || 0,
      maxDiscount: Number(document.getElementById('coup-max').value) || undefined,
      startDate: document.getElementById('coup-start').value,
      endDate: document.getElementById('coup-end').value,
      usageLimit: Number(document.getElementById('coup-limit').value) || undefined
    };

    try {
      await API.post('/admin/coupons', payload);
      App.showNotification('Coupon created', 'success');
      this.closeCouponModal();
      await this.initCoupons();
    } catch (err) {
      App.showNotification(err.message || 'Failed to create coupon', 'error');
    }
  },

  async deleteCoupon(id) {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await API.delete(`/admin/coupons/${id}`);
      App.showNotification('Coupon deleted', 'info');
      await this.initCoupons();
    } catch (err) {
      App.showNotification(err.message || 'Failed to delete coupon', 'error');
    }
  },

  // ================= 8. REPORTS =================
  async initReports() {
    const reportType = document.getElementById('report-type');
    if (reportType) {
      reportType.addEventListener('change', () => this.generateReport());
    }
    await this.generateReport();
  },

  async generateReport() {
    const type = document.getElementById('report-type') ? document.getElementById('report-type').value : 'sales';
    const container = document.getElementById('report-output-container');
    if (!container) return;

    try {
      const res = await API.get(`/admin/reports/${type}`);
      if (res.success && res.data) {
        if (type === 'sales') {
          const s = res.data.summary;
          container.innerHTML = `
            <div class="stats-grid" style="margin-bottom: var(--space-6);">
              <div class="stat-card">
                <span class="stat-label">Gross Revenue</span>
                <span class="stat-value">${App.formatPrice(s.grossRevenue)}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Total Refunded</span>
                <span class="stat-value" style="color:var(--color-error);">${App.formatPrice(s.totalRefunded)}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Net Collected</span>
                <span class="stat-value" style="color:var(--color-success);">${App.formatPrice(s.netRevenue)}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Total Orders</span>
                <span class="stat-value">${s.totalOrders}</span>
              </div>
            </div>
            <div class="table-container">
              <table class="table">
                <thead><tr><th>Date</th><th>Orders</th><th>Sales</th><th>Discounts</th></tr></thead>
                <tbody>
                  ${res.data.trends.map(t => `
                    <tr><td>${t._id}</td><td>${t.totalOrders}</td><td>${App.formatPrice(t.totalSales)}</td><td>${App.formatPrice(t.totalDiscount)}</td></tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        } else if (type === 'inventory') {
          const s = res.data.summary;
          container.innerHTML = `
            <div class="stats-grid" style="margin-bottom: var(--space-6);">
              <div class="stat-card"><span class="stat-label">Total Items</span><span class="stat-value">${s.totalProducts}</span></div>
              <div class="stat-card"><span class="stat-label">Total Stock Units</span><span class="stat-value">${s.totalStockUnits}</span></div>
              <div class="stat-card"><span class="stat-label">Total Stock Asset</span><span class="stat-value">${App.formatPrice(s.totalStockValue)}</span></div>
              <div class="stat-card"><span class="stat-label">Out of Stock</span><span class="stat-value text-error">${s.outOfStock}</span></div>
            </div>
            <div class="table-container">
              <table class="table">
                <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Threshold</th><th>Value</th><th>Status</th></tr></thead>
                <tbody>
                  ${res.data.items.map(i => `
                    <tr>
                      <td>${App.escapeHtml(i.name)}</td>
                      <td>${App.escapeHtml(i.sku)}</td>
                      <td class="font-bold">${i.stock}</td>
                      <td>${i.lowStockThreshold}</td>
                      <td>${App.formatPrice(i.stockValue)}</td>
                      <td><span class="badge ${i.status === 'out_of_stock' ? 'badge-error' : (i.status === 'low_stock' ? 'badge-warning' : 'badge-success')}">${i.status}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        } else {
          container.innerHTML = `<pre style="background:#fff; padding:1.5rem; border-radius:12px; overflow-x:auto;">${JSON.stringify(res.data, null, 2)}</pre>`;
        }
      }
    } catch (err) {
      container.innerHTML = `<p class="text-error">Report generation failed: ${err.message}</p>`;
    }
  },

  exportCSV() {
    window.print();
  },

  // ================= 9. SETTINGS =================
  async initSettings() {
    try {
      const res = await API.get('/admin/settings');
      if (res.success && res.data) {
        const s = res.data;
        document.getElementById('set-site-name').value = s.siteName || '';
        document.getElementById('set-email').value = s.contactEmail || '';
        document.getElementById('set-phone').value = s.contactPhone || '';
        document.getElementById('set-shipping').value = s.shippingCharge || 100;
        document.getElementById('set-free-shipping').value = s.freeShippingThreshold || 1500;
        document.getElementById('set-states').value = s.allowedStates || '';
      }
    } catch (err) {
      App.showNotification('Failed to load settings', 'error');
    }
  },

  async saveSettings(e) {
    e.preventDefault();
    const payload = {
      siteName: document.getElementById('set-site-name').value.trim(),
      contactEmail: document.getElementById('set-email').value.trim(),
      contactPhone: document.getElementById('set-phone').value.trim(),
      shippingCharge: document.getElementById('set-shipping').value,
      freeShippingThreshold: document.getElementById('set-free-shipping').value,
      allowedStates: document.getElementById('set-states').value.trim()
    };

    try {
      await API.put('/admin/settings', payload);
      App.showNotification('Operational settings saved successfully', 'success');
    } catch (err) {
      App.showNotification(err.message || 'Failed to update settings', 'error');
    }
  }
};

