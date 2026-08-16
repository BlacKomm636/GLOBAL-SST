import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import InstitutionsPage from '../pages/InstitutionsPage';
import CoursesPage from '../pages/CoursesPage';
import CertificatesPage from '../pages/CertificatesPage';
import VerifyPage from '../pages/VerifyPage';
import NotFoundPage from '../pages/NotFoundPage';
import AdminLayout from '../components/layout/AdminLayout';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Publicas */}
      <Route path="/" element={<VerifyPage />} />
      <Route path="/verify/:code" element={<VerifyPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Panel Admin protegido */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="institutions" element={<InstitutionsPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
