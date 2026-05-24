import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './AuthContext';
import InscriptionPage from './pages/InscriptionPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PreachersListPage from './pages/PreachersListPage';
import PreacherDetailPage from './pages/PreacherDetailPage';
import PreacherEditPage from './pages/PreacherEditPage';
import AdminLayout from './components/AdminLayout';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/inscription" replace />} />
          <Route path="/inscription" element={<InscriptionPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="predicateurs" element={<PreachersListPage />} />
            <Route path="predicateurs/:id" element={<PreacherDetailPage />} />
            <Route path="predicateurs/:id/edit" element={<PreacherEditPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </AuthProvider>
  );
}
