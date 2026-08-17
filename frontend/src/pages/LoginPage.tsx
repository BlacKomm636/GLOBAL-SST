import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import * as authApi from '../api/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch {
      setError('Credenciales invalidas');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setForgotSent(true);
    } catch {
      setError('No se pudo enviar el correo de recuperacion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 80 }}>
      <Helmet>
        <title>Iniciar sesion · Certifica</title>
      </Helmet>
      <div className="card" style={{ borderTop: '3px solid var(--seal-gold)' }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>Certifica</p>
        <h2 style={{ marginBottom: 20 }}>Panel administrador</h2>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Correo</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Contrasena</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <p style={{ marginTop: 14, fontSize: 13, textAlign: 'right' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMode('forgot');
                  setError(null);
                }}
                style={{ color: 'var(--ink-500)' }}
              >
                ¿Olvidaste tu contrasena?
              </a>
            </p>
          </form>
        ) : forgotSent ? (
          <p>Si el correo existe, te enviamos un enlace para restablecer tu contrasena.</p>
        ) : (
          <form onSubmit={handleForgotSubmit}>
            <div className="field">
              <label htmlFor="forgot-email">Correo</label>
              <input id="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Enviando...' : 'Enviar enlace de recuperacion'}
            </button>
            <p style={{ marginTop: 14, fontSize: 13 }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMode('login');
                  setError(null);
                }}
                style={{ color: 'var(--ink-500)' }}
              >
                ← Volver al login
              </a>
            </p>
          </form>
        )}

        <p style={{ marginTop: 20, fontSize: 13 }}>
          <Link to="/" style={{ color: 'var(--ink-500)' }}>← Volver a validacion publica</Link>
        </p>
      </div>
    </div>
  );
}
