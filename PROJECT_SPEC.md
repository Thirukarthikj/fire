# Firecrackers E-Commerce Platform — Technical Specification

## Project Root

`d:\Company\projects\Fire`

## Technology Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript (NO React/Angular/Vue/TypeScript)
- Backend: Node.js + Express.js
- Database: MongoDB + Mongoose
- Payment: Razorpay
- Auth: express-session + connect-mongo
- File Upload: multer

## NPM Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.6.3",
    "express-session": "^1.17.3",
    "connect-mongo": "^5.1.0",
    "bcryptjs": "^2.4.3",
    "razorpay": "^2.9.2",
    "multer": "^1.4.5-lts.1",
    "express-rate-limit": "^7.1.4",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "crypto": "builtin",
    "csurf": "^1.11.0",
    "express-validator": "^7.0.1",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## Environment Variables (.env.example)

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/firecrackers_ecommerce
SESSION_SECRET=your-session-secret-change-in-production
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
SITE_URL=http://localhost:5000
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

## Folder Structure

```
Fire/
├── frontend/
│   ├── index.html
│   ├── products.html
│   ├── product-details.html
│   ├── cart.html
│   ├── checkout.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── addresses.html
│   ├── orders.html
│   ├── order-details.html
│   ├── contact.html
│   ├── about.html
│   ├── faq.html
│   ├── admin/
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── products.html
│   │   ├── categories.html
│   │   ├── inventory.html
│   │   ├── orders.html
│   │   ├── customers.html
│   │   ├── payments.html
│   │   ├── coupons.html
│   │   ├── support.html
│   │   ├── content.html
│   │   ├── reports.html
│   │   ├── administrators.html
│   │   └── settings.html
│   ├── css/
│   │   ├── style.css       (main design system + components)
│   │   ├── responsive.css   (media queries)
│   │   ├── product.css      (product pages)
│   │   ├── checkout.css     (cart + checkout)
│   │   └── admin.css        (admin dashboard)
│   └── js/
│       ├── app.js           (shared utilities, nav, notifications)
│       ├── api.js           (API client wrapper)
│       ├── products.js      (product listing + details)
│       ├── cart.js          (cart management)
│       ├── auth.js          (login, register, profile)
│       ├── checkout.js      (checkout flow)
│       ├── orders.js        (order history + details)
│       └── admin.js         (entire admin dashboard)
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Category.js
│   │   ├── Cart.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── Coupon.js
│   │   ├── Address.js
│   │   ├── SupportTicket.js
│   │   ├── InventoryLog.js
│   │   ├── SiteContent.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── productRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── cartRoutes.js
│   │   ├── userRoutes.js
│   │   ├── addressRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── checkoutRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── couponRoutes.js
│   │   ├── supportRoutes.js
│   │   ├── contentRoutes.js
│   │   └── adminRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── categoryController.js
│   │   ├── cartController.js
│   │   ├── userController.js
│   │   ├── addressController.js
│   │   ├── orderController.js
│   │   ├── checkoutController.js
│   │   ├── paymentController.js
│   │   ├── couponController.js
│   │   ├── supportController.js
│   │   ├── contentController.js
│   │   ├── adminController.js
│   │   ├── reportController.js
│   │   └── inventoryController.js
│   ├── services/
│   │   ├── paymentService.js
│   │   ├── inventoryService.js
│   │   └── orderService.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── security.js
│   │   ├── upload.js
│   │   └── validator.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── constants.js
│   └── seed/
│       └── seedData.js
├── uploads/
│   └── products/ (created at runtime)
├── .env.example
├── .gitignore
├── README.md
└── PROJECT_SPEC.md
```

## Design System — CSS Variables

```css
:root {
  /* Colors */
  --color-white: #ffffff;
  --color-bg: #f9fafb;
  --color-bg-alt: #f3f4f6;
  --color-text: #1f2937;
  --color-text-light: #6b7280;
  --color-text-lighter: #9ca3af;
  --color-accent: #dc2626;
  --color-accent-hover: #b91c1c;
  --color-accent-light: #fef2f2;
  --color-border: #e5e7eb;
  --color-border-dark: #d1d5db;
  --color-success: #10b981;
  --color-success-bg: #ecfdf5;
  --color-warning: #f59e0b;
  --color-warning-bg: #fffbeb;
  --color-error: #ef4444;
  --color-error-bg: #fef2f2;
  --color-info: #3b82f6;
  --color-info-bg: #eff6ff;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:
    0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg:
    0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.03);
  --shadow-xl:
    0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.04);

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Typography */
  --font-sans:
    "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;

  /* Layout */
  --max-width: 1280px;
  --header-height: 72px;
  --sidebar-width: 260px;
}
```

## Database Models — Full Schemas

### User

```javascript
{
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['customer', 'admin', 'superadmin'], default: 'customer' },
  isActive: { type: Boolean, default: true },
  avatar: String,
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date
}
// timestamps: true
// Index: { email: 1 }, { role: 1 }
// Pre-save hook: hash password with bcryptjs (saltRounds=12)
// Method: comparePassword(candidatePassword) -> boolean
// Method: generateResetToken() -> token (crypto.randomBytes hex)
```

### Product

```javascript
{
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, unique: true, lowercase: true },
  sku: { type: String, required: true, unique: true, uppercase: true },
  description: { type: String, required: true },
  shortDescription: { type: String, maxlength: 300 },
  category: { type: ObjectId, ref: 'Category', required: true },
  images: [{ url: String, alt: String, isPrimary: { type: Boolean, default: false } }],
  price: { type: Number, required: true, min: 0 },
  comparePrice: { type: Number, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  variants: [{
    name: String,
    options: [{ label: String, priceModifier: { type: Number, default: 0 }, stock: { type: Number, default: 0 } }]
  }],
  specifications: [{ key: String, value: String }],
  safetyInfo: String,
  stock: { type: Number, required: true, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  sold: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  tags: [String],
  weight: Number,
  dimensions: { length: Number, width: Number, height: Number }
}
// timestamps: true
// Index: { slug: 1 }, { sku: 1 }, { category: 1 }, { price: 1 }, { isActive: 1, isFeatured: 1 }
// Pre-save: generate slug from name (lowercase, replace spaces with hyphens, remove special chars)
// Virtual: effectivePrice = price - (price * discount / 100)
// Virtual: isLowStock = stock <= lowStockThreshold
// Virtual: isOutOfStock = stock <= 0
```

### Category

```javascript
{
  name: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, unique: true, lowercase: true },
  description: String,
  image: String,
  parent: { type: ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  productCount: { type: Number, default: 0 }
}
// timestamps: true
// Pre-save: generate slug from name
```

### Cart

```javascript
{
  user: { type: ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: ObjectId, ref: 'Product', required: true },
    variant: { name: String, option: String },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true }
  }],
  coupon: { type: ObjectId, ref: 'Coupon' },
  couponCode: String,
  couponDiscount: { type: Number, default: 0 }
}
// timestamps: true
// Methods: getSubtotal(), getTotal()
```

### Order

```javascript
{
  orderNumber: { type: String, required: true, unique: true },
  user: { type: ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: ObjectId, ref: 'Product' },
    name: String,
    sku: String,
    variant: { name: String, option: String },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    image: String
  }],
  shippingAddress: {
    name: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  couponCode: String,
  tax: { type: Number, default: 0 },
  shippingCharge: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentMethod: { type: String, default: 'razorpay' },
  notes: String,
  cancellationReason: String,
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: { type: ObjectId, ref: 'User' }
  }]
}
// timestamps: true
// Index: { orderNumber: 1 }, { user: 1 }, { status: 1 }, { paymentStatus: 1 }, { createdAt: -1 }
// Pre-save: generate orderNumber (ORD-YYYYMMDD-XXXXX random)
```

### Payment

```javascript
{
  order: { type: ObjectId, ref: 'Order', required: true },
  user: { type: ObjectId, ref: 'User', required: true },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: String,
  razorpaySignature: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
    default: 'created'
  },
  method: String,
  refunds: [{
    refundId: String,
    amount: Number,
    reason: String,
    status: { type: String, enum: ['pending', 'processed', 'failed'] },
    createdAt: { type: Date, default: Date.now }
  }],
  totalRefunded: { type: Number, default: 0 },
  webhookEvents: [{
    event: String,
    payload: Object,
    receivedAt: { type: Date, default: Date.now },
    processed: { type: Boolean, default: false }
  }],
  errorMessage: String
}
// timestamps: true
// Index: { razorpayOrderId: 1 }, { razorpayPaymentId: 1 }, { order: 1 }, { status: 1 }
```

### Coupon

```javascript
{
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: String,
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount: Number,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  applicableCategories: [{ type: ObjectId, ref: 'Category' }],
  applicableProducts: [{ type: ObjectId, ref: 'Product' }]
}
// timestamps: true
// Index: { code: 1 }, { isActive: 1, startDate: 1, endDate: 1 }
// Method: isValid() -> checks active, dates, usage limit
// Method: calculateDiscount(orderAmount) -> discount amount
```

### Address

```javascript
{
  user: { type: ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false },
  label: { type: String, enum: ['home', 'work', 'other'], default: 'home' }
}
// timestamps: true
// Index: { user: 1 }
```

### SupportTicket

```javascript
{
  ticketNumber: { type: String, required: true, unique: true },
  user: { type: ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  messages: [{
    sender: { type: String, enum: ['customer', 'admin'], required: true },
    senderName: String,
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  category: { type: String, enum: ['order', 'product', 'payment', 'delivery', 'refund', 'other'] },
  order: { type: ObjectId, ref: 'Order' }
}
// timestamps: true
// Pre-save: generate ticketNumber (TKT-XXXXX)
// Index: { user: 1 }, { status: 1 }, { ticketNumber: 1 }
```

### InventoryLog

```javascript
{
  product: { type: ObjectId, ref: 'Product', required: true },
  type: { type: String, enum: ['addition', 'reduction', 'adjustment', 'sale', 'return', 'damage'], required: true },
  quantity: { type: Number, required: true },
  previousStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  reason: String,
  performedBy: { type: ObjectId, ref: 'User' },
  order: { type: ObjectId, ref: 'Order' }
}
// timestamps: true (only createdAt needed)
// Index: { product: 1, createdAt: -1 }
```

### SiteContent

```javascript
{
  type: {
    type: String,
    enum: ['banner', 'featured-category', 'featured-product', 'faq', 'policy', 'contact', 'safety', 'announcement'],
    required: true
  },
  title: String,
  subtitle: String,
  content: String,
  image: String,
  link: String,
  buttonText: String,
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String }
}
// timestamps: true
// Index: { type: 1, isActive: 1, displayOrder: 1 }
```

### AuditLog

```javascript
{
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: ObjectId },
  performedBy: { type: ObjectId, ref: 'User', required: true },
  performerName: String,
  performerRole: String,
  details: Object,
  previousValues: Object,
  newValues: Object,
  ipAddress: String
}
// timestamps: true (only createdAt needed)
// Index: { performedBy: 1 }, { entity: 1, entityId: 1 }, { createdAt: -1 }
```

## API Endpoints

### Authentication (prefix: /api/auth)

```
POST   /register          - Register customer
POST   /login             - Login
POST   /logout            - Logout (destroy session)
POST   /forgot-password   - Send reset token
POST   /reset-password    - Reset with token
GET    /me                - Get current user (session)
```

### Products (prefix: /api/products)

```
GET    /                  - List (query: page, limit, category, search, sort, minPrice, maxPrice)
GET    /featured          - Featured products
GET    /new-arrivals      - New arrivals
GET    /best-sellers      - Best sellers
GET    /:id               - Product detail
GET    /:id/related       - Related products
```

### Categories (prefix: /api/categories)

```
GET    /                  - All active categories
GET    /:id               - Category detail
GET    /:id/products      - Products in category
```

### Cart (prefix: /api/cart) — requires auth

```
GET    /                  - Get cart
POST   /add               - Add item { productId, quantity, variant? }
PUT    /update            - Update item { itemId, quantity }
DELETE /remove/:itemId    - Remove item
POST   /apply-coupon      - Apply coupon { code }
DELETE /remove-coupon     - Remove coupon
DELETE /clear             - Clear cart
```

### Users (prefix: /api/users) — requires auth

```
GET    /profile           - Get profile
PUT    /profile           - Update profile { name, phone }
PUT    /change-password   - Change password { currentPassword, newPassword }
```

### Addresses (prefix: /api/addresses) — requires auth

```
GET    /                  - List addresses
POST   /                  - Create address
PUT    /:id               - Update address
DELETE /:id               - Delete address
PUT    /:id/default       - Set default
```

### Checkout (prefix: /api/checkout) — requires auth

```
POST   /                  - Create order + Razorpay order { addressId }
POST   /verify-payment    - Verify Razorpay payment { razorpayOrderId, razorpayPaymentId, razorpaySignature }
```

### Orders (prefix: /api/orders) — requires auth

```
GET    /                  - List customer orders (query: page, limit, status)
GET    /:id               - Order detail
POST   /:id/cancel        - Cancel order { reason }
```

### Payments (prefix: /api/payments)

```
GET    /:orderId          - Payment detail (auth required)
POST   /webhook           - Razorpay webhook (no auth, signature verification)
```

### Coupons (prefix: /api/coupons) — requires auth

```
POST   /validate          - Validate coupon { code, cartTotal }
```

### Support (prefix: /api/support) — requires auth

```
GET    /                  - List customer tickets
POST   /                  - Create ticket { subject, message, category, orderId? }
GET    /:id               - Ticket detail
POST   /:id/reply         - Reply { message }
```

### Content (prefix: /api/content)

```
GET    /home              - Homepage content (banners, featured, etc.)
GET    /banners           - Active banners
GET    /faqs              - FAQs
GET    /policies/:type    - Policy (privacy/terms/refund/delivery/safety)
GET    /contact           - Contact info
```

### Admin Routes (prefix: /api/admin) — requires admin auth

#### Dashboard

```
GET    /dashboard/stats          - Dashboard KPIs
GET    /dashboard/recent-orders  - Recent orders
GET    /dashboard/sales-chart    - Sales data for charts
```

#### Products

```
GET    /products                 - List all products (with inactive)
POST   /products                 - Create product (multipart form)
GET    /products/:id             - Product detail
PUT    /products/:id             - Update product
DELETE /products/:id             - Archive/delete product
POST   /products/:id/images      - Upload images
DELETE /products/:id/images/:imgId - Remove image
```

#### Categories

```
GET    /categories               - All categories
POST   /categories               - Create category
PUT    /categories/:id           - Update
DELETE /categories/:id           - Delete
```

#### Inventory

```
GET    /inventory                - Inventory list with stock levels
PUT    /inventory/:productId/adjust - Adjust stock { type, quantity, reason }
GET    /inventory/:productId/logs  - Stock movement history
```

#### Orders

```
GET    /orders                   - All orders (query: page, status, dateFrom, dateTo)
GET    /orders/:id               - Order detail
PUT    /orders/:id/status        - Update status { status, note }
```

#### Payments

```
GET    /payments                 - All payments
GET    /payments/:id             - Payment detail
POST   /payments/:id/refund     - Issue refund { amount, reason }
```

#### Customers

```
GET    /customers                - List customers
GET    /customers/:id            - Customer detail + orders
PUT    /customers/:id/status     - Toggle active/inactive
```

#### Coupons

```
GET    /coupons                  - List coupons
POST   /coupons                  - Create coupon
PUT    /coupons/:id              - Update
DELETE /coupons/:id              - Delete
```

#### Support

```
GET    /support                  - All tickets
GET    /support/:id              - Ticket detail
POST   /support/:id/reply       - Admin reply { message }
PUT    /support/:id/status       - Update status { status }
```

#### Content

```
GET    /content                  - All content
POST   /content                  - Create content
PUT    /content/:id              - Update
DELETE /content/:id              - Delete
```

#### Reports

```
GET    /reports/sales            - Sales report (query: dateFrom, dateTo, groupBy)
GET    /reports/products         - Product performance
GET    /reports/orders           - Order report
GET    /reports/inventory        - Inventory report
GET    /reports/customers        - Customer report
GET    /reports/coupons          - Coupon usage report
```

#### Administrators

```
GET    /administrators           - List admins
POST   /administrators           - Create admin { name, email, password, role }
PUT    /administrators/:id       - Update admin
DELETE /administrators/:id       - Remove admin
```

#### Audit Logs

```
GET    /audit-logs               - List (query: page, action, entity, user, dateFrom, dateTo)
```

#### Settings

```
GET    /settings                 - Get settings
PUT    /settings                 - Update settings
```

## Module Exports Convention

### Models

```javascript
// All models export: module.exports = mongoose.model('ModelName', schema);
const User = require("../models/User");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Coupon = require("../models/Coupon");
const Address = require("../models/Address");
const SupportTicket = require("../models/SupportTicket");
const InventoryLog = require("../models/InventoryLog");
const SiteContent = require("../models/SiteContent");
const AuditLog = require("../models/AuditLog");
```

### Middleware

```javascript
// auth.js exports:
exports.isAuthenticated  // check session.userId exists
exports.isAdmin          // check session.userId + user.role is admin/superadmin
exports.isSuperAdmin     // check session.userId + user.role is superadmin

// errorHandler.js exports:
module.exports = function errorHandler(err, req, res, next) { ... }

// rateLimiter.js exports:
exports.apiLimiter   // 100 requests per 15 min
exports.authLimiter  // 10 requests per 15 min

// security.js exports:
exports.securityHeaders  // helmet config
exports.sanitizeInput    // strip $ and . from keys (NoSQL injection protection)

// upload.js exports:
exports.uploadProductImages  // multer for product images (max 5)
exports.uploadSingle         // multer for single image

// validator.js exports (express-validator chains):
exports.validateRegistration
exports.validateLogin
exports.validateProduct
exports.validateAddress
exports.validateCoupon
exports.validateOrder
exports.handleValidationErrors  // middleware to check validation result
```

### Controllers

```javascript
// All controllers export named functions:
// exports.functionName = async (req, res, next) => { ... }
```

### Routes

```javascript
// All routes export: module.exports = router;
// Routes are mounted in server.js
```

### Services

```javascript
// paymentService.js exports:
exports.createRazorpayOrder(amount, currency, receipt);
exports.verifyPaymentSignature(orderId, paymentId, signature);
exports.initiateRefund(paymentId, amount, notes);
exports.verifyWebhookSignature(body, signature);

// inventoryService.js exports:
exports.checkStock(productId, quantity);
exports.reserveStock(productId, quantity, orderId, userId);
exports.releaseStock(productId, quantity, orderId, userId);
exports.adjustStock(productId, type, quantity, reason, userId);

// orderService.js exports:
exports.generateOrderNumber();
exports.calculateOrderTotals(items, coupon);
exports.validateStatusTransition(currentStatus, newStatus);
exports.getValidStatusTransitions(currentStatus);
```

## Server.js — Route Mounting

```javascript
// Route mounting order in server.js:
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/users", userRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/admin", adminRoutes);

// Static files
app.use(express.static("frontend"));
app.use("/uploads", express.static("uploads"));
```

## Session Configuration

```javascript
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  }),
);
```

## Frontend API Client Pattern

```javascript
// api.js provides:
const API = {
  baseUrl: "/api",
  async request(endpoint, options = {}) {
    const url = this.baseUrl + endpoint;
    const config = {
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      ...options,
    };
    const response = await fetch(url, config);
    const data = await response.json();
    if (!response.ok) throw { status: response.status, ...data };
    return data;
  },
  get(endpoint) {
    return this.request(endpoint);
  },
  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },
  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },
  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: "POST",
      headers: {}, // let browser set content-type for FormData
      body: formData,
    });
  },
};
```

## HTML Page Template Structure

All customer pages should follow this template:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Title — Firecrackers</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/css/style.css" />
    <link rel="stylesheet" href="/css/responsive.css" />
    <!-- page-specific CSS if needed -->
  </head>
  <body>
    <!-- Notification container -->
    <div id="notification-container"></div>

    <!-- Header -->
    <header class="header" id="header">
      <div class="container">
        <a href="/" class="logo">🎆 <span>Firecrackers</span></a>
        <nav class="nav" id="nav">
          <a href="/" class="nav-link">Home</a>
          <a href="/products.html" class="nav-link">Products</a>
          <a href="/about.html" class="nav-link">About</a>
          <a href="/contact.html" class="nav-link">Contact</a>
        </nav>
        <div class="header-actions">
          <a href="/cart.html" class="cart-icon" id="cart-icon">
            🛒
            <span class="cart-count" id="cart-count" style="display:none"
              >0</span
            >
          </a>
          <div class="user-menu" id="user-menu">
            <!-- Populated by JS: Login link or user dropdown -->
          </div>
          <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="main">
      <!-- Page content -->
    </main>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <h3>🎆 Firecrackers</h3>
            <p>Premium quality firecrackers for your celebrations.</p>
          </div>
          <div class="footer-col">
            <h4>Quick Links</h4>
            <a href="/products.html">Products</a>
            <a href="/about.html">About Us</a>
            <a href="/faq.html">FAQ</a>
            <a href="/contact.html">Contact</a>
          </div>
          <div class="footer-col">
            <h4>Policies</h4>
            <a href="/faq.html?policy=privacy">Privacy Policy</a>
            <a href="/faq.html?policy=terms">Terms & Conditions</a>
            <a href="/faq.html?policy=refund">Refund Policy</a>
            <a href="/faq.html?policy=delivery">Delivery Policy</a>
          </div>
          <div class="footer-col">
            <h4>Newsletter</h4>
            <form class="newsletter-form" id="newsletter-form">
              <input type="email" placeholder="Your email" required />
              <button type="submit">Subscribe</button>
            </form>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2024 Firecrackers. All rights reserved.</p>
          <p class="safety-note">
            ⚠️ Fireworks should be used responsibly and in compliance with local
            laws.
          </p>
        </div>
      </div>
    </footer>

    <script src="/js/api.js"></script>
    <script src="/js/app.js"></script>
    <!-- page-specific JS -->
  </body>
</html>
```

## Admin Page Template

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page — Admin Dashboard</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/css/style.css" />
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/responsive.css" />
  </head>
  <body class="admin-body">
    <div id="notification-container"></div>

    <!-- Admin Sidebar -->
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="sidebar-header">
        <a href="/admin/dashboard.html" class="logo">🎆 <span>Admin</span></a>
      </div>
      <nav class="sidebar-nav">
        <a
          href="/admin/dashboard.html"
          class="sidebar-link"
          data-page="dashboard"
          >📊 Dashboard</a
        >
        <a href="/admin/products.html" class="sidebar-link" data-page="products"
          >📦 Products</a
        >
        <a
          href="/admin/categories.html"
          class="sidebar-link"
          data-page="categories"
          >🏷️ Categories</a
        >
        <a
          href="/admin/inventory.html"
          class="sidebar-link"
          data-page="inventory"
          >📋 Inventory</a
        >
        <a href="/admin/orders.html" class="sidebar-link" data-page="orders"
          >🛒 Orders</a
        >
        <a href="/admin/payments.html" class="sidebar-link" data-page="payments"
          >💳 Payments</a
        >
        <a
          href="/admin/customers.html"
          class="sidebar-link"
          data-page="customers"
          >👥 Customers</a
        >
        <a href="/admin/coupons.html" class="sidebar-link" data-page="coupons"
          >🎟️ Coupons</a
        >
        <a href="/admin/support.html" class="sidebar-link" data-page="support"
          >💬 Support</a
        >
        <a href="/admin/content.html" class="sidebar-link" data-page="content"
          >📝 Content</a
        >
        <a href="/admin/reports.html" class="sidebar-link" data-page="reports"
          >📈 Reports</a
        >
        <a
          href="/admin/administrators.html"
          class="sidebar-link"
          data-page="administrators"
          >🔐 Admins</a
        >
        <a href="/admin/settings.html" class="sidebar-link" data-page="settings"
          >⚙️ Settings</a
        >
      </nav>
      <div class="sidebar-footer">
        <button onclick="AdminApp.logout()" class="sidebar-link logout-link">
          🚪 Logout
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="admin-main">
      <header class="admin-header">
        <button class="sidebar-toggle" id="sidebar-toggle">☰</button>
        <h1 class="page-title">Page Title</h1>
        <div class="admin-user">
          <span id="admin-name"></span>
        </div>
      </header>
      <div class="admin-content">
        <!-- Page content -->
      </div>
    </div>

    <script src="/js/api.js"></script>
    <script src="/js/app.js"></script>
    <script src="/js/admin.js"></script>
  </body>
</html>
```

## Order Status Transitions (valid)

```
pending     → confirmed, cancelled
confirmed   → processing, cancelled
processing  → shipped, cancelled
shipped     → delivered, returned
delivered   → returned
cancelled   → (terminal)
returned    → (terminal)
```

## Payment Status Flow

```
created     → authorized → captured → (refunded | partially_refunded)
created     → failed
```

## API Response Format

```javascript
// Success
{ success: true, data: { ... }, message: 'Optional message' }

// Success with pagination
{ success: true, data: [...], pagination: { page, limit, total, pages } }

// Error
{ success: false, message: 'Error description', errors: [...] }
```

## Seed Data

Include realistic development data:

- 2 admin users (admin@firecrackers.com / Admin@123, superadmin@firecrackers.com / Super@123)
- 5 categories (Ground Chakkar, Sparklers, Rockets, Flower Pots, Fancy Items)
- 20+ products across categories with prices in INR
- 3 coupons (WELCOME10 = 10% off, DIWALI20 = 20% off min 1000, FLAT100 = ₹100 off min 500)
- Sample banners, FAQs, and policy content
- Default site settings
