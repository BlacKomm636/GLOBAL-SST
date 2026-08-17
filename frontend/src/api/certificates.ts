import { supabase } from './supabaseClient';
import type { Certificate, CertificateVerification } from '../types';

export interface CertificateInput {
  institutionId: string;
  courseId: string;
  recipientName: string;
  recipientEmail?: string;
  issueDate: string;
}

interface CertificateRow {
  id: string;
  code: string;
  institution_id: string;
  institution: { name: string } | null;
  course_id: string;
  course: { name: string } | null;
  recipient_name: string;
  recipient_email: string | null;
  issue_date: string;
  status: 'ACTIVE' | 'REVOKED';
  pdf_url: string | null;
  qr_url: string | null;
}

function mapRow(row: CertificateRow): Certificate {
  return {
    id: row.id,
    code: row.code,
    institutionId: row.institution_id,
    institutionName: row.institution?.name ?? '',
    courseId: row.course_id,
    courseName: row.course?.name ?? '',
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email ?? undefined,
    issueDate: row.issue_date,
    status: row.status,
    pdfUrl: row.pdf_url ?? undefined,
    qrUrl: row.qr_url ?? undefined,
    verificationUrl: `${window.location.origin}/verify/${row.code}`,
  };
}

export async function listCertificates(): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificate')
    .select('*, institution(name), course(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as CertificateRow[] ?? []).map(mapRow);
}

export async function issueCertificate(input: CertificateInput): Promise<Certificate> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('No hay sesion activa');

  const response = await fetch('/api/certificates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? 'No se pudo emitir el certificado');
  }
  return mapRow(body as CertificateRow);
}

export async function revokeCertificate(id: string): Promise<Certificate> {
  const { data, error } = await supabase
    .from('certificate')
    .update({ status: 'REVOKED' })
    .eq('id', id)
    .select('*, institution(name), course(name)')
    .single();
  if (error) throw error;
  return mapRow(data as unknown as CertificateRow);
}

export async function verifyCertificate(code: string): Promise<CertificateVerification> {
  const { data, error } = await supabase.rpc('verify_certificate_by_code', { p_code: code });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('Certificado no encontrado');
  return {
    valid: row.status === 'ACTIVE',
    code: row.code,
    recipientName: row.recipient_name,
    courseName: row.course_name,
    institutionName: row.institution_name,
    issueDate: row.issue_date,
    status: row.status,
    pdfUrl: row.pdf_url ?? undefined,
  };
}
