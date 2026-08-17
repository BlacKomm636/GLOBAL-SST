import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

export interface CertificatePdfParams {
  recipientName: string;
  courseName: string;
  institutionName: string;
  issueDate: string;
  code: string;
  qrPng: Uint8Array;
}

export async function generateCertificatePdf(params: CertificatePdfParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([841.89, 595.28]); // A4 apaisado, en puntos
  const { width, height } = page.getSize();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaBoldOblique = await doc.embedFont(StandardFonts.HelveticaBoldOblique);

  function centerText(text: string, y: number, font: PDFFont, size: number, color = rgb(0.06, 0.09, 0.16)) {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
  }

  centerText('CERTIFICADO DE FINALIZACION', height - 100, helveticaBold, 28);
  centerText(params.institutionName, height - 140, helvetica, 14, rgb(0.28, 0.33, 0.41));
  centerText('Se otorga el presente certificado a', height - 220, helvetica, 12);
  centerText(params.recipientName, height - 260, helveticaBoldOblique, 22);
  centerText(`por haber completado satisfactoriamente el curso "${params.courseName}"`, height - 300, helvetica, 12);
  centerText(`Fecha de emision: ${params.issueDate}`, height - 360, helvetica, 12);
  centerText(`Codigo de verificacion: ${params.code}`, height - 385, helvetica, 12);

  const qrImage = await doc.embedPng(params.qrPng);
  const qrSize = 110;
  page.drawImage(qrImage, { x: (width - qrSize) / 2, y: height - 520, width: qrSize, height: qrSize });

  return doc.save();
}
