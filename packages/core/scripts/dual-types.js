import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dist = path.join(__dirname, '..', 'dist');

function dualTypes(base) {
  const dTs = path.join(dist, `${base}.d.ts`);
  const dMts = path.join(dist, `${base}.d.mts`);
  const dCts = path.join(dist, `${base}.d.cts`);
  if (!fs.existsSync(dCts)) return;
  fs.copyFileSync(dTs, dMts);
  fs.copyFileSync(dCts, dTs);
}

dualTypes('index');
dualTypes('react');
