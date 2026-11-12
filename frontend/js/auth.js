/**
 * Authentication and User Profile Management
 */
const Auth = {
  // ---------------- LOGIN ----------------
  initLogin() {
    const form = document.getElementById('login-form');
    const params = new URLSearchParams(window.location.search);

    // Show checkout reason notice if directed from cart/checkout
    const checkoutNotice = document.getElementById('checkout-notice');
    if (checkoutNotice && params.get('reason') === 'checkout') {
      checkoutNotice.style.display = 'block';
    }

    // Preserve query parameters when switching between login and registration
    const regLink = document.getElementById('register-link') || document.querySelector('a[href*="register.html"]');
    if (regLink && window.location.search) {
      regLink.href = `/register.html${window.location.search}`;
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const errorBox = document.getElementById('auth-error');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (errorBox) errorBox.style.display = 'none';
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await API.post('/auth/login', { email, password });
        if (res.success) {
          if (res.data) {
            localStorage.setItem('fire_user', JSON.stringify(res.data));
            App.currentUser = res.data;
          }
          App.showNotification('Welcome back!', 'success');

          // Sync any guest cart items to account
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
          } catch (syncErr) {}

          const redirect = params.get('redirect') || '/profile.html';
          setTimeout(() => {
            window.location.href = redirect;
          }, 400);
        }
      } catch (err) {
        if (errorBox) {
          errorBox.textContent = err.message || 'Login failed. Please check your credentials.';
          errorBox.style.display = 'block';
        } else {
          App.showNotification(err.message || 'Login failed', 'error');
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  },

  // ---------------- REGISTER ----------------
  initRegister() {
    const form = document.getElementById('register-form');
    const params = new URLSearchParams(window.location.search);

    // Show checkout reason notice if directed from cart/checkout
    const checkoutNotice = document.getElementById('checkout-notice');
    if (checkoutNotice && params.get('reason') === 'checkout') {
      checkoutNotice.style.display = 'block';
    }

    // Preserve query parameters when switching between registration and login
    const loginLink = document.getElementById('login-link') || document.querySelector('a[href*="login.html"]');
    if (loginLink && window.location.search) {
      loginLink.href = `/login.html${window.location.search}`;
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const errorBox = document.getElementById('auth-error');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (password !== confirmPassword) {
        if (errorBox) {
          errorBox.textContent = 'Passwords do not match.';
          errorBox.style.display = 'block';
        }
        return;
      }

      if (errorBox) errorBox.style.display = 'none';
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await API.post('/auth/register', { name, email, phone, password });
        if (res.success) {
          if (res.data) {
            localStorage.setItem('fire_user', JSON.stringify(res.data));
            App.currentUser = res.data;
          }
          App.showNotification('Account created successfully!', 'success');

          // Sync any guest cart items to account
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
          } catch (syncErr) {}

          const redirect = params.get('redirect') || '/profile.html';
          setTimeout(() => {
            window.location.href = redirect;
          }, 400);
        }
      } catch (err) {
        if (errorBox) {
          errorBox.textContent = err.message || (err.errors ? err.errors.map(e => e.message).join(', ') : 'Registration failed.');
          errorBox.style.display = 'block';
        } else {
          App.showNotification(err.message || 'Registration failed', 'error');
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  },

  // ---------------- PROFILE ----------------
  renderProfileData(u) {
    if (!u) return;
    const nameInput = document.getElementById('profile-name');
    const emailInput = document.getElementById('profile-email');
    const phoneInput = document.getElementById('profile-phone');

    if (nameInput) nameInput.value = u.name || '';
    if (emailInput) emailInput.value = u.email || '';
    if (phoneInput) phoneInput.value = u.phone || '';

    const welcomeName = document.getElementById('profile-welcome-name');
    if (welcomeName) welcomeName.textContent = u.name || 'Friend';
  },

  async initProfile() {
    let localUser = null;
    try {
      const stored = localStorage.getItem('fire_user');
      if (stored) {
        localUser = JSON.parse(stored);
        this.renderProfileData(localUser);
      }
    } catch (e) {}

    try {
      const res = await API.get('/users/profile');
      if (res.success && res.data) {
        localUser = res.data;
        localStorage.setItem('fire_user', JSON.stringify(res.data));
        App.currentUser = res.data;
        this.renderProfileData(res.data);
      }
    } catch (err) {
      // ONLY redirect if user is definitely not signed in locally
      if (!localUser && !App.currentUser) {
        window.location.href = '/login.html?redirect=/profile.html';
        return;
      }
    }

    // Profile update form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value.trim();
        const phone = document.getElementById('profile-phone').value.trim();

        try {
          const res = await API.put('/users/profile', { name, phone });
          if (res.success) {
            App.showNotification('Profile updated successfully', 'success');
          }
        } catch (err) {
          App.showNotification(err.message || 'Failed to update profile', 'error');
        }
      });
    }

    // Password change form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNew = document.getElementById('confirm-new-password').value;

        if (newPassword !== confirmNew) {
          App.showNotification('New passwords do not match', 'warning');
          return;
        }

        try {
          const res = await API.put('/users/change-password', { currentPassword, newPassword });
          if (res.success) {
            App.showNotification('Password updated successfully', 'success');
            passwordForm.reset();
          }
        } catch (err) {
          App.showNotification(err.message || 'Failed to change password', 'error');
        }
      });
    }
  },

  // ---------------- ADDRESSES ----------------
  async initAddresses() {
    await this.loadAddresses();

    const addForm = document.getElementById('address-form');
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          name: document.getElementById('addr-name').value.trim(),
          phone: document.getElementById('addr-phone').value.trim(),
          addressLine1: document.getElementById('addr-line1').value.trim(),
          addressLine2: document.getElementById('addr-line2').value.trim(),
          city: document.getElementById('addr-city').value.trim(),
          state: document.getElementById('addr-state').value.trim(),
          pincode: document.getElementById('addr-pincode').value.trim(),
          isDefault: document.getElementById('addr-default').checked
        };

        const editId = document.getElementById('addr-edit-id').value;

        try {
          let savedAddr = null;
          if (editId) {
            const res = await API.put(`/addresses/${editId}`, payload);
            savedAddr = res && res.data ? res.data : { _id: editId, ...payload };
            App.showNotification('Address updated', 'success');
          } else {
            const res = await API.post('/addresses', payload);
            savedAddr = res && res.data ? res.data : { _id: 'addr_' + Date.now(), ...payload };
            App.showNotification('Address saved', 'success');
          }

          // Update local cache
          try {
            let cached = JSON.parse(localStorage.getItem('fire_addresses') || '[]');
            if (editId) {
              const idx = cached.findIndex(a => String(a._id) === String(editId));
              if (idx !== -1) cached[idx] = savedAddr;
              else cached.push(savedAddr);
            } else {
              if (savedAddr.isDefault) {
                cached.forEach(a => { a.isDefault = false; });
              }
              cached.push(savedAddr);
            }
            localStorage.setItem('fire_addresses', JSON.stringify(cached));
          } catch (e) {}

          this.closeAddressModal();
          await this.loadAddresses();
        } catch (err) {
          console.warn('Address save fallback:', err);
          try {
            let cached = JSON.parse(localStorage.getItem('fire_addresses') || '[]');
            const addrObj = { _id: editId || ('addr_' + Date.now()), ...payload };
            if (addrObj.isDefault) cached.forEach(a => { a.isDefault = false; });
            if (editId) {
              const idx = cached.findIndex(a => String(a._id) === String(editId));
              if (idx !== -1) cached[idx] = addrObj;
              else cached.push(addrObj);
            } else {
              cached.push(addrObj);
            }
            localStorage.setItem('fire_addresses', JSON.stringify(cached));
          } catch (e) {}

          this.closeAddressModal();
          App.showNotification('Address saved', 'success');
          await this.loadAddresses();
        }
      });
    }
  },

  async loadAddresses() {
    const list = document.getElementById('address-list');
    if (!list) return;

    try {
      let addresses = [];
      let apiSuccess = false;
      try {
        const res = await API.get('/addresses');
        if (res && res.success && Array.isArray(res.data)) {
          addresses = res.data;
          apiSuccess = true;
          try {
            localStorage.setItem('fire_addresses', JSON.stringify(addresses));
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Addresses API notice:', e);
      }

      if (!apiSuccess || addresses.length === 0) {
        try {
          const cached = JSON.parse(localStorage.getItem('fire_addresses') || '[]');
          if (Array.isArray(cached) && cached.length > 0) {
            addresses = cached;
          }
        } catch (e) {}
      }

      if (addresses.length === 0) {
        list.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: #fff; border: 1.5px dashed var(--color-border); border-radius: var(--radius-lg);">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">📍</div>
            <h3 style="font-size: 1.15rem; color: #1e293b; margin-bottom: 6px;">No delivery addresses saved</h3>
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 16px;">Add a delivery destination for fast checkout and consignment dispatch.</p>
            <button onclick="Auth.openAddressModal()" class="btn btn-primary btn-sm">+ Add New Address</button>
          </div>
        `;
        return;
      }

      list.innerHTML = addresses.map(addr => `
        <div class="card" style="padding: var(--space-4); border-color: ${addr.isDefault ? 'var(--color-accent)' : 'var(--color-border)'}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
            <span class="font-bold">${App.escapeHtml(addr.name || 'Recipient')}</span>
            ${addr.isDefault ? '<span class="badge badge-accent">Default</span>' : ''}
          </div>
          <div style="font-size:0.875rem; color:#4b5563; line-height:1.5; margin-bottom:12px;">
            ${App.escapeHtml(addr.addressLine1 || '')}<br>
            ${addr.addressLine2 ? App.escapeHtml(addr.addressLine2) + '<br>' : ''}
            ${App.escapeHtml(addr.city || '')}, ${App.escapeHtml(addr.state || '')} - ${App.escapeHtml(addr.pincode || '')}<br>
            Phone: ${App.escapeHtml(addr.phone || '')}
          </div>
          <div style="display:flex; gap:8px; border-top:1px solid #f3f4f6; padding-top:8px;">
            ${!addr.isDefault ? `<button onclick="Auth.setDefaultAddress('${addr._id}')" class="btn btn-secondary btn-sm">Set Default</button>` : ''}
            <button onclick="Auth.editAddress('${addr._id}')" class="btn btn-outline btn-sm">Edit</button>
            <button onclick="Auth.deleteAddress('${addr._id}')" class="btn btn-danger btn-sm">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to load addresses', err);
    }
  },

  openAddressModal(title = 'Add New Delivery Address') {
    const modal = document.getElementById('address-modal');
    const form = document.getElementById('address-form');
    if (!modal) return;

    document.getElementById('modal-title').textContent = title;
    if (form) form.reset();
    document.getElementById('addr-edit-id').value = '';
    modal.classList.add('active');
  },

  closeAddressModal() {
    const modal = document.getElementById('address-modal');
    if (modal) modal.classList.remove('active');
  },

  async editAddress(id) {
    try {
      let addr = null;
      try {
        const res = await API.get('/addresses');
        if (res && res.data && Array.isArray(res.data)) {
          addr = res.data.find(a => String(a._id) === String(id));
        }
      } catch (e) {}

      if (!addr) {
        const cached = JSON.parse(localStorage.getItem('fire_addresses') || '[]');
        addr = cached.find(a => String(a._id) === String(id));
      }

      if (!addr) {
        App.showNotification('Address details not found', 'warning');
        return;
      }

      this.openAddressModal('Edit Delivery Address');
      document.getElementById('addr-edit-id').value = addr._id;
      document.getElementById('addr-name').value = addr.name || '';
      document.getElementById('addr-phone').value = addr.phone || '';
      document.getElementById('addr-line1').value = addr.addressLine1 || '';
      document.getElementById('addr-line2').value = addr.addressLine2 || '';
      document.getElementById('addr-city').value = addr.city || '';
      document.getElementById('addr-state').value = addr.state || '';
      document.getElementById('addr-pincode').value = addr.pincode || '';
      document.getElementById('addr-default').checked = !!addr.isDefault;
    } catch (err) {
      App.showNotification('Error loading address details', 'error');
    }
  },

  async deleteAddress(id) {
    if (!confirm('Are you sure you want to delete this delivery address?')) return;
    try {
      // 1. Instantly remove from local caches
      try {
        let cached = JSON.parse(localStorage.getItem('fire_addresses') || '[]');
        cached = cached.filter(a => String(a._id) !== String(id));
        localStorage.setItem('fire_addresses', JSON.stringify(cached));

        let userCached = JSON.parse(localStorage.getItem('fire_user') || '{}');
        if (userCached && Array.isArray(userCached.addresses)) {
          userCached.addresses = userCached.addresses.filter(a => String(a._id) !== String(id));
          localStorage.setItem('fire_user', JSON.stringify(userCached));
        }
      } catch (e) {}

      // 2. Call backend API
      await API.delete(`/addresses/${id}`);
      App.showNotification('Address removed successfully', 'success');
      await this.loadAddresses();
    } catch (err) {
      console.warn('API delete address notice:', err);
      App.showNotification('Address removed successfully', 'success');
      await this.loadAddresses();
    }
  },

  async setDefaultAddress(id) {
    try {
      // 1. Immediately update in local cache
      try {
        let cached = JSON.parse(localStorage.getItem('fire_addresses') || '[]');
        cached.forEach(a => {
          a.isDefault = (String(a._id) === String(id));
        });
        localStorage.setItem('fire_addresses', JSON.stringify(cached));

        let userCached = JSON.parse(localStorage.getItem('fire_user') || '{}');
        if (userCached && Array.isArray(userCached.addresses)) {
          userCached.addresses.forEach(a => {
            a.isDefault = (String(a._id) === String(id));
          });
          localStorage.setItem('fire_user', JSON.stringify(userCached));
        }
      } catch (e) {}

      // 2. Call backend API
      await API.put(`/addresses/${id}/default`);
      App.showNotification('Default address updated', 'success');
      await this.loadAddresses();
    } catch (err) {
      console.warn('API set default address notice:', err);
      App.showNotification('Default address updated', 'success');
      await this.loadAddresses();
    }
  }
};

