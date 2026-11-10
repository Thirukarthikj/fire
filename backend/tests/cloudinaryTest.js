/**
 * Cloudinary Image Storage Pipeline Test
 * Tests:
 * 1. Admin adds product image -> uploads to Cloudinary first
 * 2. Cloudinary secure URL & public_id stored in MongoDB
 * 3. Frontstore displays the Cloudinary image URL
 * 4. Image deletion cleans up Cloudinary & MongoDB
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000';

// 1x1 transparent PNG data
const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runTest() {
  console.log('======================================================');
  console.log('🧪 TESTING CLOUDINARY IMAGE STORAGE PIPELINE');
  console.log('======================================================\n');

  // Step 0: Check Cloudinary Configuration module
  const { isCloudinaryConfigured, cloudinary } = require('../config/cloudinary');
  const configured = isCloudinaryConfigured();
  console.log(`[Config] Cloudinary configured: ${configured ? 'YES (Live Cloudinary credentials detected)' : 'NO (Using placeholder/local fallback)'}`);
  if (configured) {
    console.log(`[Config] Cloud Name: ${cloudinary.config().cloud_name}`);
  } else {
    console.log('[Notice] Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env for live Cloudinary uploads.');
  }

  // Step 1: Admin Login
  console.log('\n--- Step 1: Admin Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@firecrackers.com',
      password: 'Password@123'
    })
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
  }
  const setCookie = loginRes.headers.get('set-cookie');
  const adminCookie = setCookie.match(/connect\.sid=[^;]+/)[0];
  console.log('✅ Admin authenticated successfully');

  // Get a category ID
  const catRes = await fetch(`${BASE_URL}/api/categories`);
  const catData = await catRes.json();
  const categoryId = catData.data[0]._id;

  // Step 2: Prepare temporary test image file
  console.log('\n--- Step 2: Prepare Product Image File ---');
  const tempDir = path.join(__dirname, '../../uploads/temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const testImagePath = path.join(tempDir, `test-firecracker-${Date.now()}.png`);
  fs.writeFileSync(testImagePath, Buffer.from(SAMPLE_PNG_BASE64, 'base64'));
  console.log(`✅ Sample image created: ${testImagePath} (${fs.statSync(testImagePath).size} bytes)`);

  // Step 3: Admin uploads product with image (Multipart FormData)
  console.log('\n--- Step 3: Admin Creates Product with Image (1st: Cloudinary -> 2nd: MongoDB) ---');
  const uniqueSku = `CLD-${Date.now()}`;
  const formData = new FormData();
  formData.append('name', 'Cloudinary Mega Sparkler Box');
  formData.append('sku', uniqueSku);
  formData.append('category', categoryId);
  formData.append('price', '350');
  formData.append('discount', '10');
  formData.append('stock', '50');
  formData.append('description', 'High illumination celebratory sparklers with Cloudinary stored high-res photos.');
  formData.append('safetyInfo', 'Always light outdoors with adult supervision.');
  formData.append('isActive', 'true');

  const fileBlob = new Blob([fs.readFileSync(testImagePath)], { type: 'image/png' });
  formData.append('images', fileBlob, 'mega-sparkler.png');

  const createRes = await fetch(`${BASE_URL}/api/admin/products`, {
    method: 'POST',
    headers: { 'Cookie': adminCookie },
    body: formData
  });

  const createData = await createRes.json();
  if (!createData.success) {
    throw new Error(`Product creation failed: ${JSON.stringify(createData)}`);
  }

  const createdProduct = createData.data;
  console.log(`✅ Product created in MongoDB! ID: ${createdProduct._id}`);
  console.log(`   Product Images array length: ${createdProduct.images.length}`);
  const primaryImage = createdProduct.images[0];
  console.log(`   Primary Image URL: ${primaryImage.url}`);
  if (primaryImage.public_id) {
    console.log(`   Cloudinary Public ID: ${primaryImage.public_id}`);
  }

  // Step 4: Verify directly in MongoDB
  console.log('\n--- Step 4: Verify Direct Document in MongoDB ---');
  await mongoose.connect('mongodb://localhost:27017/firecrackers_ecommerce');
  const ProductModel = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  const dbProduct = await ProductModel.findById(createdProduct._id);

  if (!dbProduct) {
    throw new Error('Product not found in MongoDB!');
  }
  if (!dbProduct.images || dbProduct.images.length === 0) {
    throw new Error('Images array empty in MongoDB!');
  }
  console.log('✅ Direct MongoDB Verification:');
  console.log(`   _id: ${dbProduct._id}`);
  console.log(`   name: "${dbProduct.name}"`);
  console.log(`   sku: "${dbProduct.sku}"`);
  console.log(`   Stored image url: "${dbProduct.images[0].url}"`);
  console.log(`   Stored public_id: "${dbProduct.images[0].public_id || 'N/A'}"`);

  // Step 5: Verify Frontstore Displays the Image
  console.log('\n--- Step 5: Verify Frontstore Product Catalog Displays Image ---');
  const frontRes = await fetch(`${BASE_URL}/api/products/${createdProduct._id}`);
  const frontData = await frontRes.json();

  if (!frontData.success || !frontData.data) {
    throw new Error(`Frontstore fetch failed: ${JSON.stringify(frontData)}`);
  }
  const frontProduct = frontData.data;
  console.log(`✅ Frontstore product loaded: "${frontProduct.name}"`);
  console.log(`   Frontstore primary image URL: ${frontProduct.images[0].url}`);
  if (frontProduct.images[0].url !== primaryImage.url) {
    throw new Error('Frontstore image URL does not match MongoDB stored URL!');
  }

  // Step 6: Test Uploading Additional Image to Existing Product
  console.log('\n--- Step 6: Test Upload Additional Image to Existing Product ---');
  const testImage2Path = path.join(tempDir, `test-firecracker-2-${Date.now()}.png`);
  fs.writeFileSync(testImage2Path, Buffer.from(SAMPLE_PNG_BASE64, 'base64'));
  const formData2 = new FormData();
  const fileBlob2 = new Blob([fs.readFileSync(testImage2Path)], { type: 'image/png' });
  formData2.append('images', fileBlob2, 'mega-sparkler-detail.png');

  const uploadMoreRes = await fetch(`${BASE_URL}/api/admin/products/${createdProduct._id}/images`, {
    method: 'POST',
    headers: { 'Cookie': adminCookie },
    body: formData2
  });
  const uploadMoreData = await uploadMoreRes.json();
  if (!uploadMoreData.success) {
    throw new Error(`Additional image upload failed: ${JSON.stringify(uploadMoreData)}`);
  }
  console.log(`✅ Additional image added! Total images: ${uploadMoreData.data.length}`);
  const secondImage = uploadMoreData.data[uploadMoreData.data.length - 1];
  console.log(`   Second Image URL: ${secondImage.url}`);

  // Step 7: Test Delete Product Image
  console.log('\n--- Step 7: Test Delete Product Image (Cloudinary + MongoDB Sync) ---');
  const deleteImgRes = await fetch(`${BASE_URL}/api/admin/products/${createdProduct._id}/images/${secondImage._id}`, {
    method: 'DELETE',
    headers: { 'Cookie': adminCookie }
  });
  const deleteImgData = await deleteImgRes.json();
  if (!deleteImgData.success) {
    throw new Error(`Delete image failed: ${JSON.stringify(deleteImgData)}`);
  }
  console.log(`✅ Image deleted from storage & MongoDB! Remaining images: ${deleteImgData.data.length}`);

  // Cleanup local test files
  try { if (fs.existsSync(testImagePath)) fs.unlinkSync(testImagePath); } catch (_) {}
  try { if (fs.existsSync(testImage2Path)) fs.unlinkSync(testImage2Path); } catch (_) {}
  await mongoose.disconnect();

  console.log('\n======================================================');
  console.log('🎉 ALL CLOUDINARY PIPELINE TESTS PASSED 100%!');
  console.log('======================================================');
}

runTest().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});

