/**
 * Shopping Cart Management Module
 */
const Cart = {
  async init() {
    await this.loadCart();
    this.setupCouponForm();
  },

  async loadCart() {
    const itemsContainer = document.getElementById('cart-items-container');
    const summaryContainer = document.getElementById('cart-summary-container');
    if (!itemsContainer) return;

    try {
      const res = await API.get('/cart');
      if (res.success && res.data) {
        const cart = res.data;

        if (!cart.items || cart.items.length === 0) {
          itemsContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Explore our sparkling range of fireworks to add excitement to your festivities.</p>
              <a href="/products.html" class="btn btn-primary">Browse Firecrackers</a>
            </div>
          `;
          if (summaryContainer) summaryContainer.style.display = 'none';
          App.updateCartBadge();
          return;
        }

        if (summaryContainer) summaryContainer.style.display = 'block';

        // Render Cart Items
        itemsContainer.innerHTML = cart.items.map(item => {
          const p = item.product || {};
          const imgUrl = p.images && p.images.length > 0
            ? (p.images.find(img => img.isPrimary) || p.images[0]).url
            : 'https://placehold.co/100x100?text=Firecrackers';

          return `
            <div class="cart-item" data-id="${item._id}">
              <img src="${App.escapeHtml(imgUrl)}" alt="${App.escapeHtml(p.name)}" class="cart-item-image">
              <div class="cart-item-details">
                <a href="/product-details.html?id=${p._id}">
                  <h4 class="cart-item-title">${App.escapeHtml(p.name)}</h4>
                </a>
                <div class="cart-item-sku">SKU: ${App.escapeHtml(p.sku || '')}</div>
                <div class="qty-control" style="margin-top: 8px;">
                  <button class="qty-btn" onclick="Cart.changeQuantity('${item._id}', ${item.quantity - 1})">-</button>
                  <input type="text" class="qty-input" value="${item.quantity}" readonly>
                  <button class="qty-btn" onclick="Cart.changeQuantity('${item._id}', ${item.quantity + 1})">+</button>
                </div>
              </div>
              <div style="text-align: right;">
                <div class="cart-item-price">${App.formatPrice(item.price * item.quantity)}</div>
                <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 6px;">(${App.formatPrice(item.price)} each)</div>
                <button class="cart-item-remove" onclick="Cart.removeItem('${item._id}')" title="Remove Item">🗑️</button>
              </div>
            </div>
          `;
        }).join('');

        // Render Summary
        const subtotal = cart.subtotal || 0;
        const discount = cart.couponDiscount || 0;
        const shipping = subtotal > 1500 ? 0 : 100;
        const total = Math.max(0, subtotal - discount + shipping);

        document.getElementById('summary-subtotal').textContent = App.formatPrice(subtotal);
        document.getElementById('summary-discount').textContent = discount > 0 ? `-${App.formatPrice(discount)}` : '₹0';
        document.getElementById('summary-shipping').textContent = shipping === 0 ? 'FREE' : App.formatPrice(shipping);
        document.getElementById('summary-total').textContent = App.formatPrice(total);

        // Coupon applied info
        const couponStatusEl = document.getElementById('coupon-status-box');
        if (couponStatusEl) {
          if (cart.couponCode) {
            couponStatusEl.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding:8px 12px; border-radius:6px; margin-top:8px;">
                <span style="font-size:0.85rem; color:#34d399; font-weight:600;">🏷️ ${cart.couponCode} Applied</span>
                <button onclick="Cart.removeCoupon()" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:0.8rem; font-weight:bold;">Remove</button>
              </div>
            `;
          } else {
            couponStatusEl.innerHTML = '';
          }
        }

        App.updateCartBadge();
      }
    } catch (err) {
      if (err.status === 401) {
        itemsContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔐</div>
            <h3>Please log in</h3>
            <p>You need to be logged in to view your shopping cart.</p>
            <a href="/login.html" class="btn btn-primary">Sign In</a>
          </div>
        `;
        if (summaryContainer) summaryContainer.style.display = 'none';
      }
    }
  },

  async changeQuantity(itemId, newQty) {
    try {
      await API.put('/cart/update', { itemId, quantity: newQty });
      await this.loadCart();
    } catch (err) {
      App.showNotification(err.message || 'Could not update quantity', 'error');
    }
  },

  async removeItem(itemId) {
    try {
      await API.delete(`/cart/remove/${itemId}`);
      App.showNotification('Item removed from cart', 'info');
      await this.loadCart();
    } catch (err) {
      App.showNotification(err.message || 'Failed to remove item', 'error');
    }
  },

  setupCouponForm() {
    const form = document.getElementById('coupon-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codeInput = document.getElementById('coupon-code-input');
      const code = codeInput ? codeInput.value.trim() : '';

      if (!code) {
        App.showNotification('Please enter a coupon code', 'warning');
        return;
      }

      try {
        const res = await API.post('/cart/apply-coupon', { code });
        if (res.success) {
          App.showNotification(`Coupon ${code.toUpperCase()} applied successfully!`, 'success');
          if (codeInput) codeInput.value = '';
          await this.loadCart();
        }
      } catch (err) {
        App.showNotification(err.message || 'Invalid coupon code', 'error');
      }
    });
  },

  async removeCoupon() {
    try {
      await API.delete('/cart/remove-coupon');
      App.showNotification('Coupon removed', 'info');
      await this.loadCart();
    } catch (err) {
      App.showNotification(err.message || 'Failed to remove coupon', 'error');
    }
  }
};

