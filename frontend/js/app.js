/**
 * Global Application Framework — MotionSites & Taste-Skill Cinematic Edition
 */
const App = {
  currentUser: null,

  async init() {
    this.setupHeaderScroll();
    this.setupMobileMenu();
    this.setupCategoriesDropdown();
    this.setupSearchOverlay();
    this.setupNewsletter();
    Wishlist.init();
    await this.checkAuth();
    await this.updateCartBadge();
  },

  setupHeaderScroll() {
    const wrapper = document.getElementById('site-header-wrapper') || document.querySelector('.header');
    if (!wrapper) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 30) {
        wrapper.classList.add('scrolled');
      } else {
        wrapper.classList.remove('scrolled');
      }
    });
  },

  setupMobileMenu() {
    // Mobile navigation is handled via horizontal scrollable department strip
  },

  setupCategoriesDropdown() {
    const btn = document.getElementById('all-categories-toggle') || document.getElementById('all-cat-btn');
    const menu = document.getElementById('categories-mega-menu') || document.getElementById('all-cat-menu');
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
      });
      document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.remove('active');
        }
      });
    }
  },

  setupSearchOverlay() {
    // Also support any inline search input on page
    const headerSearchInput = document.getElementById('header-search-input');
    if (headerSearchInput) {
      headerSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const q = headerSearchInput.value.trim();
          if (q) window.location.href = `/products.html?search=${encodeURIComponent(q)}`;
        }
      });
    }

    const searchToggle = document.getElementById('search-toggle-btn');
    const overlay = document.getElementById('search-overlay');
    const closeBtn = document.getElementById('search-close-btn');
    const input = document.getElementById('search-overlay-input');

    if (searchToggle && overlay) {
      searchToggle.addEventListener('click', () => {
        overlay.classList.add('active');
        if (input) setTimeout(() => input.focus(), 100);
      });
    }

    if (closeBtn && overlay) {
      closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = input.value.trim();
          if (q) {
            window.location.href = `/products.html?search=${encodeURIComponent(q)}`;
          }
        }
      });
    }
  },

  setupNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        App.showNotification('Thank you for subscribing to our festive dispatch alerts!', 'success');
        form.reset();
      });
    }
  },

  renderUserPill(container, user) {
    const isAdminUser = user.role === 'admin' || user.role === 'superadmin';
    container.innerHTML = `
      <div class="user-dropdown-container">
        <button class="user-pill-btn" id="user-pill-btn" type="button" aria-expanded="false">
          <span>👤</span>
          <span class="font-semibold">${this.escapeHtml((user.name || 'Friend').split(' ')[0])}</span>
          <span style="font-size:0.65rem; color:#64748b;">▼</span>
        </button>
        <div class="user-flyout-menu" id="user-flyout-menu">
          <div class="user-flyout-header">
            <div style="font-weight:700; color:#0f172a; font-size:0.9rem;">${this.escapeHtml(user.name || 'User')}</div>
            <div style="font-size:0.75rem; color:#64748b;">${this.escapeHtml(user.email || '')}</div>
          </div>
          <div class="user-flyout-divider"></div>
          <a href="/profile.html" class="user-flyout-link">My Profile</a>
          <a href="/orders.html" class="user-flyout-link">My Orders</a>
          <a href="/addresses.html" class="user-flyout-link">Saved Addresses</a>
          ${isAdminUser ? '<a href="/admin/dashboard.html" class="user-flyout-link user-admin-link">Admin Dashboard</a>' : ''}
          <div class="user-flyout-divider"></div>
          <button onclick="App.logout()" class="user-flyout-logout">Sign Out</button>
        </div>
      </div>
    `;

    const pillBtn = document.getElementById('user-pill-btn');
    const flyout = document.getElementById('user-flyout-menu');
    if (pillBtn && flyout) {
      pillBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        flyout.classList.toggle('active');
      });
      document.addEventListener('click', (e) => {
        if (!pillBtn.contains(e.target) && !flyout.contains(e.target)) {
          flyout.classList.remove('active');
        }
      });
    }
  },

  renderSignInPill(container) {
    container.innerHTML = `
      <a href="/login.html" class="btn-signin-pill">
        <span>Sign In</span>
      </a>
    `;
  },

  async checkAuth() {
    const userMenu = document.getElementById('user-menu');
    if (!userMenu) return;

    // 1. Immediately read from localStorage for instant, zero-flicker UI
    try {
      const stored = localStorage.getItem('fire_user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        this.renderUserPill(userMenu, this.currentUser);
      } else {
        this.renderSignInPill(userMenu);
      }
    } catch (e) {
      this.renderSignInPill(userMenu);
    }

    // 2. Validate in background with /api/auth/me
    try {
      const res = await API.get('/auth/me');
      if (res.success && res.data) {
        this.currentUser = res.data;
        localStorage.setItem('fire_user', JSON.stringify(res.data));
        this.renderUserPill(userMenu, this.currentUser);
      }
    } catch (err) {
      if (err.status === 403) {
        localStorage.removeItem('fire_user');
        this.currentUser = null;
        this.renderSignInPill(userMenu);
      }
    }
  },

  async updateCartBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    // Count guest cart items first
    let guestCount = 0;
    try {
      const guestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      guestCount = guestCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    } catch (e) {}

    try {
      const res = await API.get('/cart');
      if (res.success && res.data) {
        const count = (res.data.itemCount || 0) + guestCount;
        if (count > 0) {
          badge.textContent = count;
          badge.style.display = 'flex';
          return;
        }
      }
    } catch (err) {}

    if (guestCount > 0) {
      badge.textContent = guestCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  async logout() {
    try {
      await API.post('/auth/logout');
    } catch (err) {}
    localStorage.removeItem('fire_user');
    this.currentUser = null;
    App.showNotification('Logged out successfully', 'info');
    setTimeout(() => {
      window.location.href = '/';
    }, 400);
  },

  showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `notification notification-${type}`;
    toast.innerHTML = `
      <span>${this.escapeHtml(message)}</span>
      <button style="background:none;border:none;cursor:pointer;font-weight:bold;color:#71717a;" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 4500);
  },

  formatPrice(amount) {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  },

  debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  escapeHtml(str) {
    if (!str) return '';
    return str
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

/**
 * Wishlist Manager (MongoDB Cloud Sync + Local Storage Fallback)
 */
const Wishlist = {
  key: 'firecrackers_wishlist_ids',

  async init() {
    this.updateBadge();
    await this.syncWithServer();
  },

  async syncWithServer() {
    try {
      const res = await API.get('/wishlist');
      if (res && res.success && Array.isArray(res.data)) {
        const serverIds = res.data.map(p => p._id);
        const localIds = this.getIds();
        
        // If user has local items, push them to MongoDB
        const unsynced = localIds.filter(id => !serverIds.includes(id));
        if (unsynced.length > 0) {
          await API.post('/wishlist/sync', { productIds: unsynced });
          serverIds.push(...unsynced);
        }

        localStorage.setItem(this.key, JSON.stringify(serverIds));
        this.updateBadge();
      }
    } catch (err) {
      // User is not signed in; continues with local storage
    }
  },

  getIds() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '[]');
    } catch (e) {
      return [];
    }
  },

  has(id) {
    return this.getIds().includes(id);
  },

  async toggle(id, productName = 'Product') {
    let ids = this.getIds();
    let added = false;
    if (ids.includes(id)) {
      ids = ids.filter(i => i !== id);
      App.showNotification(`Removed "${productName}" from your wishlist`, 'info');
    } else {
      ids.push(id);
      added = true;
      App.showNotification(`Added "${productName}" to your wishlist!`, 'success');
    }
    localStorage.setItem(this.key, JSON.stringify(ids));
    this.updateBadge();

    // Persist to MongoDB if signed in
    try {
      await API.post('/wishlist/toggle', { productId: id });
    } catch (err) {
      // User not signed in, persisted locally
    }

    // Update UI elements matching this ID
    document.querySelectorAll(`.btn-wishlist[data-id="${id}"]`).forEach(btn => {
      if (added) {
        btn.classList.add('active');
        btn.innerHTML = '❤️';
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '🤍';
      }
    });

    return added;
  },

  updateBadge() {
    const badge = document.getElementById('wishlist-count');
    if (!badge) return;
    const count = this.getIds().length;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
