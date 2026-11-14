import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotAuthorizedPage from '../pages/NotAuthorizedPage';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-600">Checking session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <NotAuthorizedPage />;
  }

  return children;
}
