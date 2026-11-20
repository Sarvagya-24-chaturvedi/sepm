process.env.JWT_SECRET = 'increment-one-functional-test-secret';

jest.mock('../src/models/User');
jest.mock('../src/models/MenuItem');
jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const User = require('../src/models/User');
const MenuItem = require('../src/models/MenuItem');

const studentToken = jwt.sign(
  { sub: '507f1f77bcf86cd799439011', name: 'Student', role: 'student' },
  process.env.JWT_SECRET
);
const adminToken = jwt.sign(
  { sub: '507f1f77bcf86cd799439012', name: 'Admin', role: 'admin' },
  process.env.JWT_SECRET
);

describe('Increment 1 API: authentication and menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('validates login credentials and returns a secure role session cookie', async () => {
    const user = {
      _id: '507f1f77bcf86cd799439012',
      name: 'Admin',
      email: 'admin@canteen.edu',
      role: 'admin',
      passwordHash: 'stored-hash',
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    bcrypt.compare.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ADMIN@canteen.edu', password: 'secret123' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ name: 'Admin', role: 'admin' });
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Lax/i);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'admin@canteen.edu' });

    const invalid = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email', password: 'secret123' });
    expect(invalid.status).toBe(400);
  });

  test('requires a session to browse the menu and returns category-filtered results', async () => {
    const items = [
      { _id: 'item-1', name: 'Samosa', category: 'Snacks', price: 25, isAvailable: true },
    ];
    MenuItem.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(items) });
    MenuItem.distinct.mockResolvedValue(['Meals', 'Snacks']);

    const unauthenticated = await request(app).get('/api/menu');
    expect(unauthenticated.status).toBe(401);

    const response = await request(app)
      .get('/api/menu?category=Snacks')
      .set('Cookie', `token=${studentToken}`);
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual(items);
    expect(response.body.categories).toEqual(['Meals', 'Snacks']);
    expect(MenuItem.find).toHaveBeenCalledWith({ category: 'Snacks' });
  });

  test('allows admin menu creation with valid fields and rejects student writes', async () => {
    const created = {
      _id: 'item-2',
      name: 'Idli',
      category: 'Breakfast',
      price: 40,
      isAvailable: true,
    };
    MenuItem.create.mockResolvedValue(created);
    const body = {
      name: 'Idli',
      category: 'Breakfast',
      imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0',
      price: 40,
    };

    const forbidden = await request(app)
      .post('/api/menu')
      .set('Cookie', `token=${studentToken}`)
      .send(body);
    expect(forbidden.status).toBe(403);
    expect(MenuItem.create).not.toHaveBeenCalled();

    const invalidImageUrl = await request(app)
      .post('/api/menu')
      .set('Cookie', `token=${adminToken}`)
      .send({ ...body, imageUrl: 'http://example.com/dish.jpg' });
    expect(invalidImageUrl.status).toBe(400);
    expect(MenuItem.create).not.toHaveBeenCalled();

    const response = await request(app)
      .post('/api/menu')
      .set('Cookie', `token=${adminToken}`)
      .send(body);
    expect(response.status).toBe(201);
    expect(response.body.item).toMatchObject(created);
    expect(MenuItem.create).toHaveBeenCalledWith({ ...body, isAvailable: true });
  });
});
