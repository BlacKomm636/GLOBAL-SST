import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="container" style={{ textAlign: 'center', marginTop: 80 }}>
      <p className="eyebrow">Error 404</p>
      <h1>Pagina no encontrada</h1>
      <p style={{ color: 'var(--ink-500)' }}>
        <Link to="/">← Volver a validacion de certificados</Link>
      </p>
    </div>
  );
}
