import { describe, expect, it } from 'vitest';
import { OpenRedaction } from '../src/index.browser';
import * as BrowserAPI from '../src/index.browser';

describe('browser entry API', () => {
  it('detects and redacts built-in email + phone patterns', async () => {
    const redactor = new OpenRedaction();
    const text = 'Email john@example.com or call 07700900123';
    const result = await redactor.detect(text);

    expect(result.redacted).not.toContain('john@example.com');
    expect(result.redacted).not.toContain('07700900123');
    expect(result.detections.some(d => d.type === 'EMAIL')).toBe(true);
    expect(result.detections.some(d => d.type.includes('PHONE'))).toBe(true);
  });

  it('returns DetectionResult shape with redacted field', async () => {
    const redactor = new OpenRedaction();
    const result = await redactor.detect('Contact: jane@example.com');

    expect(result).toHaveProperty('original');
    expect(result).toHaveProperty('redacted');
    expect(result).toHaveProperty('detections');
    expect(result).toHaveProperty('redactionMap');
    expect(typeof result.redacted).toBe('string');
  });

  it('throws clear errors for Node-only features', async () => {
    expect(() => new OpenRedaction({ configPath: '.openredaction.config.js' }))
      .toThrow(/not available in browser builds/i);

    await expect(OpenRedaction.fromConfig('.openredaction.config.js'))
      .rejects.toThrow(/not available in browser builds/i);
  });

  it('does not expose NER exports in browser entry', () => {
    expect('NERDetector' in BrowserAPI).toBe(false);
    expect('createNERDetector' in BrowserAPI).toBe(false);
  });
});
