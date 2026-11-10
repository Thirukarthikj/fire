const fs = require('fs');
const path = require('path');

const files = [
  'frontend/about.html',
  'frontend/addresses.html',
  'frontend/cart.html',
  'frontend/contact.html',
  'frontend/faq.html',
  'frontend/index.html',
  'frontend/order-details.html',
  'frontend/orders.html',
  'frontend/price-list.html',
  'frontend/product-details.html',
  'frontend/products.html',
  'frontend/profile.html',
  'frontend/wishlist.html'
];

const patternsToRemove = [
  /\s*<a href="\/products\.html\?category=sparklers" class="nav-strip-link">Sparklers<\/a>/g,
  /\s*<a href="\/products\.html\?category=flower-pots" class="nav-strip-link">Flower Pots<\/a>/g,
  /\s*<a href="\/products\.html\?category=ground-chakkars" class="nav-strip-link">Chakkars<\/a>/g,
  /\s*<a href="\/products\.html\?category=sky-shots" class="nav-strip-link">Sky Shots<\/a>/g,
  /\s*<a href="\/products\.html\?category=gift-boxes" class="nav-strip-link">Gift Hampers<\/a>/g,
  /\s*<a href="\/#brand-showcase" class="nav-strip-link">Brands<\/a>/g
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let originalLen = content.length;

  patternsToRemove.forEach(pattern => {
    content = content.replace(pattern, '');
  });

  if (content.length !== originalLen) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Success] Updated ${file}`);
  } else {
    console.log(`[Skipped/No match] ${file}`);
  }
});

console.log('Menu cleanup completed across all frontend templates.');

