const assert = require('assert');
const { isCloudinaryConfigured, cloudinary } = require('../config/cloudinary');

console.log('--- Testing Cloudinary Module ---');

// 1. Initial State (placeholder values)
assert.strictEqual(typeof isCloudinaryConfigured, 'function', 'isCloudinaryConfigured should be a function');

// 2. Set mock credentials in env to verify detection
process.env.CLOUDINARY_CLOUD_NAME = 'test-firecrackers-cloud';
process.env.CLOUDINARY_API_KEY = '123456789012345';
process.env.CLOUDINARY_API_SECRET = 'secret_abcdef123456';

// Re-configure
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

assert.strictEqual(isCloudinaryConfigured(), true, 'Should detect valid Cloudinary configuration');
assert.strictEqual(cloudinary.config().cloud_name, 'test-firecrackers-cloud');
assert.strictEqual(cloudinary.config().api_key, '123456789012345');

console.log('✅ Cloudinary configuration detection passed!');

// Restore env
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;

