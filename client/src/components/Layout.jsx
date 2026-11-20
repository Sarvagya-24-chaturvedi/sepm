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
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-6">
            <Link
              to={user ? getHomePathForRole(user.role) : '/login'}
              className="truncate whitespace-nowrap text-base font-bold tracking-tight text-slate-900 sm:text-lg"
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
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="text-right leading-tight">
                <p className="max-w-18 truncate text-xs font-medium text-slate-900 min-[380px]:max-w-25 sm:max-w-none sm:text-sm">
                  {user.name}
                </p>
                <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-800 min-[380px]:inline-block">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:px-3 sm:text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {links.length > 0 && (
          <nav
            aria-label="Mobile navigation"
            className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 px-3 py-2 sm:hidden"
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

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}
