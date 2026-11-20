require('dotenv').config();
const bcrypt = require('bcrypt');
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const MenuItem = require('./models/MenuItem');

const DEMO_USERS = [
  {
    name: 'Aarav Sharma',
    email: 'admin@canteen.edu',
    password: 'AdminPassword123!',
    role: 'admin',
  },
  {
    name: 'Priya Nair',
    email: 'staff@canteen.edu',
    password: 'StaffPassword123!',
    role: 'staff',
  },
  {
    name: 'Rohan Verma',
    email: 'rohan@canteen.edu',
    password: 'StudentPassword123!',
    role: 'student',
  },
  {
    name: 'Ananya Iyer',
    email: 'ananya@canteen.edu',
    password: 'StudentPassword123!',
    role: 'student',
  },
];

const MENU_ITEMS = [
  {
    name: 'Masala Dosa',
    category: 'Breakfast',
    price: 50,
    imageUrl: 'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
  },
  {
    name: 'Idli Vada Combo',
    category: 'Breakfast',
    price: 40,
    imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
  },
  {
    name: 'Poha',
    category: 'Breakfast',
    price: 30,
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    isAvailable: false,
  },
  {
    name: 'Veg Biryani',
    category: 'Meals',
    price: 90,
    imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
  },
  {
    name: 'Paneer Butter Masala & Naan',
    category: 'Meals',
    price: 120,
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
  },
  {
    name: 'Rajma Chawal',
    category: 'Meals',
    price: 80,
    imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
  },
  {
    name: 'Samosa (2 pcs)',
    category: 'Snacks',
    price: 25,
    imageUrl: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
  },
  {
    name: 'Vada Pav',
    category: 'Snacks',
    price: 20,
    imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
  },
  {
    name: 'Filter Coffee',
    category: 'Beverages',
    price: 20,
    imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
  },
  {
    name: 'Cold Coffee',
    category: 'Beverages',
    price: 45,
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
    isAvailable: false,
  },
];

async function seed() {
  await connectDB();

  await User.deleteMany({});
  await MenuItem.deleteMany({});

  const userDocs = await Promise.all(
    DEMO_USERS.map(async (u) => ({
      name: u.name,
      email: u.email,
      passwordHash: await bcrypt.hash(u.password, 10),
      role: u.role,
    }))
  );

  await User.insertMany(userDocs);
  await MenuItem.insertMany(MENU_ITEMS);

  console.log('Seed completed successfully.');
  console.log('Demo Accounts:');
  DEMO_USERS.forEach((u) => {
    console.log(`  [${u.role}] ${u.email} / ${u.password}`);
  });
  console.log(`Seeded ${MENU_ITEMS.length} menu items.`);

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
