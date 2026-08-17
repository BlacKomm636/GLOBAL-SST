import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? 'var(--ink-900)' : 'var(--ink-500)',
  fontWeight: isActive ? 600 : 500,
  fontSize: 14,
  textDecoration: 'none',
  borderBottom: isActive ? '2px solid var(--seal-gold)' : '2px solid transparent',
  paddingBottom: 4,
});

export default function AdminLayout() {
  const { email, logout } = useAuth();

  return (
    <div>
      <header style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--ink-900)' }}>
            Certifica <span style={{ color: 'var(--ink-500)', fontWeight: 400, fontSize: 14 }}>· Panel Admin</span>
          </span>
          <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <NavLink to="/admin" end style={navLinkStyle}>Dashboard</NavLink>
            <NavLink to="/admin/institutions" style={navLinkStyle}>Instituciones</NavLink>
            <NavLink to="/admin/courses" style={navLinkStyle}>Cursos</NavLink>
            <NavLink to="/admin/certificates" style={navLinkStyle}>Certificados</NavLink>
            <span className="mono" style={{ color: 'var(--ink-500)', fontSize: 13 }}>{email}</span>
            <button onClick={logout} className="btn-secondary">
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="container" style={{ paddingTop: 28 }}>
        <Outlet />
      </main>
    </div>
  );
}
