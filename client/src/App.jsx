import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getHomePathForRole } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MenuPage from './pages/MenuPage';
import AdminMenuPage from './pages/AdminMenuPage';
import StaffDashboard from './pages/StaffDashboard'; // Increment 3 (replaces StaffDashboardPage)
import MyOrders from './pages/MyOrders'; // Increment 3
import RecordsPage from './pages/RecordsPage'; // Increment 4
import CartPage from './pages/CartPage';
import { CartProvider } from './context/CartContext';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-600">Loading...</p>
      </div>
    );
  }
  return <Navigate to={user ? getHomePathForRole(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/menu"
              element={
                <ProtectedRoute allowedRoles={['student', 'staff', 'admin']}>
                  <MenuPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <MyOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={['staff']}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/records"
              element={
                <ProtectedRoute allowedRoles={['staff', 'admin']}>
                  <RecordsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/menu"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminMenuPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
