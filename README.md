# 🎆 Firecrackers E-Commerce Platform

A production-oriented, responsive e-commerce platform for regulated fireworks and green crackers. Features a modern minimal storefront and a comprehensive administrative management dashboard.

---

## 📋 Technology Policy & Constraints
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No React, Vue, Angular, or TypeScript).
- **Backend**: Node.js & Express.js.
- **Database**: MongoDB with Mongoose ODM.
- **Authentication**: Secure Session-Based Authentication (`express-session` + `connect-mongo`).
- **Payment Pipeline**: NPCI UPI Standard Deep Link QR with dynamic amount calculation & real-time auto-placement.
- **Image Storage**: Cloudinary CDN with auto-optimization and MongoDB sync.

---

## 🌟 Key Features

### 🛒 Customer Storefront
- **Dynamic Catalogue**: Real-time category filtering, price range sliders, keyword search with debounce, instant sorting, and pagination.
- **Product Details**: Multi-angle image galleries, product variants, real-time stock alerts, specifications table, and mandatory safety advisories.
- **Cart Management**: Server-side price recalculation, atomic stock check, and coupon validation (`WELCOME10`, `DIWALI20`, `FLAT100`).
- **Checkout & Payment**: Address book selection, inline new address modal, dynamic Google Pay / UPI QR with auto-calculated total, 5-minute timer, and automatic order placement.
- **Customer Account**: Profile editing, secure password update, address book management, order history tracking with live timeline steps, and cancellation workflows.
- **Compliance & Support**: FAQ accordion, PESO green cracker safety guides, terms of sale, and integrated customer enquiry ticketing.

### 📊 Comprehensive Administrator Dashboard
- **Dashboard Overview**: Financial KPIs distinguishing gross revenue, completed payments, refund volume, inventory alerts, CSS sales trend chart, and recent orders.
- **Products & Categories**: Full CRUD with Cloudinary multi-image upload, slug generation, SKU tracking, and discount rules.
- **Warehouse Inventory**: Real-time stock counts, color-coded low stock / out of stock alerts, and audit-logged manual stock adjustments.
- **Order Lifecycle Management**: Enforced state transitions (`pending` → `confirmed` → `processing` → `shipped` → `delivered` / `cancelled`) with automatic stock release on cancellation.
- **Payments & Refunds**: Transaction log with UPI references, partial and full refund processing.
- **Customer Control**: Account review and status toggle (Active / Suspended).
- **Coupons**: Percentage and fixed discount rules with expiration dates, min order requirements, and usage caps.
- **Website Content**: Live homepage banners, announcements, and policy editor.
- **Analytics & Reports**: Tabular and printable summaries for sales, inventory assets, product velocity, and top spenders.
- **Staff Access Control**: Multi-tier administrator role provisioning (`admin` vs `superadmin`) and administrative audit logging.

---

## 📂 Project Architecture

```
Fire/
├── frontend/
│   ├── index.html                   # Storefront Homepage
│   ├── products.html                # Filterable Catalogue
│   ├── product-details.html         # Product Specs & Gallery
│   ├── cart.html                    # Shopping Cart
│   ├── checkout.html                # Address & Razorpay Checkout
│   ├── login.html                   # Customer Login
│   ├── register.html                # Customer Registration
│   ├── profile.html                 # Customer Profile
│   ├── addresses.html               # Address Book
│   ├── orders.html                  # Order History
│   ├── order-details.html           # Order Timeline & Receipt
│   ├── contact.html                 # Customer Care & Tickets
│   ├── about.html                   # Heritage & Green Certification
│   ├── faq.html                     # Safety & Statutory Policies
│   ├── admin/
│   │   ├── login.html               # Staff Admin Login
│   │   ├── dashboard.html           # Operations Dashboard
│   │   ├── products.html            # Product Catalog Management
│   │   ├── categories.html          # Category Management
│   │   ├── inventory.html           # Stock Control
│   │   ├── orders.html              # Order Lifecycle
│   │   ├── payments.html            # Payments & Refunds
│   │   ├── customers.html           # Customer Directory
│   │   ├── coupons.html             # Discount Coupons
│   │   ├── support.html             # Customer Enquiries
│   │   ├── content.html             # Banners & Content
│   │   ├── reports.html             # Analytics & Reporting
│   │   ├── administrators.html      # Staff Provisioning
│   │   └── settings.html            # Store Configuration
│   ├── css/
│   │   ├── style.css                # Design System & Components
│   │   ├── responsive.css           # Breakpoints & Mobile Nav
│   │   ├── product.css              # Catalogue & Details
│   │   ├── checkout.css             # Cart & Address Cards
│   │   └── admin.css                # Admin Layout & KPI Cards
│   └── js/
│       ├── api.js                   # Unified Fetch API Client
│       ├── app.js                   # Global Toast & Auth State
│       ├── products.js              # Product Listing & Details
│       ├── cart.js                  # Cart Interactivity
│       ├── auth.js                  # Login, Register & Addresses
│       ├── checkout.js              # Razorpay Modal Integration
│       ├── orders.js                # Customer Orders Tracking
│       └── admin.js                 # Admin Dashboard Controller
├── backend/
│   ├── server.js                    # Express Application Entry
│   ├── config/database.js           # Mongoose MongoDB Connection
│   ├── models/                      # 12 Mongoose Data Models
│   ├── routes/                      # REST API Endpoint Routers
│   ├── controllers/                 # Business Logic & Controllers
│   ├── services/                    # Razorpay, Inventory & Orders
│   ├── middleware/                  # Auth, Upload, Rate Limit, Security
│   ├── utils/                       # Helpers & Constants
│   └── seed/seedData.js             # Initial Development Database Seeder
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Installation & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v6.0 or higher (running locally or MongoDB Atlas URI)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Populate your configuration values:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/firecrackers_ecommerce
SESSION_SECRET=your_super_secret_session_key_min_32_characters
UPI_MERCHANT_ID=jthirukarthick@oksbi
UPI_MERCHANT_NAME=Sivakasi Direct Wholesale
CLOUDINARY_CLOUD_NAME=tci2igsn
CLOUDINARY_API_KEY=557664337442678
CLOUDINARY_API_SECRET=q4MDMFgI3HBieIIOUUjcYnipbGM
SITE_URL=http://localhost:5000
```

### 4. Seed the Database
Populates 20+ realistic Indian firecrackers across 5 categories, 3 promotional discount coupons, site content, sample customer, and administrative credentials:
```bash
npm run seed
```

Default Credentials generated:
- **Admin**: `admin@firecrackers.com` / `Password@123`
- **Super Admin**: `superadmin@firecrackers.com` / `Password@123`
- **Customer**: `customer@example.com` / `Password@123`

### 5. Start the Application
For development:
```bash
npm run dev
```
For production:
```bash
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.
Access Admin Dashboard at **[http://localhost:5000/admin/login.html](http://localhost:5000/admin/login.html)**.

---

## 📱 Google Pay & UPI QR Checkout Workflow
1. When the user checks out:
   - Server calculates total payable from database product records.
   - Server reserves inventory atomically with `findOneAndUpdate`.
   - Generates dynamic high-res QR code encoding standard NPCI URI with pre-calculated amount.
   - Starts 5-minute countdown session with auto-expiry overlay.
   - Real-time poller and app return listener automatically confirm order upon payment detection without manual UTR input.
   - Stores confirmed order and payment record in MongoDB and redirects user to confirmation screen.

---

## ⚖️ Legal & Operational Notice
Fireworks and sparklers are regulated hazardous items. Sale and transport are subject to Petroleum and Explosives Safety Organisation (PESO) regulations and state high court rulings. Store administration parameters in the Admin Panel allow configuring permitted destination states.

