import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = normalize(join(TEST_DIR, '..'));
const SRC_ROOT = normalize(join(ROOT, 'src'));
const ENTRY = normalize(join(SRC_ROOT, 'index.browser.ts'));
const DIST_BROWSER = normalize(join(ROOT, 'dist', 'index.browser.mjs'));

const NODE_BUILTIN_RE =
  /\b(?:from\s+['"](?:node:)?(?:fs|path|os|crypto|worker_threads|module)(?:\/promises)?['"]|require\(\s*['"](?:node:)?(?:fs|path|os|crypto|worker_threads|module)(?:\/promises)?['"]\s*\)|import\(\s*['"](?:node:)?(?:fs|path|os|crypto|worker_threads|module)(?:\/promises)?['"]\s*\)|\bcreateRequire\b)/;

const BARE_REQUIRE_RE = /\brequire\s*\(/;

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?[^'"\n]*?from\s*|export\s+\*\s+from\s*|export\s+\{[^}\n]*\}\s+from\s*)['"]([^'"]+)['"]/g;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...listSourceFiles(p));
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) out.push(normalize(p));
  }
  return out;
}

function resolveImport(fromFile: string, spec: string, allFiles: Set<string>): string | null {
  if (!spec.startsWith('.')) return null;

  const base = normalize(join(dirname(fromFile), spec));
  const ext = extname(base);
  const noExt = ext ? base.slice(0, -ext.length) : base;
  const candidates = [
    base,
    noExt,
    `${noExt}.ts`,
    `${noExt}.tsx`,
    `${noExt}.js`,
    `${noExt}.mjs`,
    `${noExt}.cjs`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
    join(base, 'index.js'),
    join(base, 'index.mjs'),
    join(base, 'index.cjs'),
    join(noExt, 'index.ts'),
    join(noExt, 'index.tsx'),
    join(noExt, 'index.js'),
    join(noExt, 'index.mjs'),
    join(noExt, 'index.cjs'),
  ].map(normalize);

  for (const candidate of candidates) {
    if (allFiles.has(candidate)) return candidate;
  }
  return null;
}

describe('browser entry node-builtin safety', () => {
  it('index.browser.ts transitive graph has no Node built-in references', () => {
    expect(existsSync(ENTRY)).toBe(true);

    const files = listSourceFiles(SRC_ROOT);
    const fileSet = new Set(files);

    const queue = [ENTRY];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const content = readFileSync(current, 'utf8');
      expect(content).not.toMatch(NODE_BUILTIN_RE);
      // Any CommonJS require in the browser graph risks bundler polyfills/node shims.
      expect(content).not.toMatch(BARE_REQUIRE_RE);

      let m: RegExpExecArray | null;
      while ((m = IMPORT_RE.exec(content)) !== null) {
        const resolved = resolveImport(current, m[1], fileSet);
        if (resolved && !visited.has(resolved)) {
          queue.push(resolved);
        }
      }
    }
  });

  it('built browser bundle does not contain Node builtin imports', () => {
    if (!existsSync(DIST_BROWSER)) {
      return;
    }

    const bundle = readFileSync(DIST_BROWSER, 'utf8');
    expect(bundle).not.toMatch(/['"]node:(?:fs|path|os|crypto|worker_threads|module)(?:\/promises)?['"]/);
    expect(bundle).not.toMatch(/\bcreateRequire\b/);
    expect(bundle).not.toMatch(/(?:import|require)\s*\(?\s*['"](?:fs|path|os|crypto|worker_threads|module)(?:\/promises)?['"]/);
  });
});
