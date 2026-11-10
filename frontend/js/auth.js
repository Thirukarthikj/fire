/**
 * Authentication and User Profile Management
 */
const Auth = {
  // ---------------- LOGIN ----------------
  initLogin() {
    const form = document.getElementById('login-form');
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
          App.showNotification('Welcome back!', 'success');
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get('redirect') || '/profile.html';
          setTimeout(() => {
            window.location.href = redirect;
          }, 600);
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
          App.showNotification('Account created successfully!', 'success');
          setTimeout(() => {
            window.location.href = '/profile.html';
          }, 600);
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
  async initProfile() {
    try {
      const res = await API.get('/users/profile');
      if (res.success && res.data) {
        const u = res.data;
        const nameInput = document.getElementById('profile-name');
        const emailInput = document.getElementById('profile-email');
        const phoneInput = document.getElementById('profile-phone');

        if (nameInput) nameInput.value = u.name || '';
        if (emailInput) emailInput.value = u.email || '';
        if (phoneInput) phoneInput.value = u.phone || '';

        const welcomeName = document.getElementById('profile-welcome-name');
        if (welcomeName) welcomeName.textContent = u.name;
      }
    } catch (err) {
      window.location.href = '/login.html?redirect=/profile.html';
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
          if (editId) {
            await API.put(`/addresses/${editId}`, payload);
            App.showNotification('Address updated', 'success');
          } else {
            await API.post('/addresses', payload);
            App.showNotification('Address saved', 'success');
          }
          this.closeAddressModal();
          await this.loadAddresses();
        } catch (err) {
          App.showNotification(err.message || 'Failed to save address', 'error');
        }
      });
    }
  },

  async loadAddresses() {
    const list = document.getElementById('address-list');
    if (!list) return;

    try {
      const res = await API.get('/addresses');
      if (res.success && res.data) {
        if (res.data.length === 0) {
          list.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
              <div class="empty-state-icon">📍</div>
              <h3>No delivery addresses saved</h3>
              <p>Add a shipping address for rapid festive checkout.</p>
            </div>
          `;
          return;
        }

        list.innerHTML = res.data.map(addr => `
          <div class="card" style="padding: var(--space-4); border-color: ${addr.isDefault ? 'var(--color-accent)' : 'var(--color-border)'}">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
              <span class="font-bold">${App.escapeHtml(addr.name)}</span>
              ${addr.isDefault ? '<span class="badge badge-accent">Default</span>' : ''}
            </div>
            <div style="font-size:0.875rem; color:#4b5563; line-height:1.5; margin-bottom:12px;">
              ${App.escapeHtml(addr.addressLine1)}<br>
              ${addr.addressLine2 ? App.escapeHtml(addr.addressLine2) + '<br>' : ''}
              ${App.escapeHtml(addr.city)}, ${App.escapeHtml(addr.state)} - ${App.escapeHtml(addr.pincode)}<br>
              Phone: ${App.escapeHtml(addr.phone)}
            </div>
            <div style="display:flex; gap:8px; border-top:1px solid #f3f4f6; padding-top:8px;">
              ${!addr.isDefault ? `<button onclick="Auth.setDefaultAddress('${addr._id}')" class="btn btn-secondary btn-sm">Set Default</button>` : ''}
              <button onclick="Auth.editAddress('${addr._id}')" class="btn btn-outline btn-sm">Edit</button>
              <button onclick="Auth.deleteAddress('${addr._id}')" class="btn btn-danger btn-sm">Delete</button>
            </div>
          </div>
        `).join('');
      }
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
      const res = await API.get('/addresses');
      const addr = res.data.find(a => a._id === id);
      if (!addr) return;

      this.openAddressModal('Edit Delivery Address');
      document.getElementById('addr-edit-id').value = addr._id;
      document.getElementById('addr-name').value = addr.name;
      document.getElementById('addr-phone').value = addr.phone;
      document.getElementById('addr-line1').value = addr.addressLine1;
      document.getElementById('addr-line2').value = addr.addressLine2 || '';
      document.getElementById('addr-city').value = addr.city;
      document.getElementById('addr-state').value = addr.state;
      document.getElementById('addr-pincode').value = addr.pincode;
      document.getElementById('addr-default').checked = addr.isDefault;
    } catch (err) {
      App.showNotification('Error loading address details', 'error');
    }
  },

  async deleteAddress(id) {
    if (!confirm('Are you sure you want to delete this delivery address?')) return;
    try {
      await API.delete(`/addresses/${id}`);
      App.showNotification('Address removed', 'info');
      await this.loadAddresses();
    } catch (err) {
      App.showNotification(err.message || 'Failed to delete address', 'error');
    }
  },

  async setDefaultAddress(id) {
    try {
      await API.put(`/addresses/${id}/default`);
      App.showNotification('Default address updated', 'success');
      await this.loadAddresses();
    } catch (err) {
      App.showNotification(err.message || 'Failed to update default address', 'error');
    }
  }
};

