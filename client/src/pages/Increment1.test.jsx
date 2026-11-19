import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoginPage from './LoginPage';
import MenuPage from './MenuPage';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  getHomePathForRole: (role) => ({
    student: '/menu',
    staff: '/staff',
    admin: '/admin/menu',
  }[role] || '/menu'),
}));
vi.mock('../context/CartContext', () => ({ useCart: vi.fn() }));
vi.mock('../components/Layout', () => ({
  default: ({ children }) => <>{children}</>,
}));

function CurrentPath() {
  const { pathname } = useLocation();
  return <output aria-label="Current path">{pathname}</output>;
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/menu" element={<p>Student menu</p>} />
        <Route path="/staff" element={<p>Staff dashboard</p>} />
        <Route path="/admin/menu" element={<p>Admin menu</p>} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>
  );
}

function renderMenu() {
  return render(
    <MemoryRouter>
      <MenuPage />
    </MemoryRouter>
  );
}

describe('Increment 1: login and menu UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: null, loading: false, login: vi.fn() });
    useCart.mockReturnValue({ addItem: vi.fn(), items: [] });
  });

  it('validates required and malformed login fields without submitting', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'bad-email');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(useAuth().login).not.toHaveBeenCalled();
  });

  it.each([
    ['student', '/menu', 'Student menu'],
    ['staff', '/staff', 'Staff dashboard'],
    ['admin', '/admin/menu', 'Admin menu'],
  ])('routes a successful %s login to %s', async (role, path, landingPage) => {
    const login = vi.fn().mockResolvedValue({ role });
    useAuth.mockReturnValue({ user: null, loading: false, login });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), '  user@canteen.edu ');
    await user.type(screen.getByLabelText('Password'), 'pass123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(landingPage)).toBeInTheDocument();
    expect(screen.getByLabelText('Current path')).toHaveTextContent(path);
    expect(login).toHaveBeenCalledWith('user@canteen.edu', 'pass123');
  });

  it('filters menu items by category and prevents adding unavailable dishes', async () => {
    const addItem = vi.fn();
    useCart.mockReturnValue({ addItem, items: [] });
    api.get.mockImplementation((_url, config) => Promise.resolve({
      data: config?.params?.category === 'Snacks'
        ? { items: [{ _id: 'snack', name: 'Samosa', category: 'Snacks', price: 25, isAvailable: true }], categories: ['Snacks', 'Meals'] }
        : {
            items: [
              { _id: 'snack', name: 'Samosa', category: 'Snacks', price: 25, isAvailable: true },
              { _id: 'poha', name: 'Poha', category: 'Breakfast', price: 30, isAvailable: false },
            ],
            categories: ['Snacks', 'Meals'],
          },
    }));
    const user = userEvent.setup();
    renderMenu();

    expect(await screen.findByText('Samosa')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to cart' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Poha/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Snacks' }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/menu', { params: { category: 'Snacks' } }));
    expect(screen.queryByText('Poha')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart' }));
    expect(addItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Samosa' }));
  });

  it('shows a menu load error and retries the request', async () => {
    api.get
      .mockRejectedValueOnce({ response: { data: { message: 'Menu unavailable' } } })
      .mockResolvedValueOnce({ data: { items: [], categories: [] } });
    renderMenu();

    expect(await screen.findByRole('alert')).toHaveTextContent('Menu unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No menu items found.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
