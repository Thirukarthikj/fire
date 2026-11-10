require('dotenv').config();
const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/firecrackers_ecommerce';

async function viewDb() {
  try {
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    const target = (process.argv[2] || 'all').toLowerCase();

    console.log('\n======================================================');
    console.log('       🔥 FIRECRACKERS MONGODB DATABASE VIEWER');
    console.log(`       URI: ${mongoUri}`);
    console.log(`       Database: ${db.databaseName}`);
    console.log('======================================================\n');

    // 1. Show Collections & Counts
    const collections = await db.listCollections().toArray();
    console.log('📁 COLLECTIONS OVERVIEW:');
    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`   • ${c.name.padEnd(18)} : ${count} documents`);
    }
    console.log('');

    // 2. Orders
    if (target === 'all' || target === 'orders') {
      console.log('📦 ORDERS:');
      const orders = await db.collection('orders').find().sort({ createdAt: -1 }).limit(10).toArray();
      if (orders.length === 0) {
        console.log('   (No orders placed yet)');
      } else {
        orders.forEach((o, i) => {
          console.log(`   [#${i + 1}] Order Number: ${o.orderNumber || o._id}`);
          console.log(`       Date:     ${new Date(o.createdAt).toLocaleString('en-IN')}`);
          console.log(`       Customer: ${o.shippingAddress?.name || 'N/A'} (Phone: ${o.shippingAddress?.phone || 'N/A'})`);
          console.log(`       Address:  ${o.shippingAddress?.addressLine1 || ''}, ${o.shippingAddress?.city || ''}, ${o.shippingAddress?.state || ''} - ${o.shippingAddress?.pincode || ''}`);
          console.log(`       Status:   ${o.status.toUpperCase()} | Payment: ${o.paymentStatus?.toUpperCase()}`);
          console.log(`       Total:    ₹${o.total}`);
          console.log(`       Items (${o.items?.length || 0}):`);
          (o.items || []).forEach(it => {
            console.log(`         - ${it.name} × ${it.quantity} @ ₹${it.price} = ₹${it.price * it.quantity}`);
          });
          console.log('       -----------------------------------------------');
        });
      }
      console.log('');
    }

    // 3. Users
    if (target === 'all' || target === 'users') {
      console.log('👥 REGISTERED USERS:');
      const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
      users.forEach((u, i) => {
        console.log(`   [#${i + 1}] ${u.name.padEnd(20)} | Email: ${u.email.padEnd(28)} | Role: ${u.role.padEnd(11)} | Phone: ${u.phone || 'N/A'}`);
      });
      console.log('');
    }

    // 4. Inquiries / Support Tickets
    if (target === 'all' || target === 'inquiries' || target === 'tickets') {
      console.log('📩 CONTACT INQUIRIES & SUPPORT TICKETS:');
      const tickets = await db.collection('supporttickets').find().sort({ createdAt: -1 }).limit(5).toArray();
      if (tickets.length === 0) {
        console.log('   (No inquiries logged yet)');
      } else {
        tickets.forEach((t, i) => {
          console.log(`   [#${i + 1}] Ticket: ${t.ticketNumber} | Category: ${t.category} | Status: ${t.status}`);
          console.log(`       From:    ${t.guestName || 'User'} (${t.guestEmail || 'N/A'}, Phone: ${t.guestPhone || 'N/A'})`);
          console.log(`       Subject: ${t.subject}`);
          if (t.messages && t.messages[0]) {
            console.log(`       Message: "${t.messages[0].message}"`);
          }
          console.log('       -----------------------------------------------');
        });
      }
      console.log('');
    }

    // 5. Reviews
    if (target === 'all' || target === 'reviews') {
      console.log('⭐ CUSTOMER REVIEWS:');
      const reviews = await db.collection('reviews').find().sort({ createdAt: -1 }).limit(5).toArray();
      if (reviews.length === 0) {
        console.log('   (No reviews submitted yet)');
      } else {
        reviews.forEach((r, i) => {
          console.log(`   [#${i + 1}] ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} "${r.title}"`);
          console.log(`       By:      ${r.userName} (${r.userLocation})`);
          console.log(`       Comment: "${r.comment}"`);
          console.log('       -----------------------------------------------');
        });
      }
      console.log('');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Database viewer error:', err.message);
    process.exit(1);
  }
}

viewDb();

