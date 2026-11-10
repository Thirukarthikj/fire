/**
 * Product Catalogue & Detail Interactions
 */
const Products = {
  currentFilters: {
    page: 1,
    limit: 12,
    category: '',
    brand: '',
    search: '',
    sort: 'newest',
    minPrice: '',
    maxPrice: '',
    inStock: ''
  },

  // ---------------- CATALOGUE VIEW ----------------
  async initCatalogue() {
    this.parseUrlParams();
    await Promise.all([this.loadCategories(), this.loadBrands()]);
    this.setupFilterListeners();
    await this.fetchProducts();
  },

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) this.currentFilters.category = params.get('category');
    if (params.get('brand')) this.currentFilters.brand = params.get('brand');
    if (params.get('search')) this.currentFilters.search = params.get('search');
    if (params.get('sort')) this.currentFilters.sort = params.get('sort');
    if (params.get('page')) this.currentFilters.page = parseInt(params.get('page'), 10) || 1;

    const searchInput = document.getElementById('search-input');
    if (searchInput && this.currentFilters.search) {
      searchInput.value = this.currentFilters.search;
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect && this.currentFilters.sort) {
      sortSelect.value = this.currentFilters.sort;
    }
  },

  async loadCategories() {
    const container = document.getElementById('category-filter-list');
    if (!container) return;

    try {
      const res = await API.get('/categories');
      if (res.success && res.data) {
        let html = `
          <label class="filter-item">
            <input type="radio" name="catFilter" value="" ${!this.currentFilters.category ? 'checked' : ''}>
            <span>All Categories</span>
          </label>
        `;
        res.data.forEach(cat => {
          const isChecked = this.currentFilters.category === cat.slug || this.currentFilters.category === cat._id;
          html += `
            <label class="filter-item">
              <input type="radio" name="catFilter" value="${cat.slug}" ${isChecked ? 'checked' : ''}>
              <span>${App.escapeHtml(cat.name)} (${cat.productCount || 0})</span>
            </label>
          `;
        });
        container.innerHTML = html;
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  },

  async loadBrands() {
    const container = document.getElementById('brand-filter-list');
    if (!container) return;

    const brands = [
      'Standard Fireworks',
      'Anil Celebrations',
      'Ayyan Fireworks',
      'Vanitha Fireworks',
      'Sony Fireworks',
      'Sri Krishna Fireworks'
    ];

    let html = `
      <label class="filter-item">
        <input type="radio" name="brandFilter" value="" ${!this.currentFilters.brand ? 'checked' : ''}>
        <span>All Brands</span>
      </label>
    `;
    brands.forEach(b => {
      const isChecked = this.currentFilters.brand.toLowerCase() === b.toLowerCase();
      html += `
        <label class="filter-item">
          <input type="radio" name="brandFilter" value="${b}" ${isChecked ? 'checked' : ''}>
          <span>${App.escapeHtml(b)}</span>
        </label>
      `;
    });
    container.innerHTML = html;
  },

  setupFilterListeners() {
    const categoryContainer = document.getElementById('category-filter-list');
    if (categoryContainer) {
      categoryContainer.addEventListener('change', (e) => {
        if (e.target.name === 'catFilter') {
          this.currentFilters.category = e.target.value;
          this.currentFilters.page = 1;
          this.fetchProducts();
        }
      });
    }

    const brandContainer = document.getElementById('brand-filter-list');
    if (brandContainer) {
      brandContainer.addEventListener('change', (e) => {
        if (e.target.name === 'brandFilter') {
          this.currentFilters.brand = e.target.value;
          this.currentFilters.page = 1;
          this.fetchProducts();
        }
      });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentFilters.sort = e.target.value;
        this.currentFilters.page = 1;
        this.fetchProducts();
      });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', App.debounce((e) => {
        this.currentFilters.search = e.target.value.trim();
        this.currentFilters.page = 1;
        this.fetchProducts();
      }, 400));
    }

    const priceForm = document.getElementById('price-filter-form');
    if (priceForm) {
      priceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const min = document.getElementById('price-min').value;
        const max = document.getElementById('price-max').value;
        this.currentFilters.minPrice = min;
        this.currentFilters.maxPrice = max;
        this.currentFilters.page = 1;
        this.fetchProducts();
      });
    }

    const inStockOnly = document.getElementById('instock-filter');
    if (inStockOnly) {
      inStockOnly.addEventListener('change', (e) => {
        this.currentFilters.inStock = e.target.checked ? 'true' : '';
        this.currentFilters.page = 1;
        this.fetchProducts();
      });
    }
  },

  async fetchProducts() {
    const grid = document.getElementById('product-grid');
    const paginationContainer = document.getElementById('pagination');
    if (!grid) return;

    // Show skeletons
    grid.innerHTML = Array(6).fill(`
      <div class="product-card skeleton-card">
        <div class="skeleton skeleton-image"></div>
        <div style="padding: 1rem;">
          <div class="skeleton skeleton-text" style="width: 40%;"></div>
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width: 50%;"></div>
        </div>
      </div>
    `).join('');

    try {
      const res = await API.get('/products', this.currentFilters);
      if (res.success) {
        if (res.data.length === 0) {
          grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
              <div class="empty-state-icon">🎆</div>
              <h3>No fireworks match your selection</h3>
              <p>Try adjusting your category, price range, or search keywords.</p>
              <button onclick="Products.resetFilters()" class="btn btn-outline">Clear All Filters</button>
            </div>
          `;
          if (paginationContainer) paginationContainer.innerHTML = '';
          return;
        }

        grid.innerHTML = res.data.map(product => this.renderProductCard(product)).join('');

        if (paginationContainer && res.pagination) {
          this.renderPagination(paginationContainer, res.pagination);
        }
      }
    } catch (err) {
      grid.innerHTML = `<p class="text-error" style="grid-column: 1 / -1;">Failed to load products: ${err.message}</p>`;
    }
  },

  renderProductCard(p) {
    const FALLBACK_PLACEHOLDER = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='380' viewBox='0 0 500 380'%3E%3Crect width='500' height='380' fill='%23f8fafc'/%3E%3Ccircle cx='250' cy='150' r='54' fill='%23fee2e2'/%3E%3Ctext x='250' y='165' font-size='42' text-anchor='middle'%3E🎆%3C/text%3E%3Ctext x='250' y='245' font-family='sans-serif' font-size='16' font-weight='bold' fill='%230f172a' text-anchor='middle'%3ESivakasi Festive Fireworks%3C/text%3E%3Ctext x='250' y='272' font-family='sans-serif' font-size='12' fill='%2316a34a' font-weight='600' text-anchor='middle'%3E🌱 100% CSIR-NEERI Green Certified%3C/text%3E%3C/svg%3E";

    const primaryImg = p.images && p.images.length > 0
      ? (p.images.find(img => img.isPrimary) || p.images[0]).url
      : FALLBACK_PLACEHOLDER;

    const hasCompare = p.comparePrice && p.comparePrice > p.price;
    const discountPercent = hasCompare
      ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
      : (p.discount || 0);

    const discountBadge = discountPercent > 0
      ? `<span class="product-badge-discount">-${discountPercent}%</span>`
      : '';

    const comparePriceTag = hasCompare
      ? `<span class="product-compare-price">MRP ${App.formatPrice(p.comparePrice)}</span>`
      : '';

    const savingsPill = hasCompare
      ? `<span class="product-savings-pill">Save ${discountPercent}%</span>`
      : '';

    const isWishlisted = typeof Wishlist !== 'undefined' && Wishlist.has(p._id);
    const brandName = p.brand || 'Sivakasi Mastercraft';

    return `
      <div class="product-card">
        ${discountBadge}
        <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" 
                data-id="${p._id}" 
                onclick="event.preventDefault(); event.stopPropagation(); Wishlist.toggle('${p._id}', '${App.escapeHtml(p.name)}');" 
                title="Save to Wishlist" 
                aria-label="Wishlist">
          ${isWishlisted ? '❤️' : '🤍'}
        </button>
        <a href="/product-details.html?id=${p._id}" class="product-image-wrap">
          <img src="${App.escapeHtml(primaryImg)}" alt="${App.escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_PLACEHOLDER}';">
        </a>
        <div class="product-card-body">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="product-category">${App.escapeHtml(p.category ? p.category.name : 'Firecrackers')}</span>
            <span class="product-brand-tag">${App.escapeHtml(brandName)}</span>
          </div>
          <a href="/product-details.html?id=${p._id}">
            <h3 class="product-title" title="${App.escapeHtml(p.name)}">${App.escapeHtml(p.name)}</h3>
          </a>
          <div class="product-price-box">
            <span class="product-price">${App.formatPrice(p.price)}</span>
            ${comparePriceTag}
            ${savingsPill}
          </div>
          <button onclick="Products.addToCart('${p._id}', 1)" class="btn btn-primary btn-sm btn-block" ${p.stock <= 0 ? 'disabled' : ''}>
            ${p.stock > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    `;
  },

  renderPagination(container, pagination) {
    if (pagination.pages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `
      <button class="page-btn" ${pagination.page <= 1 ? 'disabled' : ''} onclick="Products.goToPage(${pagination.page - 1})">
        ← Prev
      </button>
    `;

    for (let i = 1; i <= pagination.pages; i++) {
      html += `
        <button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="Products.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    html += `
      <button class="page-btn" ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="Products.goToPage(${pagination.page + 1})">
        Next →
      </button>
    `;

    container.innerHTML = html;
  },

  goToPage(p) {
    this.currentFilters.page = p;
    this.fetchProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  resetFilters() {
    this.currentFilters = {
      page: 1,
      limit: 12,
      category: '',
      search: '',
      sort: 'newest',
      minPrice: '',
      maxPrice: '',
      inStock: ''
    };
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const brandContainer = document.getElementById('brand-filter-list');
    if (brandContainer) {
      brandContainer.addEventListener('change', (e) => {
        if (e.target.name === 'brandFilter') {
          this.currentFilters.brand = e.target.value;
          this.currentFilters.page = 1;
          this.fetchProducts();
        }
      });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'newest';
    const minInput = document.getElementById('price-min');
    if (minInput) minInput.value = '';
    const maxInput = document.getElementById('price-max');
    if (maxInput) maxInput.value = '';
    this.loadCategories();
    this.fetchProducts();
  },

  // ---------------- DETAIL VIEW ----------------
  async initDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      window.location.href = '/products.html';
      return;
    }

    try {
      const res = await API.get(`/products/${id}`);
      if (!res.success || !res.data) {
        throw new Error('Product not found');
      }

      const p = res.data;
      this.renderProductDetail(p);
      await this.loadRelatedProducts(p._id);
    } catch (err) {
      const main = document.querySelector('main');
      if (main) {
        main.innerHTML = `
          <div class="container section">
            <div class="empty-state">
              <div class="empty-state-icon">⚠️</div>
              <h3>Product Not Found</h3>
              <p>The firecracker you requested does not exist or has been discontinued.</p>
              <a href="/products.html" class="btn btn-primary">Return to Catalogue</a>
            </div>
          </div>
        `;
      }
    }
  },

  currentProduct: null,

  renderProductDetail(p) {
    this.currentProduct = p;
    document.title = `${p.name} — Firecrackers Store`;

    // Breadcrumbs
    const breadcrumbCat = document.getElementById('breadcrumb-cat');
    if (breadcrumbCat && p.category) {
      breadcrumbCat.textContent = p.category.name;
      breadcrumbCat.href = `/products.html?category=${p.category.slug}`;
    }
    const breadcrumbTitle = document.getElementById('breadcrumb-title');
    if (breadcrumbTitle) breadcrumbTitle.textContent = p.name;

    // Gallery
    const mainImg = document.getElementById('main-image');
    const thumbRow = document.getElementById('thumbnail-row');
    const images = p.images && p.images.length > 0
      ? p.images
      : [{ url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&auto=format&fit=crop&q=80', isPrimary: true }];

    if (mainImg) {
      mainImg.src = images[0].url;
      mainImg.alt = p.name;
    }

    if (thumbRow && images.length > 1) {
      thumbRow.innerHTML = images.map((img, idx) => `
        <div class="thumbnail-item ${idx === 0 ? 'active' : ''}" onclick="Products.switchImage('${img.url}', this)">
          <img src="${img.url}" alt="${p.name}">
        </div>
      `).join('');
    }

    // Detail text
    document.getElementById('detail-sku').textContent = `SKU: ${p.sku}`;
    const brandEl = document.getElementById('detail-brand');
    if (brandEl) brandEl.textContent = p.brand || 'Sivakasi Mastercraft';

    document.getElementById('detail-title').textContent = p.name;
    document.getElementById('detail-category').textContent = p.category ? p.category.name : '';

    const hasCompare = p.comparePrice && p.comparePrice > p.price;
    const discountPercent = hasCompare
      ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
      : (p.discount || 0);

    document.getElementById('detail-price').textContent = App.formatPrice(p.price);

    const compEl = document.getElementById('detail-compare-price');
    if (compEl) {
      if (hasCompare) {
        compEl.textContent = `MRP ${App.formatPrice(p.comparePrice)}`;
        compEl.style.display = 'inline';
      } else {
        compEl.style.display = 'none';
      }
    }

    const discBadge = document.getElementById('detail-discount-badge');
    if (discBadge) {
      if (discountPercent > 0) {
        discBadge.textContent = `${discountPercent}% OFF FACTORY RATE`;
        discBadge.style.display = 'inline-block';
      } else {
        discBadge.style.display = 'none';
      }
    }

    // Wishlist detail button initial state
    const wishlistBtn = document.getElementById('btn-detail-wishlist');
    if (wishlistBtn && typeof Wishlist !== 'undefined') {
      const isSaved = Wishlist.has(p._id);
      wishlistBtn.innerHTML = isSaved ? '❤️ In Wishlist' : '🤍 Add to Wishlist';
      if (isSaved) wishlistBtn.classList.add('active');
    }

    document.getElementById('detail-description').textContent = p.description;

    // Stock state
    const stockEl = document.getElementById('detail-stock-status');
    const addBtn = document.getElementById('btn-add-to-cart');
    if (stockEl) {
      if (p.stock > 10) {
        stockEl.innerHTML = `<span class="badge badge-success">In Stock (${p.stock} units available)</span>`;
      } else if (p.stock > 0) {
        stockEl.innerHTML = `<span class="badge badge-warning">Low Stock: Only ${p.stock} units left!</span>`;
      } else {
        stockEl.innerHTML = `<span class="badge badge-error">Out of Stock</span>`;
        if (addBtn) addBtn.disabled = true;
      }
    }

    // Safety info
    const safetyBox = document.getElementById('detail-safety');
    if (safetyBox && p.safetyInfo) {
      safetyBox.innerHTML = `
        <div class="safety-alert-box">
          <h4>⚠️ Mandatory Safety Advisory</h4>
          <p>${App.escapeHtml(p.safetyInfo)}</p>
        </div>
      `;
    }

    // Specifications
    const specsTable = document.getElementById('specs-table-body');
    if (specsTable && p.specifications && p.specifications.length > 0) {
      specsTable.innerHTML = p.specifications.map(s => `
        <tr>
          <td>${App.escapeHtml(s.key)}</td>
          <td>${App.escapeHtml(s.value)}</td>
        </tr>
      `).join('');
    }

    // Action button
    if (addBtn) {
      addBtn.onclick = () => {
        const qty = parseInt(document.getElementById('detail-qty').value, 10) || 1;
        Products.addToCart(p._id, qty);
      };
    }
  },

  switchImage(url, thumbElement) {
    const mainImg = document.getElementById('main-image');
    if (mainImg) mainImg.src = url;
    document.querySelectorAll('.thumbnail-item').forEach(el => el.classList.remove('active'));
    if (thumbElement) thumbElement.classList.add('active');
  },

  adjustDetailQty(delta) {
    const input = document.getElementById('detail-qty');
    if (!input) return;
    let val = parseInt(input.value, 10) || 1;
    val = Math.max(1, val + delta);
    input.value = val;
  },

  toggleDetailWishlist() {
    if (!this.currentProduct) return;
    const isAdded = Wishlist.toggle(this.currentProduct._id, this.currentProduct.name);
    const btn = document.getElementById('btn-detail-wishlist');
    if (btn) {
      btn.innerHTML = isAdded ? '❤️ In Wishlist' : '🤍 Add to Wishlist';
      btn.classList.toggle('active', isAdded);
    }
  },

  async loadRelatedProducts(productId) {
    const container = document.getElementById('related-products-grid');
    if (!container) return;

    try {
      const res = await API.get(`/products/${productId}/related`);
      if (res.success && res.data && res.data.length > 0) {
        container.innerHTML = res.data.map(p => this.renderProductCard(p)).join('');
      } else {
        const section = document.getElementById('related-section');
        if (section) section.style.display = 'none';
      }
    } catch (err) {
      console.warn('Failed to load related products');
    }
  },

  // ---------------- GLOBAL CART ADD ----------------
  async addToCart(productId, quantity = 1) {
    try {
      const res = await API.post('/cart/add', { productId, quantity });
      if (res.success) {
        App.showNotification('Product added to your cart!', 'success');
        App.updateCartBadge();
      }
    } catch (err) {
      if (err.status === 401) {
        App.showNotification('Please log in to add fireworks to your cart.', 'warning');
        setTimeout(() => {
          window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
        }, 800);
      } else {
        App.showNotification(err.message || 'Could not add to cart', 'error');
      }
    }
  }
};

