package com.certifica.service;

import com.certifica.domain.Certificate;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Genera el PDF del certificado (diseno generico profesional) con el QR
 * de validacion embebido. Usa OpenPDF (licencia LGPL/MPL, sin ataduras
 * de licenciamiento comercial como iText AGPL).
 */
@Service
public class PdfGenerationService {

    public byte[] generateCertificatePdf(Certificate certificate, byte[] qrPng) {
        try {
            Document document = new Document(PageSize.A4.rotate(), 50, 50, 50, 50);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 28, Font.BOLD, new Color(30, 41, 59));
            Font subtitleFont = new Font(Font.HELVETICA, 14, Font.NORMAL, new Color(71, 85, 105));
            Font nameFont = new Font(Font.HELVETICA, 22, Font.BOLDITALIC, new Color(15, 23, 42));
            Font bodyFont = new Font(Font.HELVETICA, 12, Font.NORMAL, new Color(51, 65, 85));
            Font smallFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.GRAY);

            Paragraph title = new Paragraph("CERTIFICADO DE FINALIZACION", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(10);
            document.add(title);

            Paragraph issuer = new Paragraph(certificate.getInstitution().getName(), subtitleFont);
            issuer.setAlignment(Element.ALIGN_CENTER);
            issuer.setSpacingAfter(40);
            document.add(issuer);

            Paragraph grants = new Paragraph("Se otorga el presente certificado a", bodyFont);
            grants.setAlignment(Element.ALIGN_CENTER);
            document.add(grants);

            Paragraph name = new Paragraph(certificate.getRecipientName(), nameFont);
            name.setAlignment(Element.ALIGN_CENTER);
            name.setSpacingBefore(10);
            name.setSpacingAfter(20);
            document.add(name);

            Paragraph course = new Paragraph(
                    "por haber completado satisfactoriamente el curso \"" + certificate.getCourse().getName() + "\"",
                    bodyFont);
            course.setAlignment(Element.ALIGN_CENTER);
            course.setSpacingAfter(40);
            document.add(course);

            Paragraph date = new Paragraph("Fecha de emision: " + certificate.getIssueDate(), bodyFont);
            date.setAlignment(Element.ALIGN_CENTER);
            document.add(date);

            Paragraph code = new Paragraph("Codigo de verificacion: " + certificate.getCode(), bodyFont);
            code.setAlignment(Element.ALIGN_CENTER);
            code.setSpacingAfter(30);
            document.add(code);

            Image qrImage = Image.getInstance(qrPng);
            qrImage.scaleToFit(110, 110);
            qrImage.setAlignment(Element.ALIGN_CENTER);
            document.add(qrImage);

            Paragraph footer = new Paragraph("Verifique la autenticidad de este certificado escaneando el codigo QR.", smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            footer.setSpacingBefore(10);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (DocumentException | IOException e) {
            throw new IllegalStateException("No se pudo generar el PDF del certificado", e);
        }
    }
}
