import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { randomInt } from 'node:crypto';
import { generateCode, validateIssueBody, type IssueRequestBody } from './_lib/certificateLogic';
import { generateCertificatePdf } from './_lib/certificatePdf';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  if (!supabaseUrl || !serviceRoleKey || !publicBaseUrl) {
    res.status(500).json({ error: 'Configuracion del servidor incompleta' });
    return;
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Sesion invalida' });
    return;
  }

  const { data: adminProfile } = await admin
    .from('admin_profile')
    .select('id')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (!adminProfile) {
    res.status(403).json({ error: 'No autorizado' });
    return;
  }

  const body = (req.body ?? {}) as IssueRequestBody;
  const validationError = validateIssueBody(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { data: institution, error: institutionError } = await admin
    .from('institution')
    .select('id, slug, name')
    .eq('id', body.institutionId)
    .maybeSingle();
  if (institutionError || !institution) {
    res.status(400).json({ error: 'Institucion no encontrada' });
    return;
  }

  const { data: course, error: courseError } = await admin
    .from('course')
    .select('id, name')
    .eq('id', body.courseId)
    .maybeSingle();
  if (courseError || !course) {
    res.status(400).json({ error: 'Curso no encontrado' });
    return;
  }

  let code = generateCode((max) => randomInt(max));
  for (let attempts = 0; attempts < 5; attempts++) {
    const { data: existing } = await admin.from('certificate').select('id').eq('code', code).maybeSingle();
    if (!existing) break;
    code = generateCode((max) => randomInt(max));
  }

  const verificationUrl = `${publicBaseUrl}/verify/${code}`;
  const qrPng = await QRCode.toBuffer(verificationUrl, { type: 'png', width: 300 });
  const pdfBytes = await generateCertificatePdf({
    recipientName: body.recipientName!.trim(),
    courseName: course.name,
    institutionName: institution.name,
    issueDate: body.issueDate!,
    code,
    qrPng,
  });

  const year = new Date(body.issueDate!).getFullYear();
  const folder = `${institution.slug}/${year}`;

  const { error: qrUploadError } = await admin.storage
    .from('certificates')
    .upload(`${folder}/${code}-qr.png`, qrPng, { contentType: 'image/png', upsert: true });
  if (qrUploadError) {
    res.status(500).json({ error: 'No se pudo subir el QR' });
    return;
  }

  const { error: pdfUploadError } = await admin.storage
    .from('certificates')
    .upload(`${folder}/${code}.pdf`, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true });
  if (pdfUploadError) {
    res.status(500).json({ error: 'No se pudo subir el PDF' });
    return;
  }

  const qrUrl = admin.storage.from('certificates').getPublicUrl(`${folder}/${code}-qr.png`).data.publicUrl;
  const pdfUrl = admin.storage.from('certificates').getPublicUrl(`${folder}/${code}.pdf`).data.publicUrl;

  const { data: certificate, error: insertError } = await admin
    .from('certificate')
    .insert({
      code,
      institution_id: body.institutionId,
      course_id: body.courseId,
      recipient_name: body.recipientName!.trim(),
      recipient_email: body.recipientEmail ?? null,
      issue_date: body.issueDate,
      status: 'ACTIVE',
      pdf_url: pdfUrl,
      qr_url: qrUrl,
      created_by: userData.user.id,
    })
    .select('*, institution(name), course(name)')
    .single();

  if (insertError) {
    res.status(500).json({ error: 'No se pudo guardar el certificado' });
    return;
  }

  res.status(201).json(certificate);
}
