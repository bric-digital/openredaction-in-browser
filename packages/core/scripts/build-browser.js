import { build } from "esbuild";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const entry = resolve(__dirname, "../src/index.browser.ts");
const outfile = resolve(__dirname, "../dist/index.browser.mjs");

async function run() {
  try {
    await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      format: "esm",
      platform: "browser",
      target: ["es2020"],
      sourcemap: true,
      minify: false,

      // This is important — we want to FAIL if Node builtins are pulled in
      external: [
        "fs",
        "path",
        "os",
        "crypto",
        "worker_threads",
        "node:module",
        "node:fs",
        "node:path",
        "node:crypto",
      ],

      logLevel: "info",
    });

    console.log("✅ Browser build complete:", outfile);
  } catch (err) {
    console.error("❌ Browser build failed");
    console.error(err);
    process.exit(1);
  }
}

run();