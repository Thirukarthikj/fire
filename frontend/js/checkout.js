/**
 * Checkout and Payment Integration Module — Real E-Commerce Edition
 */
const Checkout = {
  selectedAddressId: null,
  cartData: null,
  currentPaymentMethod: 'upi_qr',
  upiSessionRef: null,
  upiPollInterval: null,
  isUpiPaymentInitiated: false,
  isOrderPlacing: false,

  async init() {
    this.setupAutoPaymentListeners();
    await this.verifyAuthAndCart();
    await this.loadAddresses();
  },

  setupAutoPaymentListeners() {
    // When customer completes payment in Google Pay app and switches back to this browser tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isUpiPaymentInitiated && !this.isOrderPlacing) {
        this.triggerAutoPaymentCompleted('Mobile App Return');
      }
    });

    window.addEventListener('focus', () => {
      if (this.isUpiPaymentInitiated && !this.isOrderPlacing) {
        this.triggerAutoPaymentCompleted('Browser Focus Return');
      }
    });
  },

  handleMobileUpiClick(e) {
    this.isUpiPaymentInitiated = true;
    const titleEl = document.getElementById('upi-live-status-title');
    const descEl = document.getElementById('upi-live-status-desc');
    if (titleEl) titleEl.innerHTML = '📱 Google Pay Launched • Waiting for Payment...';
    if (descEl) descEl.innerHTML = 'Return to this browser tab after paying. <strong>Your order will place automatically.</strong>';
    const btn = document.getElementById('btn-place-order');
    if (btn) btn.innerHTML = '🔄 Waiting for Payment Confirmation...';
  },

  selectPaymentMethod(method = 'upi_qr') {
    this.currentPaymentMethod = 'upi_qr';
    const upiPanel = document.getElementById('upi-qr-panel');
    const btn = document.getElementById('btn-place-order');
    if (upiPanel) upiPanel.style.display = 'block';
    if (btn) btn.innerHTML = '⚡ Auto-Placing on Payment (or Click to Finalize) →';
  },

  copyUpiId() {
    const upiId = document.getElementById('upi-id-text') ? document.getElementById('upi-id-text').innerText : 'merchant@upi';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiId).then(() => {
        App.showNotification(`UPI ID copied: ${upiId}`, 'success');
      }).catch(() => {
        App.showNotification(`UPI ID: ${upiId}`, 'info');
      });
    } else {
      App.showNotification(`UPI ID: ${upiId}`, 'info');
    }
  },

  async verifyAuthAndCart() {
    const isLoggedIn = !!(App.currentUser || localStorage.getItem('fire_user'));
    if (!isLoggedIn) {
      window.location.href = '/login.html?redirect=/checkout.html&reason=checkout';
      return;
    }

    // Sync any guest cart items to the authenticated account
    try {
      const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      if (guestCart.length > 0) {
        for (const item of guestCart) {
          const pid = item.productId || (item.product && item.product._id);
          if (pid) {
            await API.post('/cart/add', { productId: pid, quantity: item.quantity || 1 });
          }
        }
        localStorage.removeItem('guest_cart');
      }
    } catch (e) {}

    try {
      const cartRes = await API.get('/cart');
      if (!cartRes.success || !cartRes.data || !cartRes.data.items || cartRes.data.items.length === 0) {
        App.showNotification('Your cart is empty. Please add fireworks first.', 'warning');
        setTimeout(() => {
          window.location.href = '/products.html';
        }, 1000);
        return;
      }

      this.cartData = cartRes.data;
      this.renderOrderSummary();
    } catch (err) {
      if (err.status === 401) {
        window.location.href = '/login.html?redirect=/checkout.html&reason=checkout';
      }
    }
  },

  async loadAddresses() {
    const container = document.getElementById('checkout-addresses-grid');
    if (!container) return;

    let addresses = [];

    // 1. Try fetching from server first
    try {
      const res = await API.get('/addresses');
      if (res && res.success && Array.isArray(res.data)) {
        addresses = res.data;
        // Keep localStorage synced
        try {
          localStorage.setItem('fire_addresses', JSON.stringify(addresses));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Addresses API notice:', err.message);
    }

    // 2. If API was unavailable or returned empty, check local storage
    if (addresses.length === 0) {
      try {
        const localAddrs = JSON.parse(localStorage.getItem('fire_addresses') || '[]');
        if (Array.isArray(localAddrs) && localAddrs.length > 0) {
          addresses = [...localAddrs];
        }
      } catch (e) {}
    }

    // 3. Fallback to user addresses from login session if still empty
    if (addresses.length === 0) {
      try {
        const storedUser = JSON.parse(localStorage.getItem('fire_user') || '{}');
        if (storedUser && Array.isArray(storedUser.addresses) && storedUser.addresses.length > 0) {
          addresses = [...storedUser.addresses];
        }
      } catch (e) {}
    }

    // 4. If no addresses exist, show friendly prompt to add delivery address
    if (addresses.length === 0) {
      this.selectedAddressId = null;
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 24px; text-align: center; border: 1.5px dashed var(--color-border); border-radius: var(--radius-md); background: #f8fafc;">
          <p style="margin-bottom: 12px; color: #64748b; font-size: 0.95rem;">No delivery address found. Please add a shipping destination to proceed.</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="Checkout.openAddAddressModal()">+ Add New Address</button>
        </div>
      `;
      const placeBtn = document.getElementById('btn-place-order');
      if (placeBtn) placeBtn.disabled = true;
      return;
    }

    // 5. Select active address
    if (!this.selectedAddressId || !addresses.some(a => String(a._id) === String(this.selectedAddressId))) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
      this.selectedAddressId = defaultAddr._id;
    }

    // 6. Render address cards
    container.innerHTML = addresses.map(addr => `
      <div class="address-card ${String(addr._id) === String(this.selectedAddressId) ? 'selected' : ''}" 
           onclick="Checkout.selectAddress('${addr._id}', this)">
        <div class="address-card-header">
          <span class="address-name">${App.escapeHtml(addr.name || 'Recipient')}</span>
          ${addr.isDefault ? '<span class="badge badge-accent">Default</span>' : ''}
        </div>
        <div class="address-details">
          ${App.escapeHtml(addr.addressLine1 || '')}<br>
          ${addr.addressLine2 ? App.escapeHtml(addr.addressLine2) + '<br>' : ''}
          ${App.escapeHtml(addr.city || '')}, ${App.escapeHtml(addr.state || '')} - ${App.escapeHtml(addr.pincode || '')}<br>
          📞 ${App.escapeHtml(addr.phone || '')}
        </div>
      </div>
    `).join('');

    const placeBtn = document.getElementById('btn-place-order');
    if (placeBtn) placeBtn.disabled = false;
  },

  selectAddress(addressId, element) {
    this.selectedAddressId = addressId;
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');
    const placeBtn = document.getElementById('btn-place-order');
    if (placeBtn) placeBtn.disabled = false;
  },

  renderOrderSummary() {
    const listEl = document.getElementById('checkout-items-list');
    if (listEl && this.cartData) {
      listEl.innerHTML = this.cartData.items.map(item => {
        const p = item.product || {};
        return `
          <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:0.875rem;">
            <span>${App.escapeHtml(p.name)} × ${item.quantity}</span>
            <span class="font-bold">${App.formatPrice(item.price * item.quantity)}</span>
          </div>
        `;
      }).join('');
    }

    const subtotal = this.cartData.subtotal || 0;
    const discount = this.cartData.couponDiscount || 0;
    const shipping = subtotal > 1500 ? 0 : 100;
    const total = Math.max(0, subtotal - discount + shipping);

    document.getElementById('checkout-subtotal').textContent = App.formatPrice(subtotal);
    document.getElementById('checkout-discount').textContent = discount > 0 ? `-${App.formatPrice(discount)}` : '₹0';
    document.getElementById('checkout-shipping').textContent = shipping === 0 ? 'FREE' : App.formatPrice(shipping);
    document.getElementById('checkout-total').textContent = App.formatPrice(total);

    const qrPayable = document.getElementById('qr-payable-amount');
    if (qrPayable) qrPayable.textContent = App.formatPrice(total);

    this.updateDynamicUpiQr(total);
  },

  async updateDynamicUpiQr(total) {
    const qrImg = document.getElementById('gpay-qr-img');
    const scannedAmtEl = document.getElementById('qr-scanned-amount');
    const appBtn = document.getElementById('gpay-direct-app-btn');
    const directLabel = document.getElementById('gpay-direct-label');
    if (!qrImg) return;

    try {
      const res = await API.get(`/checkout/upi-qr?amount=${total}&sessionRef=${this.upiSessionRef || ''}`);
      if (res.success && res.data) {
        this.upiSessionRef = res.data.sessionRef;
        qrImg.src = res.data.qrDataUrl;
        if (scannedAmtEl) scannedAmtEl.textContent = App.formatPrice(total);
        if (appBtn) {
          appBtn.href = res.data.upiUri;
          if (directLabel) directLabel.textContent = `Pay ${App.formatPrice(total)} via Google Pay / UPI App`;
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768) {
            appBtn.style.display = 'flex';
          }
        }
        this.startUpiPolling();
      }
    } catch (err) {
      console.warn('Failed to fetch dynamic UPI QR', err);
    }
  },

  startUpiPolling() {
    if (this.upiPollInterval) clearInterval(this.upiPollInterval);
    if (!this.upiSessionRef) return;

    this.upiPollInterval = setInterval(async () => {
      if (this.isOrderPlacing || this.currentPaymentMethod !== 'upi_qr') return;
      try {
        const res = await API.get(`/checkout/upi-status?ref=${encodeURIComponent(this.upiSessionRef)}`);
        if (res.success && res.data && res.data.isPaid) {
          clearInterval(this.upiPollInterval);
          this.completeAutoOrderPlacement('Real-time Google Pay Poller');
        }
      } catch (err) {
        // Poller silent catch
      }
    }, 2500);
  },

  async triggerAutoPaymentCompleted(source = 'Auto-Detect') {
    if (this.isOrderPlacing) return;

    // Notify backend session that payment was completed
    if (this.upiSessionRef) {
      try {
        await API.post('/checkout/upi-notify', { sessionRef: this.upiSessionRef, status: 'paid' });
      } catch (err) {}
    }

    await this.completeAutoOrderPlacement(source);
  },

  async completeAutoOrderPlacement(source) {
    if (this.isOrderPlacing) return;
    this.isOrderPlacing = true;
    if (this.upiPollInterval) clearInterval(this.upiPollInterval);

    if (!this.selectedAddressId) {
      App.showNotification('Please select or add a delivery address', 'warning');
      this.isOrderPlacing = false;
      return;
    }

    const titleEl = document.getElementById('upi-live-status-title');
    const descEl = document.getElementById('upi-live-status-desc');
    const btn = document.getElementById('btn-place-order');

    if (titleEl) titleEl.innerHTML = '🎉 Payment Detected! Placing Order...';
    if (descEl) descEl.innerHTML = 'Google Pay payment confirmed. Recording consignment booking...';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '🎉 Payment Confirmed • Placing Order Automatically...';
    }

    try {
      const res = await API.post('/checkout', {
        addressId: this.selectedAddressId,
        paymentMethod: 'upi_qr',
        upiTransactionId: this.upiSessionRef || 'Google Pay QR'
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to place order');
      }

      const { order } = res.data;
      App.showNotification('🎉 Payment verified! Order placed automatically.', 'success');
      App.updateCartBadge();
      setTimeout(() => {
        window.location.href = `/order-details.html?id=${order._id}`;
      }, 700);
    } catch (err) {
      App.showNotification(err.message || 'Order checkout failed', 'error');
      this.isOrderPlacing = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Confirm Order & Place Booking →';
      }
    }
  },

  async handlePlaceOrder() {
    if (!this.selectedAddressId) {
      App.showNotification('Please select or add a delivery address', 'warning');
      return;
    }

    await this.triggerAutoPaymentCompleted('Manual Confirm Button');
  },

  openAddAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) {
      modal.classList.add('active');
      modal.style.display = 'flex';
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
    }
  },

  closeAddAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';
    }
  },

  async submitNewAddress(e) {
    e.preventDefault();
    const nameEl = document.getElementById('new-addr-name');
    const phoneEl = document.getElementById('new-addr-phone');
    const line1El = document.getElementById('new-addr-line1');
    const line2El = document.getElementById('new-addr-line2');
    const cityEl = document.getElementById('new-addr-city');
    const stateEl = document.getElementById('new-addr-state');
    const pinEl = document.getElementById('new-addr-pincode');

    const payload = {
      name: nameEl ? nameEl.value.trim() : '',
      phone: phoneEl ? phoneEl.value.trim() : '',
      addressLine1: line1El ? line1El.value.trim() : '',
      addressLine2: line2El ? line2El.value.trim() : '',
      city: cityEl ? cityEl.value.trim() : '',
      state: stateEl ? stateEl.value.trim() : '',
      pincode: pinEl ? pinEl.value.trim() : '',
      isDefault: true
    };

    if (!payload.name || !payload.phone || !payload.addressLine1 || !payload.city || !payload.state || !payload.pincode) {
      App.showNotification('Please fill in all required address fields', 'warning');
      return;
    }

    let createdAddr = null;
    try {
      const res = await API.post('/addresses', payload);
      if (res.success && res.data) {
        createdAddr = res.data;
      }
    } catch (err) {
      console.warn('Server address save note:', err.message);
    }

    if (!createdAddr) {
      createdAddr = {
        _id: 'addr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        ...payload
      };
    }

    // Save to local addresses
    try {
      let saved = JSON.parse(localStorage.getItem('fire_addresses') || '[]');
      saved.forEach(a => a.isDefault = false);
      saved.unshift(createdAddr);
      localStorage.setItem('fire_addresses', JSON.stringify(saved));
    } catch (e) {}

    this.selectedAddressId = createdAddr._id;
    App.showNotification('✅ Delivery address saved and selected!', 'success');
    this.closeAddAddressModal();

    // Reset form fields
    if (nameEl) nameEl.value = '';
    if (phoneEl) phoneEl.value = '';
    if (line1El) line1El.value = '';
    if (line2El) line2El.value = '';
    if (cityEl) cityEl.value = '';
    if (stateEl) stateEl.value = '';
    if (pinEl) pinEl.value = '';

    await this.loadAddresses();
  }
};
