import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

export default function StaffDashboardPage() {
  return (
    <Layout>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
          Increment 1 Placeholder
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          Staff Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xl">
          Order queue and status tracking will be added in upcoming increments.
          In the meantime, you can view the live canteen menu.
        </p>
        <div className="mt-6">
          <Link
            to="/menu"
            className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            View Canteen Menu
          </Link>
        </div>
      </div>
    </Layout>
  );
}
