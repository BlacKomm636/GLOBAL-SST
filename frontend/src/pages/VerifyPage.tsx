import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import type { CertificateVerification } from '../types';
import { verifyCertificate } from '../api/certificates';
import SealMedallion from '../components/SealMedallion';

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
    <div className="container" style={{ maxWidth: 600, marginTop: 48 }}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--ink-900)' }}>
          Certifica
        </span>
        <Link to="/login" style={{ fontSize: 13, color: 'var(--ink-500)', textDecoration: 'none' }}>
          Acceso administrador →
        </Link>
      </div>

      <div
        className="card"
        style={{
          borderTop: '3px double var(--ink-900)',
          borderBottom: '3px double var(--ink-900)',
          textAlign: 'center',
        }}
      >
        <p className="eyebrow" style={{ marginBottom: 4 }}>Validacion publica de certificados</p>
        <h1 style={{ fontSize: 22, marginBottom: 24 }}>¿El documento es autentico?</h1>

        {!code && (
          <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: 8, textAlign: 'left' }}>
            <input
              className="mono"
              placeholder="CERT-XXXX-XX"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--line-strong)', borderRadius: 4, fontSize: 14 }}
            />
            <button className="btn-primary" type="submit">Verificar</button>
          </form>
        )}

        {loading && <p style={{ color: 'var(--ink-500)' }}>Consultando el registro...</p>}

        {notFound && (
          <div>
            <SealMedallion status="REVOKED" />
            <p className="error-text" style={{ marginTop: 12 }}>
              No encontramos un certificado con ese codigo. Revisa que este escrito tal como aparece en el documento.
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-500)' }}>
              <Link to="/">Intentar con otro codigo</Link>
            </p>
          </div>
        )}

        {result && (
          <div>
            <SealMedallion status={result.status === 'ACTIVE' ? 'ACTIVE' : 'REVOKED'} />
            <p style={{ margin: '14px 0 20px' }}>
              <span className={result.status === 'ACTIVE' ? 'badge badge-active' : 'badge badge-revoked'}>
                {result.status === 'ACTIVE' ? 'Certificado valido' : 'Certificado revocado'}
              </span>
            </p>
            <table style={{ textAlign: 'left' }}>
              <tbody>
                <tr><td style={{ color: 'var(--ink-500)', width: '38%' }}>Receptor</td><td style={{ fontWeight: 600 }}>{result.recipientName}</td></tr>
                <tr><td style={{ color: 'var(--ink-500)' }}>Curso</td><td>{result.courseName}</td></tr>
                <tr><td style={{ color: 'var(--ink-500)' }}>Institucion</td><td>{result.institutionName}</td></tr>
                <tr><td style={{ color: 'var(--ink-500)' }}>Fecha de emision</td><td>{result.issueDate}</td></tr>
                <tr><td style={{ color: 'var(--ink-500)' }}>Codigo</td><td className="mono">{result.code}</td></tr>
              </tbody>
            </table>
            {result.pdfUrl && (
              <p style={{ marginTop: 20 }}>
                <a className="btn-primary" href={result.pdfUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  Descargar certificado (PDF)
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--ink-500)' }}>
        Cada certificado emitido en Certifica lleva un codigo unico verificable en esta pagina.
      </p>
    </div>
  );
}
