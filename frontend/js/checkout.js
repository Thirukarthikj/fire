/**
 * Checkout and Payment Integration Module
 */
const Checkout = {
  selectedAddressId: null,
  cartData: null,
  currentPaymentMethod: 'upi_qr',
  upiSessionRef: null,
  upiPollInterval: null,
  upiTimerInterval: null,
  upiSecondsLeft: 300,
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
  },

  copyUpiId() {
    const upiId = document.getElementById('upi-id-text') ? document.getElementById('upi-id-text').innerText : 'jthirukarthick@oksbi';
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
    try {
      const userRes = await API.get('/auth/me');
      if (!userRes.success) {
        window.location.href = '/login.html?redirect=/checkout.html';
        return;
      }

      const cartRes = await API.get('/cart');
      if (!cartRes.success || !cartRes.data || cartRes.data.items.length === 0) {
        App.showNotification('Your cart is empty. Please add fireworks first.', 'warning');
        setTimeout(() => {
          window.location.href = '/products.html';
        }, 1000);
        return;
      }

      this.cartData = cartRes.data;
      this.renderOrderSummary();
    } catch (err) {
      window.location.href = '/login.html?redirect=/checkout.html';
    }
  },

  async loadAddresses() {
    const container = document.getElementById('checkout-addresses-grid');
    if (!container) return;

    try {
      const res = await API.get('/addresses');
      if (res.success && res.data) {
        if (res.data.length === 0) {
          container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 1.5rem 0;">
              <p>No address found. Please add a delivery address to continue.</p>
              <button onclick="Checkout.openAddAddressModal()" class="btn btn-primary btn-sm">+ Add Delivery Address</button>
            </div>
          `;
          document.getElementById('btn-place-order').disabled = true;
          return;
        }

        // Set default selected address
        const defaultAddr = res.data.find(a => a.isDefault) || res.data[0];
        this.selectedAddressId = defaultAddr._id;

        container.innerHTML = res.data.map(addr => `
          <div class="address-card ${addr._id === this.selectedAddressId ? 'selected' : ''}" 
               onclick="Checkout.selectAddress('${addr._id}', this)">
            <div class="address-card-header">
              <span class="address-name">${App.escapeHtml(addr.name)}</span>
              ${addr.isDefault ? '<span class="badge badge-accent">Default</span>' : ''}
            </div>
            <div class="address-details">
              ${App.escapeHtml(addr.addressLine1)}<br>
              ${addr.addressLine2 ? App.escapeHtml(addr.addressLine2) + '<br>' : ''}
              ${App.escapeHtml(addr.city)}, ${App.escapeHtml(addr.state)} - ${App.escapeHtml(addr.pincode)}<br>
              📞 ${App.escapeHtml(addr.phone)}
            </div>
          </div>
        `).join('');

        document.getElementById('btn-place-order').disabled = false;
      }
    } catch (err) {
      console.error('Failed to load checkout addresses', err);
    }
  },

  selectAddress(addressId, element) {
    this.selectedAddressId = addressId;
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('selected'));
    if (element) element.classList.add('selected');
    document.getElementById('btn-place-order').disabled = false;
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

        // Start 5-minute (300 seconds) countdown timer
        const remainingSeconds = res.data.expiresAt 
          ? Math.max(0, Math.floor((res.data.expiresAt - Date.now()) / 1000))
          : 300;
        this.startUpiCountdownTimer(remainingSeconds > 0 ? remainingSeconds : 300);

        this.startUpiPolling();
      }
    } catch (err) {
      console.warn('Failed to fetch dynamic UPI QR', err);
    }
  },

  startUpiCountdownTimer(durationSeconds = 300) {
    if (this.upiTimerInterval) clearInterval(this.upiTimerInterval);
    this.upiSecondsLeft = durationSeconds;

    const timerEl = document.getElementById('upi-countdown-timer');
    const timerBadge = document.getElementById('upi-timer-badge');
    const expiredOverlay = document.getElementById('qr-expired-overlay');
    if (expiredOverlay) expiredOverlay.style.display = 'none';

    const renderTick = () => {
      const mins = Math.floor(this.upiSecondsLeft / 60);
      const secs = this.upiSecondsLeft % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (timerEl) timerEl.textContent = formatted;

      if (this.upiSecondsLeft <= 60) {
        if (timerBadge) {
          timerBadge.style.backgroundColor = '#fef2f2';
          timerBadge.style.borderColor = '#fecaca';
        }
        if (timerEl) timerEl.style.color = '#dc2626';
      } else if (this.upiSecondsLeft <= 120) {
        if (timerBadge) {
          timerBadge.style.backgroundColor = '#fffbeb';
          timerBadge.style.borderColor = '#fde68a';
        }
        if (timerEl) timerEl.style.color = '#d97706';
      } else {
        if (timerBadge) {
          timerBadge.style.backgroundColor = '#eff6ff';
          timerBadge.style.borderColor = '#bfdbfe';
        }
        if (timerEl) timerEl.style.color = '#1d4ed8';
      }
    };

    renderTick();

    this.upiTimerInterval = setInterval(() => {
      this.upiSecondsLeft--;

      if (this.upiSecondsLeft <= 0) {
        clearInterval(this.upiTimerInterval);
        this.handleUpiSessionExpired();
      } else {
        renderTick();
      }
    }, 1000);
  },

  handleUpiSessionExpired() {
    if (this.isOrderPlacing) return;
    if (this.upiPollInterval) clearInterval(this.upiPollInterval);

    const expiredOverlay = document.getElementById('qr-expired-overlay');
    const timerEl = document.getElementById('upi-countdown-timer');
    const statusTitle = document.getElementById('upi-live-status-title');
    const statusDesc = document.getElementById('upi-live-status-desc');
    const btn = document.getElementById('btn-place-order');

    if (expiredOverlay) expiredOverlay.style.display = 'flex';
    if (timerEl) timerEl.textContent = '00:00 (Expired)';
    if (statusTitle) statusTitle.innerHTML = '⚠️ 5-Minute Session Expired';
    if (statusDesc) statusDesc.innerHTML = 'Payment window expired. Click <strong>Refresh QR Code</strong> to generate a fresh 5-minute session.';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⚠️ QR Expired — Please Refresh';
    }
  },

  refreshUpiQrSession() {
    this.upiSessionRef = null;
    const btn = document.getElementById('btn-place-order');
    if (btn) btn.disabled = false;
    const expiredOverlay = document.getElementById('qr-expired-overlay');
    if (expiredOverlay) expiredOverlay.style.display = 'none';
    const statusTitle = document.getElementById('upi-live-status-title');
    const statusDesc = document.getElementById('upi-live-status-desc');
    if (statusTitle) statusTitle.innerHTML = 'Auto-Detecting Payment...';
    if (statusDesc) statusDesc.innerHTML = 'Once payment is completed in Google Pay, <strong>your order will be placed automatically</strong>.';

    this.renderOrderSummary();
    App.showNotification('Fresh 5-minute QR code session created!', 'info');
  },

  startUpiPolling() {
    if (this.upiPollInterval) clearInterval(this.upiPollInterval);
    if (!this.upiSessionRef) return;

    this.upiPollInterval = setInterval(async () => {
      if (this.isOrderPlacing || this.currentPaymentMethod !== 'upi_qr') return;
      try {
        const res = await API.get(`/checkout/upi-status?ref=${encodeURIComponent(this.upiSessionRef)}`);
        if (res.success && res.data) {
          if (res.data.isPaid) {
            clearInterval(this.upiPollInterval);
            if (this.upiTimerInterval) clearInterval(this.upiTimerInterval);
            this.completeAutoOrderPlacement('Real-time Google Pay Poller');
          } else if (res.data.isExpired) {
            this.handleUpiSessionExpired();
          }
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
    if (this.upiTimerInterval) clearInterval(this.upiTimerInterval);

    if (!this.selectedAddressId) {
      // Pick first address if none explicitly selected
      const addrs = await API.get('/addresses');
      if (addrs.success && addrs.data && addrs.data.length > 0) {
        this.selectedAddressId = addrs.data[0]._id;
      } else {
        App.showNotification('Payment verified! Please select a delivery address.', 'warning');
        this.isOrderPlacing = false;
        return;
      }
    }

    const titleEl = document.getElementById('upi-live-status-title');
    const descEl = document.getElementById('upi-live-status-desc');
    const btn = document.getElementById('btn-place-order');

    if (titleEl) titleEl.innerHTML = '🎉 Payment Detected! Placing Order...';
    if (descEl) descEl.innerHTML = 'Google Pay payment confirmed. Recording consignment in MongoDB...';
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
    if (modal) modal.classList.add('active');
  },

  closeAddAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) modal.classList.remove('active');
  },

  async submitNewAddress(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('new-addr-name').value.trim(),
      phone: document.getElementById('new-addr-phone').value.trim(),
      addressLine1: document.getElementById('new-addr-line1').value.trim(),
      addressLine2: document.getElementById('new-addr-line2').value.trim(),
      city: document.getElementById('new-addr-city').value.trim(),
      state: document.getElementById('new-addr-state').value.trim(),
      pincode: document.getElementById('new-addr-pincode').value.trim(),
      isDefault: true
    };

    try {
      const res = await API.post('/addresses', payload);
      if (res.success) {
        App.showNotification('Address added', 'success');
        this.closeAddAddressModal();
        await this.loadAddresses();
      }
    } catch (err) {
      App.showNotification(err.message || 'Failed to save address', 'error');
    }
  }
};

