import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import { generateCertificatePdf } from './certificatePdf';

describe('generateCertificatePdf', () => {
  it('returns bytes with a valid PDF file signature', async () => {
    const qrPng = await QRCode.toBuffer('https://example.com/verify/ABCDEFGHJK', { type: 'png', width: 50 });
    const bytes = await generateCertificatePdf({
      recipientName: 'Ana Torres',
      courseName: 'Trabajo en alturas',
      institutionName: 'Global SST',
      issueDate: '2026-08-17',
      code: 'ABCDEFGHJK',
      qrPng,
    });
    const header = Buffer.from(bytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(500);
  });
});
