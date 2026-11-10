require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const SiteContent = require('../models/SiteContent');
const InventoryLog = require('../models/InventoryLog');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Address = require('../models/Address');
const Cart = require('../models/Cart');
const SupportTicket = require('../models/SupportTicket');
const AuditLog = require('../models/AuditLog');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/firecrackers_ecommerce';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // Clear existing collections
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Coupon.deleteMany({}),
      SiteContent.deleteMany({}),
      InventoryLog.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
      Address.deleteMany({}),
      Cart.deleteMany({}),
      SupportTicket.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    // 1. Seed Administrators & Sample Customer
    console.log('[Seed] Seeding Users...');
    const superAdmin = await User.create({
      name: 'Super Administrator',
      email: 'superadmin@firecrackers.com',
      password: 'Password@123',
      phone: '+91 98765 00001',
      role: 'superadmin',
      isActive: true
    });

    const admin = await User.create({
      name: 'Store Manager',
      email: 'admin@firecrackers.com',
      password: 'Password@123',
      phone: '+91 98765 00002',
      role: 'admin',
      isActive: true
    });

    const customer = await User.create({
      name: 'Rahul Sharma',
      email: 'customer@example.com',
      password: 'Password@123',
      phone: '+91 98765 43210',
      role: 'customer',
      isActive: true
    });

    // 2. Seed 10 Canonical Categories
    console.log('[Seed] Seeding 10 Canonical Categories...');
    const categories = await Category.create([
      {
        name: 'Sparklers',
        slug: 'sparklers',
        description: 'Handheld celebratory sparklers available in gold, silver, electric, and neon multi-color.',
        displayOrder: 1,
        isActive: true
      },
      {
        name: 'Flower Pots',
        slug: 'flower-pots',
        description: 'Conical fountain crackers projecting glittering golden, silver, and multi-colored showers up to 15 feet.',
        displayOrder: 2,
        isActive: true
      },
      {
        name: 'Ground Chakkars',
        slug: 'ground-chakkars',
        description: 'Vibrant spinning wheels emitting luminous rings of light and whistling effects on the ground.',
        displayOrder: 3,
        isActive: true
      },
      {
        name: 'Rockets',
        slug: 'rockets',
        description: 'High-altitude ascending sky rockets bursting into magnificent stars and parachute flares.',
        displayOrder: 4,
        isActive: true
      },
      {
        name: 'Bombs',
        slug: 'bombs',
        description: 'Traditional intense report sound crackers, including hydro bombs and green digital bombs.',
        displayOrder: 5,
        isActive: true
      },
      {
        name: 'Gift Boxes',
        slug: 'gift-boxes',
        description: 'Complete family celebration boxes containing assorted curated sparklers, chakkars, pots, and aerials.',
        displayOrder: 6,
        isActive: true
      },
      {
        name: 'Fancy Items',
        slug: 'fancy-items',
        description: 'Novelty function fireworks including peacock fountains, butterfly flyers, and crackling balls.',
        displayOrder: 7,
        isActive: true
      },
      {
        name: 'Sky Shots',
        slug: 'sky-shots',
        description: 'Multi-shot repeater aerial cakes illuminating the night sky with grand floral brocades.',
        displayOrder: 8,
        isActive: true
      },
      {
        name: 'Multi Sound Crackers',
        slug: 'multi-sound-crackers',
        description: 'Classic double and triple sound crackers producing rhythmic celebratory reports.',
        displayOrder: 9,
        isActive: true
      },
      {
        name: 'Kids Crackers',
        slug: 'kids-crackers',
        description: 'Safe, low-smoke, kid-friendly novelties including pop-pops, roll caps, and magic serpent pencils.',
        displayOrder: 10,
        isActive: true
      }
    ]);

    const catMap = {};
    categories.forEach(c => { catMap[c.slug] = c._id; });
    // Backward compatibility aliases
    catMap['rockets-missiles'] = catMap['rockets'];
    catMap['fancy-aerial-cakes'] = catMap['sky-shots'];

    // 3. Seed Products (20+ items)
    console.log('[Seed] Seeding Products...');
    const productsData = [
      // Ground Chakkars
      {
        name: 'Zamin Chakkar Deluxe (10 Pcs)',
        sku: 'CHK-DLX-01',
        description: 'Traditional ground wheel spinner generating luminous golden rings of light with long-lasting duration.',
        shortDescription: '10 pcs deluxe smooth ground spinners.',
        category: catMap['ground-chakkars'],
        price: 240,
        comparePrice: 300,
        discount: 20,
        stock: 150,
        lowStockThreshold: 20,
        isFeatured: true,
        isBestSeller: true,
        safetyInfo: 'Place on a smooth, non-flammable level ground. Maintain 5 meters viewing distance.',
        specifications: [{ key: 'Pieces per Box', value: '10' }, { key: 'Effect Duration', value: '45 seconds each' }],
        images: [{ url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Special Whispering Chakkar (10 Pcs)',
        sku: 'CHK-WHS-02',
        description: 'High speed rotating spinner with a melodious whistle and emerald green sparks.',
        shortDescription: 'Whistling green ground spinners.',
        category: catMap['ground-chakkars'],
        price: 320,
        comparePrice: 400,
        discount: 20,
        stock: 80,
        isNewArrival: true,
        safetyInfo: 'Ensure clear 6m perimeter. Never touch while spinning.',
        specifications: [{ key: 'Pieces per Box', value: '10' }, { key: 'Effect', value: 'Whistle + Green Sparks' }],
        images: [{ url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Big Wheel Jumbo Chakkar (5 Pcs)',
        sku: 'CHK-JMB-03',
        description: 'Extra-large diameter ground spinners throwing intense golden showers across a 3m radius.',
        shortDescription: '5 pcs jumbo spinning wheels.',
        category: catMap['ground-chakkars'],
        price: 450,
        comparePrice: 500,
        discount: 10,
        stock: 45,
        safetyInfo: 'Operate strictly on open ground away from dry foliage.',
        specifications: [{ key: 'Pieces per Box', value: '5' }, { key: 'Radius', value: '3 meters' }],
        images: [{ url: 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Disco Wheel Tri-Color Chakkar',
        sku: 'CHK-DIS-04',
        description: 'Changes colors from silver to gold to crimson red during rotation.',
        shortDescription: 'Tri-color changing ground chakkar.',
        category: catMap['ground-chakkars'],
        price: 290,
        comparePrice: 350,
        discount: 17,
        stock: 90,
        isFeatured: true,
        safetyInfo: 'Light with an agarbatti or safety lighter at arm length.',
        specifications: [{ key: 'Pieces per Box', value: '10' }, { key: 'Colors', value: 'Silver, Gold, Crimson' }],
        images: [{ url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Sparklers
      {
        name: '15cm Electric Stone Sparklers (10 Pcs)',
        sku: 'SPK-ELC-01',
        description: 'Smooth burning bright white crackling sparklers ideal for gentle festive celebrations.',
        shortDescription: '10 pcs 15cm stone crackling sparklers.',
        category: catMap['sparklers'],
        price: 80,
        comparePrice: 100,
        discount: 20,
        stock: 300,
        isBestSeller: true,
        safetyInfo: 'Hold by the wire tip at arm length. Drop into a bucket of water after burning.',
        specifications: [{ key: 'Length', value: '15 cm' }, { key: 'Pieces per Box', value: '10' }],
        images: [{ url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: '30cm Royal Golden Sparklers (10 Pcs)',
        sku: 'SPK-GLD-02',
        description: 'Long burning sparklers emitting pure radiant golden stars with zero smoke formula.',
        shortDescription: '10 pcs 30cm long golden sparklers.',
        category: catMap['sparklers'],
        price: 180,
        comparePrice: 220,
        discount: 18,
        stock: 220,
        isFeatured: true,
        safetyInfo: 'Children must use under direct adult supervision. Discard wire responsibly.',
        specifications: [{ key: 'Length', value: '30 cm' }, { key: 'Burn Time', value: '90 seconds each' }],
        images: [{ url: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: '50cm Mega Party Sparklers (5 Pcs)',
        sku: 'SPK-MGA-03',
        description: 'Extra-long giant sparklers creating an unforgettable photo-ready golden arch effect.',
        shortDescription: '5 pcs 50cm mega celebration sparklers.',
        category: catMap['sparklers'],
        price: 320,
        comparePrice: 400,
        discount: 20,
        stock: 75,
        isNewArrival: true,
        safetyInfo: 'Always light in open areas. Keep away from face and clothing.',
        specifications: [{ key: 'Length', value: '50 cm' }, { key: 'Burn Time', value: '180 seconds each' }],
        images: [{ url: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Multi-Color Neon Sparklers (10 Pcs)',
        sku: 'SPK-COL-04',
        description: 'Four vivid neon hues (ruby red, emerald green, royal violet, amber) in one pack.',
        shortDescription: '10 pcs colorful neon sparklers.',
        category: catMap['sparklers'],
        price: 150,
        comparePrice: 180,
        discount: 16,
        stock: 140,
        safetyInfo: 'Store in cool dry conditions away from heat sources.',
        specifications: [{ key: 'Colors', value: 'Red, Green, Violet, Amber' }, { key: 'Pieces per Box', value: '10' }],
        images: [{ url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Flower Pots
      {
        name: 'Flower Pots Special Ashoka (10 Pcs)',
        sku: 'FLW-ASH-01',
        description: 'Classical conical fountains producing majestic 2-meter golden showers of glistening stars.',
        shortDescription: '10 pcs Ashoka golden fountain pots.',
        category: catMap['flower-pots'],
        price: 280,
        comparePrice: 350,
        discount: 20,
        stock: 110,
        isBestSeller: true,
        safetyInfo: 'Keep base firmly upright on ground. Step back 4m immediately after lighting.',
        specifications: [{ key: 'Shower Height', value: '2 meters' }, { key: 'Pieces per Box', value: '10' }],
        images: [{ url: 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Color Koti Giant Flower Pot (5 Pcs)',
        sku: 'FLW-KOT-02',
        description: 'Massive floral fountain that starts with deep ruby red and surges into brilliant silver spray.',
        shortDescription: '5 pcs giant multi-stage color fountains.',
        category: catMap['flower-pots'],
        price: 390,
        comparePrice: 460,
        discount: 15,
        stock: 65,
        isFeatured: true,
        safetyInfo: 'Never lean over the fountain when lighting.',
        specifications: [{ key: 'Shower Height', value: '3.5 meters' }, { key: 'Pieces per Box', value: '5' }],
        images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Tri-Colour Fountain Pot (5 Pcs)',
        sku: 'FLW-TRI-03',
        description: 'Sequential bursts of saffron, white, and emerald green sparkling plumes.',
        shortDescription: '5 pcs patriotic tri-color flower pots.',
        category: catMap['flower-pots'],
        price: 340,
        comparePrice: 400,
        discount: 15,
        stock: 90,
        safetyInfo: 'Ensure flat, stone or paved placement.',
        specifications: [{ key: 'Height', value: '2.5 meters' }, { key: 'Duration', value: '60 seconds' }],
        images: [{ url: 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Crackling Royal King Pot (2 Pcs)',
        sku: 'FLW-CRK-04',
        description: 'Fountain begins as smooth gold and finishes with an immense crackling titanium silver blast.',
        shortDescription: '2 pcs titanium crackling king fountains.',
        category: catMap['flower-pots'],
        price: 520,
        comparePrice: 600,
        discount: 13,
        stock: 35,
        isNewArrival: true,
        safetyInfo: 'Ear protection recommended for nearby viewers.',
        specifications: [{ key: 'Pieces per Box', value: '2' }, { key: 'Effect', value: 'Golden spray to Titanium Crackle' }],
        images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Rockets & Missiles
      {
        name: 'Whistling Moon Rocket (10 Pcs)',
        sku: 'RCK-MSN-01',
        description: 'Screaming ascent leading to a high altitude report with glittering emerald starburst.',
        shortDescription: '10 pcs whistling sky rockets.',
        category: catMap['rockets-missiles'],
        price: 360,
        comparePrice: 450,
        discount: 20,
        stock: 95,
        isBestSeller: true,
        safetyInfo: 'Launch vertically from a dedicated rocket launch pipe or stable bottle.',
        specifications: [{ key: 'Pieces per Box', value: '10' }, { key: 'Altitude', value: '40 meters' }],
        images: [{ url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Parachute Sky Rocket (5 Pcs)',
        sku: 'RCK-PAR-02',
        description: 'Ascends high into the stratosphere and releases a glowing parachute floating down softly.',
        shortDescription: '5 pcs gentle parachute descending rockets.',
        category: catMap['rockets-missiles'],
        price: 480,
        comparePrice: 550,
        discount: 12,
        stock: 40,
        isFeatured: true,
        safetyInfo: 'Only launch in broad open fields with no overhead trees or cables.',
        specifications: [{ key: 'Pieces per Box', value: '5' }, { key: 'Altitude', value: '50 meters' }],
        images: [{ url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Baby Whistling Missile Battery (25 Shots)',
        sku: 'RCK-MSL-03',
        description: 'Rapid sequential battery firing 25 screamer missiles high into the sky.',
        shortDescription: '25 shots rapid whistling missile cake.',
        category: catMap['rockets-missiles'],
        price: 310,
        comparePrice: 380,
        discount: 18,
        stock: 120,
        safetyInfo: 'Support sides with bricks to avoid tipping over.',
        specifications: [{ key: 'Shots', value: '25' }, { key: 'Firing Style', value: 'Rapid succession' }],
        images: [{ url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Galaxy Thunder Skyrocket (3 Pcs)',
        sku: 'RCK-GLX-04',
        description: 'Heavy payload rockets bursting into multi-colored peony stars with a thunderous boom.',
        shortDescription: '3 pcs heavy payload multi-peony rockets.',
        category: catMap['rockets-missiles'],
        price: 590,
        comparePrice: 700,
        discount: 15,
        stock: 30,
        safetyInfo: 'Strictly for open field night sky shows.',
        specifications: [{ key: 'Pieces per Box', value: '3' }, { key: 'Altitude', value: '65 meters' }],
        images: [{ url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Fancy Aerial Cakes
      {
        name: '12 Shots Spectacular Multi-Color Aerial Cake',
        sku: 'CAK-12S-01',
        description: 'Consecutive sky bursts showering red, green, silver chrysanthemums and golden brocades.',
        shortDescription: '12-shot professional night sky aerial repeater.',
        category: catMap['fancy-aerial-cakes'],
        price: 850,
        comparePrice: 1000,
        discount: 15,
        stock: 50,
        isBestSeller: true,
        isFeatured: true,
        safetyInfo: 'Keep on flat ground. Secure with weights. Keep 25m audience perimeter.',
        specifications: [{ key: 'Number of Shots', value: '12' }, { key: 'Burst Diameter', value: '15 meters' }],
        images: [{ url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: '30 Shots Golden Waterfall Grand Cake',
        sku: 'CAK-30S-02',
        description: 'Grand celebration battery of 30 aerial shots ending in a dramatic weeping willow golden waterfall effect.',
        shortDescription: '30-shot luxury golden willow aerial display.',
        category: catMap['fancy-aerial-cakes'],
        price: 1850,
        comparePrice: 2200,
        discount: 16,
        stock: 25,
        isNewArrival: true,
        safetyInfo: 'Never position body directly over tubes. Light fuse and retire 30m.',
        specifications: [{ key: 'Number of Shots', value: '30' }, { key: 'Duration', value: '45 seconds' }],
        images: [{ url: 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: '50 Shots Sky Sensation Mega Finale',
        sku: 'CAK-50S-03',
        description: 'The crowning centerpiece for major weddings and festivals. 50 rapid aerial bursts filling the entire sky with vivid neon color palettes.',
        shortDescription: '50-shot ultimate finale aerial fireworks cake.',
        category: catMap['fancy-aerial-cakes'],
        price: 3400,
        comparePrice: 4000,
        discount: 15,
        stock: 15,
        isFeatured: true,
        safetyInfo: 'Commercial grade celebration cake. Strictly open grounds.',
        specifications: [{ key: 'Number of Shots', value: '50' }, { key: 'Duration', value: '70 seconds' }],
        images: [{ url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Color Pearls 7-Shot Aerial Candle',
        sku: 'CAK-PRL-04',
        description: 'Vertical handheld or ground-mounted tube throwing seven huge luminous colored pearls into the sky.',
        shortDescription: '7-shot Roman pearl candle.',
        category: catMap['fancy-aerial-cakes'],
        price: 210,
        comparePrice: 250,
        discount: 16,
        stock: 160,
        safetyInfo: 'Bury lower half in sand bucket before lighting.',
        specifications: [{ key: 'Shots', value: '7' }, { key: 'Type', value: 'Roman Candle' }],
        brand: 'Standard Fireworks',
        images: [{ url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Bombs & Sound Crackers
      {
        name: 'Hydro Green Atom Bomb (10 Pcs)',
        sku: 'BMB-HYD-01',
        description: 'Heavy caliber green sound cracker generating an authentic single thunderous report under certified safe acoustic limits.',
        shortDescription: '10 pcs heavy report green atom bombs.',
        category: catMap['bombs'],
        brand: 'Standard Fireworks',
        price: 180,
        comparePrice: 450,
        discount: 60,
        stock: 140,
        isBestSeller: true,
        safetyInfo: 'Place firmly on open ground. Light wick end and immediately retire to 15m perimeter.',
        specifications: [{ key: 'Pieces per Box', value: '10' }, { key: 'Sound Level', value: 'Certified <125dB at 4m' }],
        images: [{ url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Digital King Sound Bomb (5 Pcs)',
        sku: 'BMB-DGT-02',
        description: 'Premium paper-wrapped sound cracker delivering crisp acoustic clarity with negligible smoke.',
        shortDescription: '5 pcs digital king sound reports.',
        category: catMap['bombs'],
        brand: 'Anil Celebrations',
        price: 220,
        comparePrice: 500,
        discount: 56,
        stock: 90,
        isNewArrival: true,
        safetyInfo: 'Ensure clear open field. Never light in hand.',
        specifications: [{ key: 'Pieces per Box', value: '5' }, { key: 'Type', value: 'Paper Wrap Digital Sound' }],
        images: [{ url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Gift Boxes & Family Combos
      {
        name: 'Anandam Family Festive Assortment Box (32 Items)',
        sku: 'GFT-AND-01',
        description: 'Complete curated assortment for family celebrations. Includes sparklers, flower pots, ground chakkars, pencil torches, and mini sky shots in a luxury presentation box.',
        shortDescription: '32 assorted celebratory items in a luxury gift box.',
        category: catMap['gift-boxes'],
        brand: 'Ayyan Fireworks',
        price: 1450,
        comparePrice: 3200,
        discount: 55,
        stock: 65,
        isBestSeller: true,
        isFeatured: true,
        safetyInfo: 'Contains diverse cracker varieties. Follow individual product instructions inside box.',
        specifications: [{ key: 'Total Varieties', value: '32 Items' }, { key: 'Packaging', value: 'Festive Hardboard Gift Box' }],
        images: [{ url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Royal Diamond VIP Celebration Mega Hamper (55 Items)',
        sku: 'GFT-ROY-02',
        description: 'The supreme luxury collection for grand weddings, Diwali festivities, and corporate gifting. Packed with premium aerial repeaters, deluxe fountains, and multicolor spinners.',
        shortDescription: '55 grand items including multi-shot cakes and deluxe pots.',
        category: catMap['gift-boxes'],
        brand: 'Standard Fireworks',
        price: 2950,
        comparePrice: 6500,
        discount: 54,
        stock: 35,
        isFeatured: true,
        safetyInfo: 'Adult handling only. Complete user advisory guide included inside.',
        specifications: [{ key: 'Total Varieties', value: '55 Items' }, { key: 'Ideal For', value: 'Extended Family & Community Celebrations' }],
        images: [{ url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Fancy Items & Novelties
      {
        name: 'Dancing Peacock Feather Multi-Color Fountain',
        sku: 'FNC-PCK-01',
        description: 'Breathtaking floor-level display that sprays emerald green, sapphire blue, and golden sparks resembling an open peacock feather fan.',
        shortDescription: 'Spectacular peacock feather fountain display.',
        category: catMap['fancy-items'],
        brand: 'Vanitha Fireworks',
        price: 340,
        comparePrice: 750,
        discount: 55,
        stock: 85,
        isNewArrival: true,
        safetyInfo: 'Keep 6 meters clear viewing distance on hard, flat ground.',
        specifications: [{ key: 'Height', value: '3 meters' }, { key: 'Duration', value: '50 seconds' }],
        images: [{ url: 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Twinkling Butterfly Wings Aerial Spinner (5 Pcs)',
        sku: 'FNC-BTF-02',
        description: 'Ascends into the air with a gentle whistling buzz while spinning and glowing with multicolored wings before soft descent.',
        shortDescription: '5 pcs ascending aerial butterfly spinners.',
        category: catMap['fancy-items'],
        brand: 'Sony Fireworks',
        price: 280,
        comparePrice: 600,
        discount: 53,
        stock: 110,
        safetyInfo: 'Light on flat stone or ground. Stand 5m back.',
        specifications: [{ key: 'Pieces per Box', value: '5' }, { key: 'Altitude', value: '12 meters' }],
        images: [{ url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Multi Sound Crackers
      {
        name: 'Classic 2-Sound Diwali Crackers (10 Pcs)',
        sku: 'SND-2SD-01',
        description: 'Traditional two-beat celebratory crackers producing a distinct initial pop followed by an echoing report.',
        shortDescription: '10 pcs rhythmically synchronized two-sound crackers.',
        category: catMap['multi-sound-crackers'],
        brand: 'Anil Celebrations',
        price: 160,
        comparePrice: 350,
        discount: 54,
        stock: 120,
        safetyInfo: 'Place singly on clear floor. Maintain 8m distance.',
        specifications: [{ key: 'Pieces per Box', value: '10' }, { key: 'Sound Beats', value: '2 Consecutive Reports' }],
        images: [{ url: 'https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Super 3-Sound Deluxe Carnival Crackers (10 Pcs)',
        sku: 'SND-3SD-02',
        description: 'High-grade Sivakasi composition generating three consecutive resonant reports in rapid succession.',
        shortDescription: '10 pcs triple report festive crackers.',
        category: catMap['multi-sound-crackers'],
        brand: 'Sri Krishna Fireworks',
        price: 240,
        comparePrice: 520,
        discount: 54,
        stock: 75,
        isBestSeller: true,
        safetyInfo: 'Outdoor open spaces only.',
        specifications: [{ key: 'Pieces per Box', value: '10' }, { key: 'Sound Beats', value: '3 Rapid Reports' }],
        images: [{ url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },

      // Kids Crackers & Novelties
      {
        name: 'Magic Pop-Pop Snappers (50 Small Boxes)',
        sku: 'KID-POP-01',
        description: 'Fun, completely safe pressure-activated paper snappers that pop when thrown against any hard surface. No flame or lighting required.',
        shortDescription: '50 boxes of classic pressure-activated throw snappers.',
        category: catMap['kids-crackers'],
        brand: 'Standard Fireworks',
        price: 120,
        comparePrice: 250,
        discount: 52,
        stock: 200,
        isBestSeller: true,
        safetyInfo: 'Safe for children under adult supervision. Do not put in mouth.',
        specifications: [{ key: 'Boxes per Pack', value: '50 Boxes' }, { key: 'Activation', value: 'Impact / Throw' }],
        images: [{ url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      },
      {
        name: 'Color Flash Electric Sparkler Pencils (10 Pcs)',
        sku: 'KID-PNC-02',
        description: 'Low-smoke handheld pencil sparklers producing a bright, gentle golden glow with zero hot ash drop.',
        shortDescription: '10 pcs low-smoke golden sparkler pencils.',
        category: catMap['kids-crackers'],
        brand: 'Ayyan Fireworks',
        price: 95,
        comparePrice: 200,
        discount: 52,
        stock: 180,
        safetyInfo: 'Hold at arm length. Drop spent wire in water bucket immediately after use.',
        specifications: [{ key: 'Pieces per Box', value: '10' }, { key: 'Smoke Level', value: 'CSIR-NEERI Green Certified Low Smoke' }],
        images: [{ url: 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?w=600&auto=format&fit=crop&q=80', isPrimary: true }]
      }
    ];

    for (const p of productsData) {
      await Product.create(p);
    }

    // Update category counts
    for (const cat of categories) {
      const count = await Product.countDocuments({ category: cat._id });
      cat.productCount = count;
      await cat.save();
    }

    // 4. Seed Coupons
    console.log('[Seed] Seeding Coupons...');
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);

    await Coupon.create([
      {
        code: 'WELCOME10',
        description: '10% discount on your first festive order',
        type: 'percentage',
        value: 10,
        minOrderAmount: 500,
        maxDiscount: 300,
        startDate: now,
        endDate: futureDate,
        usageLimit: 1000,
        perUserLimit: 1,
        isActive: true
      },
      {
        code: 'DIWALI20',
        description: '20% festive discount on grand orders above ₹1,000',
        type: 'percentage',
        value: 20,
        minOrderAmount: 1000,
        maxDiscount: 1000,
        startDate: now,
        endDate: futureDate,
        usageLimit: 500,
        perUserLimit: 2,
        isActive: true
      },
      {
        code: 'FLAT100',
        description: 'Flat ₹100 instant discount on orders above ₹500',
        type: 'fixed',
        value: 100,
        minOrderAmount: 500,
        startDate: now,
        endDate: futureDate,
        usageLimit: 200,
        perUserLimit: 1,
        isActive: true
      }
    ]);

    // 5. Seed Site Content (Banners, FAQs, Policies, Settings)
    console.log('[Seed] Seeding Website Content...');
    await SiteContent.create([
      // Banners
      {
        type: 'banner',
        title: 'Light Up Your Celebrations',
        subtitle: 'Premium, certified green fireworks delivered safely with pristine quality.',
        link: '/products.html',
        buttonText: 'Explore Collection',
        image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1400&auto=format&fit=crop&q=80',
        displayOrder: 1,
        isActive: true
      },
      {
        type: 'banner',
        title: 'Spectacular Night Sky Aerial Cakes',
        subtitle: 'Experience breathtaking synchronized color bursts from Sivakasi masters.',
        link: '/products.html?category=fancy-aerial-cakes',
        buttonText: 'Shop Aerial Cakes',
        image: 'https://images.unsplash.com/photo-1531747056595-07f6cbbe10ad?w=1400&auto=format&fit=crop&q=80',
        displayOrder: 2,
        isActive: true
      },
      {
        type: 'banner',
        title: 'Safety First: Certified Green Crackers',
        subtitle: 'Reduced emissions, low smoke, and 100% compliant with PESO regulations.',
        link: '/faq.html?policy=safety',
        buttonText: 'Safety Standards',
        image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1400&auto=format&fit=crop&q=80',
        displayOrder: 3,
        isActive: true
      },

      // Announcement
      {
        type: 'announcement',
        title: 'Festival Season Dispatch Open!',
        subtitle: 'Place your bookings early to ensure confirmed doorstep transport before festival dates.',
        displayOrder: 1,
        isActive: true
      },

      // FAQs
      {
        type: 'faq',
        title: 'Are all products certified and legal?',
        content: 'Yes, 100% of our products are certified by PESO (Petroleum and Explosives Safety Organisation) and CSIR-NEERI as recognized Green Crackers with valid QR codes.',
        displayOrder: 1,
        isActive: true
      },
      {
        type: 'faq',
        title: 'How are firecrackers packaged and shipped?',
        content: 'Orders are packed in specialized moisture-proof, explosion-resistant cardboard corrugated packaging in compliance with hazardous materials transport safety norms.',
        displayOrder: 2,
        isActive: true
      },
      {
        type: 'faq',
        title: 'What payment modes are accepted?',
        content: 'We support all major UPI payment apps including Google Pay, PhonePe, Paytm, and BHIM UPI with instant order confirmation.',
        displayOrder: 3,
        isActive: true
      },
      {
        type: 'faq',
        title: 'What is your cancellation and refund policy?',
        content: 'Orders can be cancelled before dispatch directly from your account page for a full refund. Once dispatched via specialized transport, cancellations are subject to return verification.',
        displayOrder: 4,
        isActive: true
      },
      {
        type: 'faq',
        title: 'Can children handle these fireworks?',
        content: 'Children should only handle small sparklers or flower pots under vigilant adult supervision. Always keep water buckets and safety blankets ready on site.',
        displayOrder: 5,
        isActive: true
      },

      // Policies
      {
        type: 'policy',
        title: 'Fireworks Safety Guidelines',
        content: `<h3>Mandatory Safety Instructions</h3>
<ul>
  <li>Always buy authorized Green Crackers with authentic PESO approval marks.</li>
  <li>Light crackers outdoors only in open spaces away from electrical poles, dry trees, and parked vehicles.</li>
  <li>Wear snug cotton clothes while handling fireworks. Avoid synthetic or loose garments.</li>
  <li>Always maintain two buckets of clean water and dry sand nearby for emergencies.</li>
  <li>Never attempt to reignite a firecracker that failed to ignite initially. Wait 15 minutes, then soak it in water.</li>
  <li>Store unused boxes in cool, dry areas far from cooking stoves or open flames.</li>
</ul>`,
        metadata: { policyType: 'safety' },
        isActive: true
      },
      {
        type: 'policy',
        title: 'Privacy Policy',
        content: `<p>We respect your privacy. Personal data collected during registration and checkout is utilized solely for fulfillment, account security, and authorized support communications. We never sell customer records to external brokers.</p>`,
        metadata: { policyType: 'privacy' },
        isActive: true
      },
      {
        type: 'policy',
        title: 'Terms and Conditions',
        content: `<p>Purchasers must be at least 18 years old. Fireworks transactions are subject to local district administration permissions and storage guidelines. Resale without an explosives license is strictly prohibited.</p>`,
        metadata: { policyType: 'terms' },
        isActive: true
      },
      {
        type: 'policy',
        title: 'Delivery & Transport Policy',
        content: `<p>Due to safety transport regulations, fireworks are fulfilled using approved surface cargo partners. Delivery timelines typically range from 3 to 7 working days depending on state destination.</p>`,
        metadata: { policyType: 'delivery' },
        isActive: true
      },
      {
        type: 'policy',
        title: 'Refund Policy',
        content: `<p>Damaged or missing items reported within 48 hours of delivery with unboxing video verification qualify for immediate replacement or full refund to the original payment method.</p>`,
        metadata: { policyType: 'refund' },
        isActive: true
      },

      // Settings
      {
        type: 'setting',
        title: 'Global Store Settings',
        metadata: {
          siteName: 'Firecrackers E-Commerce',
          siteDescription: 'Modern Minimal Firecrackers Online Store',
          contactEmail: 'support@firecrackers-store.com',
          contactPhone: '+91 98765 43210',
          currencySymbol: '₹',
          taxRate: '0',
          shippingCharge: '100',
          freeShippingThreshold: '1500',
          orderPrefix: 'ORD',
          maintenanceMode: 'false',
          allowedStates: 'Tamil Nadu, Karnataka, Andhra Pradesh, Maharashtra, Kerala'
        },
        isActive: true
      }
    ]);

    // 6. Seed Sample Address & Order for Rahul Sharma
    console.log('[Seed] Seeding Sample Address & Orders...');
    const address = await Address.create({
      user: customer._id,
      name: 'Rahul Sharma',
      phone: '+91 98765 43210',
      addressLine1: 'Flat 402, Lotus Residency, MG Road',
      addressLine2: 'Near Central Park',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      isDefault: true,
      label: 'home'
    });

    const sampleProduct = await Product.findOne({ sku: 'CHK-DLX-01' });
    if (sampleProduct) {
      const order = await Order.create({
        orderNumber: 'ORD-20241029-10001',
        user: customer._id,
        items: [
          {
            product: sampleProduct._id,
            name: sampleProduct.name,
            sku: sampleProduct.sku,
            quantity: 2,
            price: sampleProduct.price,
            image: sampleProduct.images[0].url
          }
        ],
        shippingAddress: {
          name: address.name,
          phone: address.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          country: address.country
        },
        subtotal: sampleProduct.price * 2,
        discount: 0,
        tax: 0,
        shippingCharge: 100,
        total: (sampleProduct.price * 2) + 100,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'upi_qr',
        statusHistory: [
          { status: 'pending', note: 'Order initiated' },
          { status: 'confirmed', note: 'Payment verified via Google Pay / UPI QR' }
        ]
      });

      await Payment.create({
        order: order._id,
        user: customer._id,
        transactionId: 'UPI-MOCK-SEED-001',
        upiTransactionId: 'UPI-MOCK-SEED-001',
        amount: order.total,
        currency: 'INR',
        method: 'Google Pay / UPI QR',
        status: 'captured'
      });
    }

    console.log('\n=========================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
    console.log('=========================================');
    console.log('Admin Login:');
    console.log('  Email:    admin@firecrackers.com');
    console.log('  Password: Password@123');
    console.log('Super Admin Login:');
    console.log('  Email:    superadmin@firecrackers.com');
    console.log('  Password: Password@123');
    console.log('Customer Login:');
    console.log('  Email:    customer@example.com');
    console.log('  Password: Password@123');
    console.log('=========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedDatabase();

