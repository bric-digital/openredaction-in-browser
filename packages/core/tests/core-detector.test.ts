import { describe, expect, it } from 'vitest';
import { CoreDetector } from '../src/core/CoreDetector';

describe('CoreDetector', () => {
  it('detects and redacts email addresses', async () => {
    const detector = new CoreDetector();
    const result = await detector.detect('Contact john@example.com');

    expect(result.detections.some(d => d.type === 'EMAIL')).toBe(true);
    expect(result.redacted).toContain('[EMAIL_');
    expect(result.redacted).not.toContain('john@example.com');
  });

  it('restores redacted output using redaction map', async () => {
    const detector = new CoreDetector();
    const text = 'Email john@example.com';
    const result = await detector.detect(text);
    const restored = detector.restore(result.redacted, result.redactionMap);

    expect(restored).toBe(text);
  });

  it('respects whitelist updates', async () => {
    const detector = new CoreDetector();
    detector.setWhitelist(['example.com']);

    const result = await detector.detect('Please email support@example.com');
    expect(result.detections).toHaveLength(0);
  });

  it('supports custom patterns', async () => {
    const detector = new CoreDetector({
      customPatterns: [{
        type: 'CUSTOM_ID',
        regex: /CUSTOM-\d{4}/g,
        priority: 1000,
        placeholder: '[CUSTOM_{n}]',
        severity: 'high'
      }]
    });

    const result = await detector.detect('Token: CUSTOM-1234');
    expect(result.detections.some(d => d.type === 'CUSTOM_ID')).toBe(true);
  });
});
