/**
 * Shopping Cart Management Module — Supports Guest Shopping & Seamless Account Checkout
 */
const Cart = {
  async init() {
    await this.loadCart();
    this.setupCouponForm();
  },

  isLoggedIn() {
    return !!(App.currentUser || localStorage.getItem('fire_user'));
  },

  async loadCart() {
    const itemsContainer = document.getElementById('cart-items-container');
    const summaryContainer = document.getElementById('cart-summary-container');
    if (!itemsContainer) return;

    // If logged in, first sync any guest cart items to account
    if (this.isLoggedIn()) {
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
      } catch (syncErr) {
        console.warn('Guest cart synchronization notice:', syncErr);
      }

      try {
        const res = await API.get('/cart');
        if (res.success && res.data) {
          const cart = res.data;
          if (!cart.items || cart.items.length === 0) {
            this.renderEmptyCart(itemsContainer, summaryContainer);
            return;
          }
          this.renderCartView(cart, true, itemsContainer, summaryContainer);
          return;
        }
      } catch (err) {
        console.warn('Could not load account cart, checking local storage:', err);
      }
    }

    // Guest Cart path
    const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
    if (!guestCart || guestCart.length === 0) {
      this.renderEmptyCart(itemsContainer, summaryContainer);
      return;
    }

    const subtotal = guestCart.reduce((sum, item) => {
      const price = item.price || (item.product && item.product.price) || 0;
      return sum + (price * (item.quantity || 1));
    }, 0);

    const shipping = subtotal > 1500 ? 0 : 100;
    const total = subtotal + shipping;

    const guestCartData = {
      items: guestCart,
      subtotal,
      couponDiscount: 0,
      couponCode: null,
      total,
      itemCount: guestCart.reduce((sum, item) => sum + (item.quantity || 1), 0)
    };

    this.renderCartView(guestCartData, false, itemsContainer, summaryContainer);
  },

  renderEmptyCart(itemsContainer, summaryContainer) {
    itemsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <h3>Your festive cart is empty</h3>
        <p>Explore our sparkling range of certified Sivakasi fireworks to celebrate with family and friends.</p>
        <a href="/products.html" class="btn btn-primary" style="margin-top:12px;">Browse Fireworks Catalogue</a>
      </div>
    `;
    if (summaryContainer) summaryContainer.style.display = 'none';
    App.updateCartBadge();
  },

  renderCartView(cart, isAccountCart, itemsContainer, summaryContainer) {
    if (summaryContainer) summaryContainer.style.display = 'block';

    itemsContainer.innerHTML = cart.items.map(item => {
      const p = item.product || {};
      const imgUrl = (p.images && p.images.length > 0)
        ? (p.images.find(img => img.isPrimary) || p.images[0]).url
        : 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?auto=format&fit=crop&w=200&q=80';

      const itemId = item._id || item.productId || (p && p._id);
      const unitPrice = item.price || p.price || 0;
      const qty = item.quantity || 1;

      return `
        <div class="cart-item" data-id="${App.escapeHtml(itemId)}">
          <img src="${App.escapeHtml(imgUrl)}" alt="${App.escapeHtml(p.name || 'Firecracker')}" class="cart-item-image" onerror="this.src='https://placehold.co/100x100?text=Firecracker';">
          <div class="cart-item-details">
            <a href="/product-details.html?id=${App.escapeHtml(p._id || itemId)}">
              <h4 class="cart-item-title">${App.escapeHtml(p.name || 'Festive Fireworks')}</h4>
            </a>
            <div class="cart-item-sku">SKU: ${App.escapeHtml(p.sku || 'SIVAKASI')}</div>
            <div class="qty-control" style="margin-top: 8px;">
              <button class="qty-btn" type="button" onclick="Cart.changeQuantity('${App.escapeHtml(itemId)}', ${qty - 1})">-</button>
              <input type="text" class="qty-input" value="${qty}" readonly>
              <button class="qty-btn" type="button" onclick="Cart.changeQuantity('${App.escapeHtml(itemId)}', ${qty + 1})">+</button>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="cart-item-price">${App.formatPrice(unitPrice * qty)}</div>
            <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 6px;">(${App.formatPrice(unitPrice)} each)</div>
            <button class="cart-item-remove" type="button" onclick="Cart.removeItem('${App.escapeHtml(itemId)}')" title="Remove Item">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // Summary calculations
    const subtotal = cart.subtotal || 0;
    const discount = cart.couponDiscount || 0;
    const shipping = subtotal > 1500 ? 0 : (subtotal > 0 ? 100 : 0);
    const total = Math.max(0, subtotal - discount + shipping);

    const subtotalEl = document.getElementById('summary-subtotal');
    const discountEl = document.getElementById('summary-discount');
    const shippingEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');

    if (subtotalEl) subtotalEl.textContent = App.formatPrice(subtotal);
    if (discountEl) discountEl.textContent = discount > 0 ? `-${App.formatPrice(discount)}` : '₹0';
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : App.formatPrice(shipping);
    if (totalEl) totalEl.textContent = App.formatPrice(total);

    // Coupon info
    const couponStatusEl = document.getElementById('coupon-status-box');
    if (couponStatusEl) {
      if (cart.couponCode) {
        couponStatusEl.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding:8px 12px; border-radius:6px; margin-top:8px;">
            <span style="font-size:0.85rem; color:#047857; font-weight:600;">🏷️ ${App.escapeHtml(cart.couponCode)} Applied</span>
            <button onclick="Cart.removeCoupon()" style="background:none; border:none; color:#b91c1c; cursor:pointer; font-size:0.8rem; font-weight:bold;">Remove</button>
          </div>
        `;
      } else {
        couponStatusEl.innerHTML = '';
      }
    }

    App.updateCartBadge();
  },

  proceedToCheckout() {
    if (this.isLoggedIn()) {
      window.location.href = '/checkout.html';
    } else {
      App.showNotification('Please sign in or create an account to finalize your order.', 'info');
      setTimeout(() => {
        window.location.href = '/login.html?redirect=/checkout.html&reason=checkout';
      }, 400);
    }
  },

  async changeQuantity(itemId, newQty) {
    if (this.isLoggedIn()) {
      try {
        await API.put('/cart/update', { itemId, quantity: newQty });
        await this.loadCart();
        return;
      } catch (err) {
        console.warn('API update failed, updating locally:', err);
      }
    }

    // Guest Cart modification
    try {
      let guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      if (newQty <= 0) {
        guestCart = guestCart.filter(i => (i._id !== itemId && i.productId !== itemId && (!i.product || i.product._id !== itemId)));
      } else {
        const item = guestCart.find(i => i._id === itemId || i.productId === itemId || (i.product && i.product._id === itemId));
        if (item) item.quantity = newQty;
      }
      localStorage.setItem('guest_cart', JSON.stringify(guestCart));
      await this.loadCart();
      App.updateCartBadge();
    } catch (e) {
      App.showNotification('Could not update quantity', 'error');
    }
  },

  async removeItem(itemId) {
    if (this.isLoggedIn()) {
      try {
        await API.delete(`/cart/remove/${itemId}`);
        App.showNotification('Item removed from cart', 'info');
        await this.loadCart();
        return;
      } catch (err) {
        console.warn('API remove failed, removing locally:', err);
      }
    }

    // Guest Cart removal
    try {
      let guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      guestCart = guestCart.filter(i => (i._id !== itemId && i.productId !== itemId && (!i.product || i.product._id !== itemId)));
      localStorage.setItem('guest_cart', JSON.stringify(guestCart));
      App.showNotification('Item removed from cart', 'info');
      await this.loadCart();
      App.updateCartBadge();
    } catch (e) {
      App.showNotification('Failed to remove item', 'error');
    }
  },

  setupCouponForm() {
    const form = document.getElementById('coupon-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = document.getElementById('coupon-code-input');
      const code = codeInput ? codeInput.value.trim().toUpperCase() : '';

      if (!code) {
        App.showNotification('Please enter a coupon code', 'warning');
        return;
      }

      if (!this.isLoggedIn()) {
        App.showNotification('Please sign in or create an account to redeem festive coupons at checkout.', 'info');
        return;
      }

      try {
        const res = await API.post('/cart/apply-coupon', { code });
        if (res.success) {
          App.showNotification(`Coupon ${code} applied successfully!`, 'success');
          if (codeInput) codeInput.value = '';
          await this.loadCart();
        }
      } catch (err) {
        App.showNotification(err.message || 'Invalid coupon code', 'error');
      }
    });
  },

  async removeCoupon() {
    if (!this.isLoggedIn()) return;
    try {
      await API.delete('/cart/remove-coupon');
      App.showNotification('Coupon removed', 'info');
      await this.loadCart();
    } catch (err) {
      App.showNotification(err.message || 'Failed to remove coupon', 'error');
    }
  }
};
