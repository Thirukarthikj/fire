const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https://images.unsplash.com", "https://placehold.co", "https://d8j0ntlcm91z4.cloudfront.net", "https://res.cloudinary.com", "https://*.cloudinary.com"],
      mediaSrc: ["'self'", "https://d8j0ntlcm91z4.cloudfront.net", "https://res.cloudinary.com", "https://*.cloudinary.com", "data:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://maxcdn.bootstrapcdn.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://maxcdn.bootstrapcdn.com"],
      connectSrc: ["'self'", "https://sivasbackend.onrender.com", "https://cdnjs.cloudflare.com"]
    }
  },
  crossOriginEmbedderPolicy: false
});

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }

    if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
}

const sanitizeInput = (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
};

module.exports = {
  securityHeaders,
  sanitizeInput
};

