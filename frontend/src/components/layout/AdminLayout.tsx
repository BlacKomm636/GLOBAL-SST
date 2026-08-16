import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const { email, logout } = useAuth();

  return (
    <div>
      <header style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px' }}>
          <strong>Certifica · Panel Admin</strong>
          <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <NavLink to="/admin">Dashboard</NavLink>
            <NavLink to="/admin/institutions">Instituciones</NavLink>
            <NavLink to="/admin/courses">Cursos</NavLink>
            <NavLink to="/admin/certificates">Certificados</NavLink>
            <span style={{ color: '#64748b', fontSize: 14 }}>{email}</span>
            <button onClick={logout} className="btn-primary" style={{ background: '#64748b' }}>
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
