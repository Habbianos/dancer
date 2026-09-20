import { mkdir, readFile, writeFile, copyFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { assetRoot, checkAssets, hash, libraryIds, revision, validateBundle, xml } from './asset-inventory';
import { normalizeBundle } from './normalize-bundle';

const cache = resolve('.cache/shroom');
const upstream = join(cache, 'upstream');
const SWFReader = createRequire(import.meta.url)('@gizeta/swf-reader');
const exists = async (path: string) => access(path).then(() => true, () => false);
async function download(url: string) {
  let failure: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url.replace(/^http:/, 'https:'), { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return new Uint8Array(await response.arrayBuffer());
    } catch (error) { failure = error; }
  }
  throw failure;
}
async function main() {
  if (!process.argv.includes('--refresh')) {
    try { console.log(`${await checkAssets()} assets já preparados.`); return; } catch { /* prepare missing assets */ }
  }
  await mkdir(cache, { recursive: true });
  await mkdir(join(assetRoot, 'figure'), { recursive: true });
  if (!(await exists(join(upstream, '.git')))) {
    execFileSync('git', ['clone', '--no-checkout', 'https://github.com/WiredSnippets/wsproom.git', upstream], { stdio: 'inherit' });
  }
  execFileSync('git', ['-C', upstream, 'checkout', '--detach', revision], { stdio: 'inherit' });
  // Load the actual upstream conversion tools; no furniture download or conversion.
  Object.assign(globalThis, { DOMParser: new JSDOM('').window.DOMParser });
  const { dumpSwf } = await import(pathToFileURL(join(upstream, 'src/tools/dump/dumpSwf.ts')).href);
  const { dumpFigure } = await import(pathToFileURL(join(upstream, 'src/tools/dump/dumpFigure.ts')).href);
  const { parseExternalVariables } = await import(pathToFileURL(join(upstream, 'src/tools/dump/parseExternalVariables.ts')).href);
  const externalUrl = process.env.HABBO_EXTERNAL_VARIABLES ?? 'https://www.habbo.com/gamedata/external_variables/0';
  const variables = parseExternalVariables(new TextDecoder().decode(await download(externalUrl)));
  const mapUrl = variables.get('flash.dynamic.avatar.download.configuration');
  const dataUrl = variables.get('external.figurepartlist.txt');
  if (!mapUrl || !dataUrl) throw new Error('Configuração de figuras não encontrada.');
  const map = await download(mapUrl);
  const data = await download(dataUrl);
  xml(new TextDecoder().decode(data), 'figuredata');
  const ids = libraryIds(new TextDecoder().decode(map));
  const files: Record<string, string> = { 'figuremap.xml': hash(map), 'figuredata.xml': hash(data) };
  console.log(`Preparando ${ids.length} bibliotecas de avatar (sem furnis).`);
  let completed = 0;
  let next = 0;
  const sourceKey = hash(new TextEncoder().encode(mapUrl)).slice(0, 16);
  const downloads = join(cache, sourceKey);
  await mkdir(downloads, { recursive: true });
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < ids.length) {
      const id = ids[next++];
      const file = join(downloads, `${id}.wsproom`);
      let valid = false;
      if (await exists(file)) { try { validateBundle(await readFile(file)); valid = true; } catch { /* reconvert */ } }
      if (!valid) {
        const swf = join(downloads, `${id}.swf`);
        if (!(await exists(swf))) await writeFile(swf, await download(new URL(`${id}.swf`, mapUrl).href));
        await dumpSwf(swf, dumpFigure);
        const source = SWFReader.readSync(swf);
        const symbols = new Set<string>(source.tags.filter((tag: { header: { code: number } }) => tag.header.code === 76).flatMap((tag: { symbols: { name: string }[] }) => tag.symbols.map(symbol => symbol.name.slice(id.length + 1))));
        await writeFile(file, normalizeBundle(await readFile(file), symbols));
      }
      const bytes = await readFile(file); validateBundle(bytes);
      await copyFile(file, join(assetRoot, 'figure', `${id}.wsproom`));
      files[`figure/${id}.wsproom`] = hash(bytes);
      completed++;
      if (completed % 50 === 0 || completed === ids.length) console.log(`${completed}/${ids.length}`);
    }
  }));
  await writeFile(join(assetRoot, 'figuremap.xml'), map);
  await writeFile(join(assetRoot, 'figuredata.xml'), data);
  await writeFile(join(assetRoot, 'inventory.json'), JSON.stringify({ revision, source: mapUrl, files }, null, 2));
  console.log(`${await checkAssets()} arquivos prontos para build.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
