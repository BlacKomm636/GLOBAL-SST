export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 10;

export function generateCode(randomInt: (max: number) => number): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  }
  return code;
}

export interface IssueRequestBody {
  institutionId?: string;
  courseId?: string;
  recipientName?: string;
  recipientEmail?: string;
  issueDate?: string;
}

const ISSUE_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

export function validateIssueBody(body: IssueRequestBody): string | null {
  if (!body.institutionId) return 'institutionId es requerido';
  if (!body.courseId) return 'courseId es requerido';
  if (!body.recipientName || !body.recipientName.trim()) return 'recipientName es requerido';
  if (!body.issueDate) return 'issueDate es requerido';
  if (!ISSUE_DATE_SHAPE.test(body.issueDate)) return 'issueDate debe tener el formato YYYY-MM-DD';
  return null;
}
