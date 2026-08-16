import apiClient from './client';
import type { Certificate, CertificateVerification } from '../types';

export interface CertificateInput {
  institutionId: string;
  courseId: string;
  recipientName: string;
  recipientEmail?: string;
  issueDate: string;
}

export const listCertificates = () => apiClient.get<Certificate[]>('/certificates').then((r) => r.data);
export const issueCertificate = (input: CertificateInput) =>
  apiClient.post<Certificate>('/certificates', input).then((r) => r.data);
export const revokeCertificate = (id: string) =>
  apiClient.post<Certificate>(`/certificates/${id}/revoke`).then((r) => r.data);

// Endpoint publico, sin autenticacion.
export const verifyCertificate = (code: string) =>
  apiClient.get<CertificateVerification>(`/verify/${code}`).then((r) => r.data);
