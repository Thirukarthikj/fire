const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../frontend');
const destDir = path.join(__dirname, '../public');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy frontend contents to public
  fs.cpSync(srcDir, destDir, { recursive: true, force: true });
  console.log('[Build] Successfully synchronized frontend assets into public/ directory for Vercel deployment.');
} catch (err) {
  console.error('[Build] Error synchronizing frontend assets:', err);
  process.exit(1);
}

