import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["packages/core/src/index.browser.ts"],
  outfile: "packages/core/dist/index.browser.mjs",
  bundle: true,
  platform: "browser",
  format: "esm",
  target: ["es2020"],
});