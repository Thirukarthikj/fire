/**
 * Centralized API Client using Fetch API
 */
const API = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.headers || {};

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      credentials: 'same-origin',
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/admin/login')) {
          // If on admin page, redirect to admin login, else standard login
          if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/admin/login.html')) {
            window.location.href = '/admin/login.html';
          }
        }
        throw {
          status: response.status,
          message: data.message || `Request failed with status ${response.status}`,
          errors: data.errors
        };
      }

      return data;
    } catch (err) {
      if (err.status) throw err;
      throw {
        status: 0,
        message: 'Network error or server unreachable. Please check your connection.'
      };
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const queryString = query.toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData
    });
  }
};

