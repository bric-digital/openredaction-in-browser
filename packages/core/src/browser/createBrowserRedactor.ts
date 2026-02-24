import { OpenRedaction, type BrowserOpenRedactionOptions } from './OpenRedaction.js';

export interface BrowserRedactor {
  detect(text: string): Promise<{ redacted: string }>;
}

export function createBrowserRedactor(
  options: BrowserOpenRedactionOptions = {}
): BrowserRedactor {
  const detector = new OpenRedaction(options);

  return {
    async detect(text: string): Promise<{ redacted: string }> {
      const result = await detector.detect(text);
      return { redacted: result.redacted };
    },
  };
}
