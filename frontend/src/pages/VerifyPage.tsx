import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { CertificateVerification } from '../types';
import { verifyCertificate } from '../api/certificates';

/**
 * Pagina publica (sin login) que resuelve la URL del QR de cada certificado.
 * Incluye meta tags dinamicos para SEO/OpenGraph basico, ya que es la
 * pagina con mas trafico externo (compartida, escaneada, indexada).
 */
export default function VerifyPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<CertificateVerification | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(!!code);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setNotFound(false);
    verifyCertificate(code)
      .then(setResult)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (manualCode.trim()) navigate(`/verify/${manualCode.trim()}`);
  }

  const title = result
    ? `Certificado valido de ${result.recipientName} · Certifica`
    : 'Validar certificado · Certifica';
  const description = result
    ? `${result.recipientName} completo "${result.courseName}" emitido por ${result.institutionName}.`
    : 'Verifica la autenticidad de un certificado emitido en Certifica.';

  return (
    <div className="container" style={{ maxWidth: 560, marginTop: 60 }}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Link to="/login" style={{ fontSize: 14, color: '#64748b' }}>
          Acceso administrador →
        </Link>
      </div>

      <div className="card">
        <h1 style={{ marginTop: 0 }}>Validacion de certificados</h1>

        {!code && (
          <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Ingresa el codigo del certificado"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button className="btn-primary" type="submit">Verificar</button>
          </form>
        )}

        {loading && <p>Verificando...</p>}

        {notFound && (
          <div>
            <p className="error-text">Este certificado no existe o el codigo es incorrecto.</p>
          </div>
        )}

        {result && (
          <div>
            <p>
              <span className={result.status === 'ACTIVE' ? 'badge-active' : 'badge-revoked'}>
                {result.status === 'ACTIVE' ? 'Certificado valido' : 'Certificado revocado'}
              </span>
            </p>
            <table>
              <tbody>
                <tr><td><strong>Receptor</strong></td><td>{result.recipientName}</td></tr>
                <tr><td><strong>Curso</strong></td><td>{result.courseName}</td></tr>
                <tr><td><strong>Institucion</strong></td><td>{result.institutionName}</td></tr>
                <tr><td><strong>Fecha de emision</strong></td><td>{result.issueDate}</td></tr>
                <tr><td><strong>Codigo</strong></td><td>{result.code}</td></tr>
              </tbody>
            </table>
            {result.pdfUrl && (
              <p style={{ marginTop: 16 }}>
                <a href={result.pdfUrl} target="_blank" rel="noreferrer">Descargar certificado (PDF)</a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
