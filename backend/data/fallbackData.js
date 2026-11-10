/**
 * Fallback catalogue data for when MongoDB is connecting, offline, or during Vercel initial setup
 * Ensures frontstore never displays a blank page or buffering timeout error
 */

const FALLBACK_CATEGORIES = [
  { _id: 'cat_sparklers_01', name: 'Sparklers', slug: 'sparklers', productCount: 4, displayOrder: 1, isActive: true },
  { _id: 'cat_flower_pots_02', name: 'Flower Pots', slug: 'flower-pots', productCount: 3, displayOrder: 2, isActive: true },
  { _id: 'cat_ground_chakkars_03', name: 'Ground Chakkars', slug: 'ground-chakkars', productCount: 3, displayOrder: 3, isActive: true },
  { _id: 'cat_rockets_04', name: 'Rockets', slug: 'rockets', productCount: 2, displayOrder: 4, isActive: true },
  { _id: 'cat_bombs_05', name: 'Bombs', slug: 'bombs', productCount: 2, displayOrder: 5, isActive: true },
  { _id: 'cat_gift_boxes_06', name: 'Gift Boxes', slug: 'gift-boxes', productCount: 3, displayOrder: 6, isActive: true },
  { _id: 'cat_sky_shots_07', name: 'Sky Shots', slug: 'sky-shots', productCount: 3, displayOrder: 7, isActive: true },
  { _id: 'cat_kids_08', name: 'Kids Crackers', slug: 'kids-crackers', productCount: 2, displayOrder: 8, isActive: true }
];

const FALLBACK_PRODUCTS = [
  {
    _id: 'prod_sparkler_10cm',
    name: '10cm Electric Sparklers (Box of 10)',
    slug: '10cm-electric-sparklers-box-of-10',
    sku: 'SPK-10CM-01',
    description: 'Traditional golden sparkling fountains for family festivities. Low-smoke CSIR-NEERI certified formulation with 45 seconds burn time.',
    category: { _id: 'cat_sparklers_01', name: 'Sparklers', slug: 'sparklers' },
    brand: 'Standard Fireworks',
    price: 45,
    comparePrice: 150,
    discount: 70,
    stock: 500,
    sold: 1420,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    isActive: true,
    tags: ['sparklers', 'safe', 'family', 'green-certified'],
    images: [{
      url: 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?auto=format&fit=crop&w=600&q=80',
      alt: '10cm Electric Sparklers Box',
      isPrimary: true
    }]
  },
  {
    _id: 'prod_sparkler_15cm_color',
    name: '15cm Multi Color Sparklers (Pack of 5 Pcs)',
    slug: '15cm-multi-color-sparklers-pack-of-5-pcs',
    sku: 'SPK-15CM-COL',
    description: 'Vibrant green, ruby red, and golden glittering sparks emitting festive multi-spectrum light for kids and family.',
    category: { _id: 'cat_sparklers_01', name: 'Sparklers', slug: 'sparklers' },
    brand: 'Standard Fireworks',
    price: 75,
    comparePrice: 220,
    discount: 66,
    stock: 350,
    sold: 980,
    isFeatured: true,
    isBestSeller: false,
    isNewArrival: true,
    isActive: true,
    tags: ['sparklers', 'color', 'kids', 'diwali-2026'],
    images: [{
      url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80',
      alt: 'Multi Color Sparklers',
      isPrimary: true
    }]
  },
  {
    _id: 'prod_flower_pot_ashoka',
    name: 'Ashoka Flower Pots Big (Box of 10)',
    slug: 'ashoka-flower-pots-big-box-of-10',
    sku: 'FP-ASHOKA-BIG',
    description: 'Spectacular conical fountain projecting dazzling golden showers reaching up to 15 feet high with zero sharp report sound.',
    category: { _id: 'cat_flower_pots_02', name: 'Flower Pots', slug: 'flower-pots' },
    brand: 'Standard Fireworks',
    price: 180,
    comparePrice: 450,
    discount: 60,
    stock: 220,
    sold: 680,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    isActive: true,
    tags: ['flower-pots', 'fountain', 'golden-shower'],
    images: [{
      url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?auto=format&fit=crop&w=600&q=80',
      alt: 'Ashoka Flower Pots Big',
      isPrimary: true
    }]
  },
  {
    _id: 'prod_ground_chakkar_special',
    name: 'Special Ground Chakkars (Box of 10)',
    slug: 'special-ground-chakkars-box-of-10',
    sku: 'GC-SPEC-10',
    description: 'High-speed spinning wheels emitting radiant concentric rings of golden sparks with whistling sound effects.',
    category: { _id: 'cat_ground_chakkars_03', name: 'Ground Chakkars', slug: 'ground-chakkars' },
    brand: 'Standard Fireworks',
    price: 120,
    comparePrice: 320,
    discount: 62,
    stock: 300,
    sold: 1100,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    isActive: true,
    tags: ['chakkars', 'ground-wheels', 'whistling'],
    images: [{
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      alt: 'Special Ground Chakkars',
      isPrimary: true
    }]
  },
  {
    _id: 'prod_aerial_skyshot_12',
    name: '12 Shots Aerial Multi-Color Brocade Cake',
    slug: '12-shots-aerial-multi-color-brocade-cake',
    sku: 'SKY-12SHOT',
    description: 'Grand night sky repeater firing 12 sequential high-altitude multi-color peonies with thunderous titanium crackling crowns.',
    category: { _id: 'cat_sky_shots_07', name: 'Sky Shots', slug: 'sky-shots' },
    brand: 'Standard Fireworks',
    price: 490,
    comparePrice: 1200,
    discount: 59,
    stock: 120,
    sold: 450,
    isFeatured: true,
    isBestSeller: false,
    isNewArrival: true,
    isActive: true,
    tags: ['aerial', 'sky-shots', 'brocade', 'celebration'],
    images: [{
      url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?auto=format&fit=crop&w=600&q=80',
      alt: '12 Shots Aerial Cake',
      isPrimary: true
    }]
  },
  {
    _id: 'prod_gift_box_deluxe_35',
    name: 'Sivakasi Royal Family Mega Gift Box (35 Items)',
    slug: 'sivakasi-royal-family-mega-gift-box-35-items',
    sku: 'GB-ROYAL-35',
    description: 'Complete all-in-one family festive consignment: sparklers, chakkars, pots, rockets, and sound crackers in an elegant gift box presentation.',
    category: { _id: 'cat_gift_boxes_06', name: 'Gift Boxes', slug: 'gift-boxes' },
    brand: 'Standard Fireworks',
    price: 999,
    comparePrice: 3200,
    discount: 69,
    stock: 85,
    sold: 820,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    isActive: true,
    tags: ['gift-boxes', 'family-pack', 'all-in-one', 'diwali-combo'],
    images: [{
      url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
      alt: 'Sivakasi Royal Family Mega Gift Box',
      isPrimary: true
    }]
  },
  {
    _id: 'prod_cloudinary_mega_box',
    name: 'Cloudinary Mega Sparkler Box',
    slug: 'cloudinary-mega-sparkler-box',
    sku: 'CLD-SPK-01',
    description: 'Premium Sivakasi celebratory sparklers directly synced through Cloudinary CDN. Instant ignition, safe handling, long burn time.',
    category: { _id: 'cat_sparklers_01', name: 'Sparklers', slug: 'sparklers' },
    brand: 'Standard Fireworks',
    price: 299,
    comparePrice: 650,
    discount: 54,
    stock: 250,
    sold: 320,
    isFeatured: true,
    isBestSeller: false,
    isNewArrival: true,
    isActive: true,
    tags: ['sparklers', 'cloudinary', 'festive'],
    images: [{
      url: 'https://res.cloudinary.com/tci2igsn/image/upload/v1794310908/firecrackers_products/x8je99iend4lrhbz0qil.png',
      alt: 'Cloudinary Mega Sparkler Box',
      isPrimary: true,
      public_id: 'firecrackers_products/x8je99iend4lrhbz0qil'
    }]
  }
];

module.exports = {
  FALLBACK_CATEGORIES,
  FALLBACK_PRODUCTS
};
