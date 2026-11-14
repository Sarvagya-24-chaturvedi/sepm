require('dotenv').config();
const bcrypt = require('bcrypt');
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
  { name: 'Masala Dosa', category: 'Breakfast', price: 50, isAvailable: true },
  { name: 'Idli Vada Combo', category: 'Breakfast', price: 40, isAvailable: true },
  { name: 'Poha', category: 'Breakfast', price: 30, isAvailable: false },
  { name: 'Veg Biryani', category: 'Meals', price: 90, isAvailable: true },
  { name: 'Paneer Butter Masala & Naan', category: 'Meals', price: 120, isAvailable: true },
  { name: 'Rajma Chawal', category: 'Meals', price: 80, isAvailable: true },
  { name: 'Samosa (2 pcs)', category: 'Snacks', price: 25, isAvailable: true },
  { name: 'Vada Pav', category: 'Snacks', price: 20, isAvailable: true },
  { name: 'Filter Coffee', category: 'Beverages', price: 20, isAvailable: true },
  { name: 'Cold Coffee', category: 'Beverages', price: 45, isAvailable: false },
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
