import { Helmet } from 'react-helmet-async';

export default function DashboardPage() {
  return (
    <div>
      <Helmet>
        <title>Dashboard · Certifica</title>
      </Helmet>
      <p className="eyebrow" style={{ marginBottom: 4 }}>Panel administrador</p>
      <h1>Dashboard</h1>
      <p style={{ color: 'var(--ink-500)' }}>Usa el menu superior para administrar instituciones, cursos y certificados.</p>
    </div>
  );
}
