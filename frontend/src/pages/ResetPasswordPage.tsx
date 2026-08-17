import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import * as authApi from '../api/auth';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('No se pudo actualizar la contrasena. El enlace pudo haber expirado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <Helmet>
        <title>Nueva contrasena · Certifica</title>
      </Helmet>
      <div className="card" style={{ borderTop: '3px solid var(--seal-gold)' }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>Certifica</p>
        <h2 style={{ marginBottom: 20 }}>Elegir nueva contrasena</h2>
        {success ? (
          <p>Contrasena actualizada. Redirigiendo al login...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="password">Nueva contrasena</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirmar contrasena</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Guardando...' : 'Guardar nueva contrasena'}
            </button>
          </form>
        )}
        <p style={{ marginTop: 20, fontSize: 13 }}>
          <Link to="/login" style={{ color: 'var(--ink-500)' }}>← Volver al login</Link>
        </p>
      </div>
    </div>
  );
}
