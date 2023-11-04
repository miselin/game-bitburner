const fs = require('node:fs');
const path = require('node:path');
const chokidar = require('chokidar');
const { src, dist, debugMode } = require('./config');
const esbuild = require('esbuild');
const terser = require('terser');

async function createContext(entryPoints) {
  return await esbuild.context({
    entryPoints,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'esnext',
    outdir: dist,
  });
}

/**
 * Compile TS files as they get changed
 */
async function watchTypeScript() {
  let state = {
    context: null,
    entrypoints: new Set(),
  };

  chokidar
    .watch([`${src}/**/*.ts`, `${src}/**/*.tsx`])
    .on('add', async (p) => {
      state.entrypoints.add(p);
      state.context = await createContext([...state.entrypoints]);
      try {
        await state.context.rebuild();
      } catch (e) {
        console.error(`Failed to rebuild: ${e}`);
      }
    })
    .on('unlink', async (p) => {
      state.entrypoints.delete(p);
      state.context = await createContext([...state.entrypoints]);
      try {
        await state.context.rebuild();
      } catch (e) {
        console.error(`Failed to rebuild: ${e}`);
      }
    })
    .on('change', async () => {
      try {
        await state.context.rebuild();
      } catch (e) {
        console.error(`Failed to rebuild: ${e}`);
      }
    });
}

console.log('Start watching ts files for transpilation...');
watchTypeScript();
