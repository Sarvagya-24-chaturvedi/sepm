import { Link } from 'react-router-dom';
import { useAuth, getHomePathForRole } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function NotAuthorizedPage() {
  const { user } = useAuth();
  const homePath = user ? getHomePathForRole(user.role) : '/login';

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-10 rounded-2xl border border-red-200 bg-white p-6 sm:p-8 text-center shadow-xs">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-700">
          403 Forbidden
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Not Authorized
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to view this page with your current role.
        </p>
        <Link
          to={homePath}
          className="mt-6 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Go to Your Dashboard
        </Link>
      </div>
    </Layout>
  );
}
