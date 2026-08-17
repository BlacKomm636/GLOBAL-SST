import { useEffect, useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import type { Certificate, Course, Institution } from '../types';
import { issueCertificate, listCertificates, revokeCertificate } from '../api/certificates';
import { listInstitutions } from '../api/institutions';
import { listCourses } from '../api/courses';

export default function CertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [institutionId, setInstitutionId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const [certs, insts, crs] = await Promise.all([listCertificates(), listInstitutions(), listCourses()]);
    setItems(certs);
    setInstitutions(insts);
    setCourses(crs);
    if (!institutionId && insts.length > 0) setInstitutionId(insts[0].id);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCourses = courses.filter((c) => c.institutionId === institutionId);

  async function handleIssue(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await issueCertificate({ institutionId, courseId, recipientName, recipientEmail: recipientEmail || undefined, issueDate });
      setRecipientName('');
      setRecipientEmail('');
      await refresh();
    } catch {
      setError('No se pudo emitir el certificado');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: string) {
    await revokeCertificate(id);
    await refresh();
  }

  return (
    <div>
      <Helmet>
        <title>Certificados · Certifica</title>
      </Helmet>
      <p className="eyebrow" style={{ marginBottom: 4 }}>Panel administrador</p>
      <h1>Certificados</h1>

      <div className="card" style={{ marginBottom: 24, marginTop: 16 }}>
        <form onSubmit={handleIssue}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Institucion</label>
              <select value={institutionId} onChange={(e) => { setInstitutionId(e.target.value); setCourseId(''); }}>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Curso</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required>
                <option value="">Selecciona un curso</option>
                {filteredCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Nombre del receptor</label>
              <input required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Email del receptor (opcional)</label>
              <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Fecha de emision</label>
              <input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" type="submit" disabled={submitting || !courseId}>
            {submitting ? 'Emitiendo...' : 'Emitir certificado'}
          </button>
        </form>
      </div>

      <table>
        <thead>
          <tr><th>Codigo</th><th>Receptor</th><th>Curso</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="mono">{c.code}</td>
              <td>{c.recipientName}</td>
              <td>{c.courseName}</td>
              <td>
                <span className={c.status === 'ACTIVE' ? 'badge badge-active' : 'badge badge-revoked'}>
                  {c.status === 'ACTIVE' ? 'Valido' : 'Revocado'}
                </span>
              </td>
              <td style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {c.pdfUrl && <a href={c.pdfUrl} target="_blank" rel="noreferrer">PDF</a>}
                <a href={c.verificationUrl} target="_blank" rel="noreferrer">Verificar</a>
                {c.status === 'ACTIVE' && <button className="btn-secondary" onClick={() => handleRevoke(c.id)}>Revocar</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
