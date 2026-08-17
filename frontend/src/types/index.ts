export interface Institution {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: string;
}

export interface Course {
  id: string;
  institutionId: string;
  institutionName: string;
  name: string;
  hours?: number;
  createdAt: string;
}

export type CertificateStatus = 'ACTIVE' | 'REVOKED';

export interface Certificate {
  id: string;
  code: string;
  institutionId: string;
  institutionName: string;
  courseId: string;
  courseName: string;
  recipientName: string;
  recipientEmail?: string;
  issueDate: string;
  status: CertificateStatus;
  pdfUrl?: string;
  qrUrl?: string;
  verificationUrl: string;
}

export interface CertificateVerification {
  valid: boolean;
  code: string;
  recipientName: string;
  courseName: string;
  institutionName: string;
  issueDate: string;
  status: CertificateStatus;
  pdfUrl?: string;
}

