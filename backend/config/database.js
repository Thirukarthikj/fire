const mongoose = require('mongoose');

// Disable command buffering so queries fail immediately or fall back cleanly instead of hanging for 10 seconds
mongoose.set('bufferCommands', false);

let cachedConnection = null;

// Catch unhandled database driver rejections so serverless lambdas never crash
process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Caught unhandled rejection:', reason && reason.message ? reason.message : reason);
});

const isRemoteMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return false;
  return uri.startsWith('mongodb+srv://') || (uri.startsWith('mongodb://') && !uri.includes('localhost') && !uri.includes('127.0.0.1'));
};

const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  const mongoUri = process.env.MONGO_URI;

  // On Vercel, only connect if MONGO_URI is explicitly configured as a remote URI
  if (process.env.VERCEL) {
    if (!mongoUri || !isRemoteMongoUri(mongoUri)) {
      console.warn('[MongoDB] Vercel environment detected without remote MONGO_URI (e.g. mongodb+srv://). Skipping database connection until configured.');
      return null;
    }
  }

  const effectiveUri = mongoUri || 'mongodb://localhost:27017/firecrackers_ecommerce';

  try {
    const conn = await mongoose.connect(effectiveUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    cachedConnection = conn;
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
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
module.exports.connectDB = connectDB;
module.exports.isDBConnected = isDBConnected;
