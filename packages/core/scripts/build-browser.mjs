import { execSync } from "node:child_process";
import { copyFileSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname, ".."); // scripts/.. => package root
const entry = resolve(root, "src/index.browser.ts");
const outFile = resolve(root, "dist/index.browser.mjs");

if (!existsSync(entry)) {
  console.error("❌ Missing browser entry:", entry);
  process.exit(1);
}

try {
  // Build ONLY the browser entry with tsdown.
  // tsdown CLI supports entry files as args.
  execSync(`../../node_modules/.bin/tsdown ${entry} --format esm --outDir dist`, {
    stdio: "inherit",
    cwd: root,
  });
} catch (e) {
  console.error("❌ tsdown browser build failed");
  process.exit(1);
}

// tsdown will likely emit dist/index.browser.mjs automatically if the entry file is index.browser.ts.
// If it emits dist/index.browser.js instead, we’ll rename it to .mjs to match exports.
const emittedJs = resolve(root, "dist/index.browser.js");
const emittedMjs = resolve(root, "dist/index.browser.mjs");
const emittedDmts = resolve(root, "dist/index.browser.d.mts");
const emittedDts = resolve(root, "dist/index.browser.d.ts");

if (existsSync(emittedJs) && !existsSync(emittedMjs)) {
  // Rename to match export map
  renameSync(emittedJs, emittedMjs);
}

// Keep a .d.ts alias for broad TypeScript resolver compatibility in consumer builds.
if (existsSync(emittedDmts)) {
  copyFileSync(emittedDmts, emittedDts);
}

if (!existsSync(outFile)) {
  console.error("❌ Expected dist/index.browser.mjs but did not find it.");
  console.error("   Check what tsdown emitted in dist/ and adjust build-browser.mjs accordingly.");
  process.exit(1);
}

console.log("✅ Browser build created:", outFile);
