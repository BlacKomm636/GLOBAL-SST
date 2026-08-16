import { Helmet } from 'react-helmet-async';

export default function DashboardPage() {
  return (
    <div>
      <Helmet>
        <title>Dashboard · Certifica</title>
      </Helmet>
      <h1>Dashboard</h1>
      <p>Usa el menu superior para administrar instituciones, cursos y certificados.</p>
    </div>
  );
}
