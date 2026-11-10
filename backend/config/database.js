const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // In Vercel serverless, if MONGO_URI is not provided yet, warn without crashing
  if (process.env.VERCEL && !process.env.MONGO_URI) {
    console.warn('[MongoDB] Warning: MONGO_URI environment variable is not defined in Vercel. Database features will be unavailable until added.');
    return null;
  }

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/firecrackers_ecommerce';
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    cachedConnection = conn;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    // In serverless environment (Vercel), do not terminate process so other routes/static files work
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected from database');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB] Runtime error: ${err.message}`);
});

module.exports = connectDB;
