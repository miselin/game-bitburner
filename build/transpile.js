const fs = require("node:fs");
const path = require("node:path");
const chokidar = require("chokidar");
const { src, dist, debugMode } = require("./config");
const esbuild = require("esbuild");
const terser = require("terser");

/** @param{string} p */
async function compile(p) {
  const relative = path
    .relative(src, p)
    .replace(/\.ts$/, ".js")
    .replace(/\.tsx$/, ".js");
  const distFile = path.resolve(dist, relative);

  // first pass, ESBuild
  console.log(`compiling ${p}...`);
  const result = await esbuild.build({
    entryPoints: [p],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "esnext",
    outfile: distFile,
  });

  // second pass, Terser to minifiy and cull dead code
  /*
  console.log(`minifying ${p}...`);
  const out = await terser.minify(
    new TextDecoder().decode(result.outputFiles[0].contents),
    {
      compress: {
        global_defs: {
          DEBUG: debugMode,
        },
        toplevel: true,
        passes: 3,
        keep_infinity: true,
        hoist_funs: true,
      },
      mangle: true,
      output: {
        ecma: 2023,
      },
      sourceMap: {
        url: "inline",
      },
    }
  );

  console.log(`outputting ${distFile}...`);
  fs.writeFileSync(distFile, out.code);
  */
}

/**
 * Compile TS files as they get changed
 */
async function watchTypeScript() {
  chokidar
    .watch([`${src}/**/*.ts`, `${src}/**/*.tsx`])
    .on("add", compile)
    .on("change", compile);
}

console.log("Start watching ts files for transpilation...");
watchTypeScript();
