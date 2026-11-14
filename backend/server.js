require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./config/database');
const { securityHeaders, sanitizeInput } = require('./middleware/security');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const userRoutes = require('./routes/userRoutes');
const addressRoutes = require('./routes/addressRoutes');
const orderRoutes = require('./routes/orderRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const couponRoutes = require('./routes/couponRoutes');
const supportRoutes = require('./routes/supportRoutes');
const contentRoutes = require('./routes/contentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

// Trust reverse proxy for secure cookies on Vercel and cloud deployments
app.set('trust proxy', 1);

// Connect to Database
connectDB();

// Security and Logging
app.use(securityHeaders);
app.use(cors({
  origin: true,
  credentials: true
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body Parsers & Sanitization
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput);

// Session Configuration
let sessionStore;
const mongoUri = process.env.MONGO_URI;
const isRemoteUri = mongoUri && (mongoUri.startsWith('mongodb+srv://') || (!mongoUri.includes('localhost') && !mongoUri.includes('127.0.0.1')));

if (isRemoteUri) {
  try {
    sessionStore = MongoStore.create({
      mongoUrl: mongoUri,
      touchAfter: 24 * 3600,
      mongoOptions: {
        serverSelectionTimeoutMS: 5000
      }
    });
    sessionStore.on('error', (err) => {
      console.warn('[Session] Session store warning:', err.message);
    });
  } catch (storeErr) {
    console.warn('[Session] Session store initialization warning:', storeErr.message);
  }
} else {
  console.log('[Session] Running with in-memory session store for local/serverless stability.');
}

app.use(session({
  secret: process.env.SESSION_SECRET || 'firecrackers_secret_session_key_2024',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Apply general API rate limiting
app.use('/api', apiLimiter);

// Ensure database connection is ready for API routes in serverless
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    try {
      await connectDB();
    } catch (err) {
      console.warn('[DB Middleware] Connection attempt:', err.message);
    }
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

// Static Assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Admin entry point redirect
app.get(['/admin', '/admin/'], (req, res) => {
  res.redirect('/admin/dashboard.html');
});

// SPA fallback for HTML pages if needed
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  // If direct file requested but has no extension, or not matched
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Centralized Error Handling
app.use(errorHandler);

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`[Server] Firecrackers E-Commerce running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  });

  // Graceful Shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

module.exports = app;

