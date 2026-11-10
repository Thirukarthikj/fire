const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary with environment variables
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
    secure: true
  });
}

/**
 * Check if Cloudinary is configured with valid user credentials
 */
const isCloudinaryConfigured = () => {
  const config = cloudinary.config();
  const hasCloudName = Boolean(config.cloud_name && config.cloud_name !== 'your_cloud_name' && !config.cloud_name.includes('<'));
  const hasApiKey = Boolean(config.api_key && config.api_key !== 'your_api_key' && !config.api_key.includes('<'));
  const hasApiSecret = Boolean(config.api_secret && config.api_secret !== 'your_api_secret' && !config.api_secret.includes('<'));
  const hasUrl = Boolean(
    process.env.CLOUDINARY_URL &&
    !process.env.CLOUDINARY_URL.includes('<your_api_key>') &&
    !process.env.CLOUDINARY_URL.includes('<your_api_secret>') &&
    !process.env.CLOUDINARY_URL.includes('<cloud_name>')
  );

  return (hasCloudName && hasApiKey && hasApiSecret) || hasUrl;
};

/**
 * Upload a local temporary file to Cloudinary
 * 1st: Stores image in Cloudinary
 * 2nd: Returns secure Cloudinary URL & public_id
 * 3rd: Deletes local temporary file from disk
 *
 * @param {string} filePath - Absolute path to local temporary file
 * @param {object} options - Optional Cloudinary upload options
 * @returns {Promise<{ url: string, secure_url: string, public_id: string }>}
 */
const uploadToCloudinary = async (filePath, options = {}) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
  }

  const uploadOptions = {
    folder: 'firecrackers_products',
    resource_type: 'image',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    ...options
  };

  try {
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    // Safely remove local temporary file after successful Cloudinary upload
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.warn(`[Cloudinary] Could not remove temp file ${filePath}:`, cleanupErr.message);
    }

    return {
      url: result.secure_url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  } catch (error) {
    // Attempt local temp cleanup on error
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (_) {}
    throw error;
  }
};

/**
 * Delete an image asset from Cloudinary
 * @param {string} publicId - Cloudinary asset public_id
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId || !isCloudinaryConfigured()) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn(`[Cloudinary] Failed to delete image ${publicId}:`, err.message);
    return null;
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary
};

