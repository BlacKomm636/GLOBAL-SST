import { describe, it, expect } from 'vitest';
import { generateCode, validateIssueBody, CODE_CHARS, CODE_LENGTH } from './certificateLogic';

describe('generateCode', () => {
  it('produces a code of the expected length using only allowed characters', () => {
    const code = generateCode(() => 0);
    expect(code).toHaveLength(CODE_LENGTH);
    for (const char of code) {
      expect(CODE_CHARS).toContain(char);
    }
  });

  it('uses the provided random source for every character, bounded by the alphabet size', () => {
    let calls = 0;
    generateCode((max) => {
      calls += 1;
      expect(max).toBe(CODE_CHARS.length);
      return max - 1;
    });
    expect(calls).toBe(CODE_LENGTH);
  });
});

describe('validateIssueBody', () => {
  it('rejects a body missing institutionId', () => {
    expect(
      validateIssueBody({ courseId: 'c1', recipientName: 'Ana', issueDate: '2026-01-01' })
    ).toBe('institutionId es requerido');
  });

  it('rejects a body missing courseId', () => {
    expect(
      validateIssueBody({ institutionId: 'i1', recipientName: 'Ana', issueDate: '2026-01-01' })
    ).toBe('courseId es requerido');
  });

  it('rejects a recipientName that is only whitespace', () => {
    expect(
      validateIssueBody({ institutionId: 'i1', courseId: 'c1', recipientName: '   ', issueDate: '2026-01-01' })
    ).toBe('recipientName es requerido');
  });

  it('rejects a body missing issueDate', () => {
    expect(
      validateIssueBody({ institutionId: 'i1', courseId: 'c1', recipientName: 'Ana' })
    ).toBe('issueDate es requerido');
  });

  it('accepts a fully populated body', () => {
    expect(
      validateIssueBody({
        institutionId: 'i1',
        courseId: 'c1',
        recipientName: 'Ana',
        issueDate: '2026-01-01',
      })
    ).toBeNull();
  });
});
