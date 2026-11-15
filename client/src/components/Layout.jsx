import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, getHomePathForRole } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const ROLE_LINKS = {
  student: [
    { to: '/menu', label: 'Menu' },
    { to: '/orders', label: 'My Orders' },
  ],
  staff: [
    { to: '/staff', label: 'Staff Dashboard' },
    { to: '/records', label: 'Records' },
    { to: '/menu', label: 'Menu' },
  ],
  admin: [
    { to: '/admin/menu', label: 'Admin Menu' },
    { to: '/records', label: 'Records' },
    { to: '/menu', label: 'Menu View' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { itemCount } = useCart();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const links = user
    ? [...(ROLE_LINKS[user.role] || []), ...(user.role === 'student' ? [{ to: '/cart', label: `Cart${itemCount ? ` (${itemCount})` : ''}` }] : [])]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              to={user ? getHomePathForRole(user.role) : '/login'}
              className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap"
            >
              College Canteen
            </Link>

            <nav aria-label="Primary navigation" className="hidden sm:flex items-center gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-slate-900 truncate max-w-[140px] sm:max-w-none">
                  {user.name}
                </p>
                <span className="inline-block text-xs font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {links.length > 0 && (
          <nav
            aria-label="Mobile navigation"
            className="sm:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto"
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${isActive
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
